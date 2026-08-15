#!/usr/bin/env python3
"""
Expo / React Native Asset Generator Script

This script takes a source image (e.g., your app logo or icon) and generates
all required icon, splash screen, and favicon assets in the specified dimensions
for your Expo/React Native project (`assets/images/`).

Generated Assets:
  - icon.png (1024x1024 px)
  - android-icon-foreground.png (1024x1024 px, centered with safe-zone padding)
  - android-icon-background.png (1024x1024 px, solid color)
  - android-icon-monochrome.png (1024x1024 px, monochrome theme icon)
  - logo-removebg.png (1024x1024 px, transparent logo for splash screen)
  - splash-icon.png (1024x1024 px, transparent splash icon)
  - favicon.png (48x48 px, web favicon)
  - favicon.ico (16x16, 32x32, 48x48 ICO file)

Usage:
  python generate_assets.py path/to/source_logo.png
  python generate_assets.py path/to/source_logo.png --bg-color "#F6F5F1" --output-dir assets/images
"""

import argparse
import sys
from pathlib import Path

try:
    from PIL import Image, ImageOps, ImageColor
except ImportError:
    print("Error: 'Pillow' library is not installed.")
    print("Please install it by running: pip install Pillow")
    sys.exit(1)


def hex_to_rgba(hex_code: str, alpha: int = 255):
    """Convert hex string (e.g. #F6F5F1) to RGBA tuple."""
    rgb = ImageColor.getrgb(hex_code)
    return (rgb[0], rgb[1], rgb[2], alpha)


def create_padded_image(
    source_img: Image.Image,
    target_size: tuple[int, int],
    scale_ratio: float = 0.8,
    bg_color: tuple[int, int, int, int] = (0, 0, 0, 0)
) -> Image.Image:
    """
    Fits source_img inside target_size * scale_ratio, preserving aspect ratio,
    and centers it on a canvas filled with bg_color.
    """
    target_w, target_h = target_size
    max_w = int(target_w * scale_ratio)
    max_h = int(target_h * scale_ratio)

    # Copy source image to avoid modifying original
    img = source_img.copy()
    img.thumbnail((max_w, max_h), Image.Resampling.LANCZOS)

    # Create new canvas
    canvas = Image.new("RGBA", target_size, bg_color)
    
    # Calculate position to paste
    paste_x = (target_w - img.width) // 2
    paste_y = (target_h - img.height) // 2
    
    # Use image alpha channel as mask if available
    mask = img if img.mode == "RGBA" else None
    canvas.paste(img, (paste_x, paste_y), mask)
    
    return canvas


def create_monochrome_image(
    source_img: Image.Image,
    target_size: tuple[int, int],
    scale_ratio: float = 0.65,
    tint_color: tuple[int, int, int, int] = (255, 255, 255, 255)
) -> Image.Image:
    """
    Creates a single-color (monochrome) mask version of the source image,
    useful for Android 13+ themed adaptive icons.
    """
    canvas = create_padded_image(source_img, target_size, scale_ratio, (0, 0, 0, 0))
    
    # Convert RGB channels to tint_color, keeping original alpha
    r, g, b, alpha = canvas.split()
    mono_r = Image.new("L", canvas.size, tint_color[0])
    mono_g = Image.new("L", canvas.size, tint_color[1])
    mono_b = Image.new("L", canvas.size, tint_color[2])
    
    return Image.merge("RGBA", (mono_r, mono_g, mono_b, alpha))


def main():
    parser = argparse.ArgumentParser(
        description="Generate all required Expo / React Native image assets from a single logo/source image."
    )
    parser.add_argument(
        "input",
        type=str,
        help="Path to the source image (e.g. logo.png or icon.png)"
    )
    parser.add_argument(
        "-o", "--output-dir",
        type=str,
        default="assets/images",
        help="Target directory to save assets (default: assets/images)"
    )
    parser.add_argument(
        "-b", "--bg-color",
        type=str,
        default="#F6F5F1",
        help="Background color in hex format (default: #F6F5F1)"
    )
    parser.add_argument(
        "-p", "--padding-ratio",
        type=float,
        default=0.65,
        help="Logo scaling ratio for Android adaptive icon foreground (default: 0.65 to fit in safe circle)"
    )

    args = parser.parse_args()

    input_path = Path(args.input)
    if not input_path.exists():
        print(f"Error: Input file '{input_path}' does not exist.")
        sys.exit(1)

    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    print(f"Loading input image: {input_path}")
    source_img = Image.open(input_path).convert("RGBA")
    bg_rgba = hex_to_rgba(args.bg_color)

    print(f"Output directory: {output_dir.resolve()}")
    print(f"Background color: {args.bg_color}")
    print("-" * 50)

    # 1. Main App Icon (icon.png) - 1024x1024 with background color (or transparent if source has alpha and full ratio)
    print("Generating icon.png (1024x1024)...")
    icon = create_padded_image(source_img, (1024, 1024), scale_ratio=0.85, bg_color=bg_rgba)
    icon.save(output_dir / "icon.png", "PNG")

    # 2. Android Adaptive Icon Foreground (android-icon-foreground.png) - 1024x1024, transparent bg, 65% scale for safe zone
    print("Generating android-icon-foreground.png (1024x1024 with safe zone padding)...")
    fg_icon = create_padded_image(source_img, (1024, 1024), scale_ratio=args.padding_ratio, bg_color=(0, 0, 0, 0))
    fg_icon.save(output_dir / "android-icon-foreground.png", "PNG")

    # 3. Android Adaptive Icon Background (android-icon-background.png) - 1024x1024 solid color
    print(f"Generating android-icon-background.png (1024x1024 solid {args.bg_color})...")
    bg_icon = Image.new("RGBA", (1024, 1024), bg_rgba)
    bg_icon.save(output_dir / "android-icon-background.png", "PNG")

    # 4. Android Adaptive Icon Monochrome (android-icon-monochrome.png) - 1024x1024 monochrome
    print("Generating android-icon-monochrome.png (1024x1024)...")
    mono_icon = create_monochrome_image(source_img, (1024, 1024), scale_ratio=args.padding_ratio)
    mono_icon.save(output_dir / "android-icon-monochrome.png", "PNG")

    # 5. Splash Screen Logo (logo-removebg.png) - 1024x1024 transparent logo
    print("Generating logo-removebg.png (1024x1024)...")
    logo_splash = create_padded_image(source_img, (1024, 1024), scale_ratio=0.8, bg_color=(0, 0, 0, 0))
    logo_splash.save(output_dir / "logo-removebg.png", "PNG")

    # 6. Splash Icon (splash-icon.png) - 1024x1024 transparent splash icon
    print("Generating splash-icon.png (1024x1024)...")
    splash_icon = create_padded_image(source_img, (1024, 1024), scale_ratio=0.75, bg_color=(0, 0, 0, 0))
    splash_icon.save(output_dir / "splash-icon.png", "PNG")

    # 7. Favicon PNG (favicon.png) - 48x48 web favicon
    print("Generating favicon.png (48x48)...")
    favicon_png = create_padded_image(source_img, (48, 48), scale_ratio=0.9, bg_color=(0, 0, 0, 0))
    favicon_png.save(output_dir / "favicon.png", "PNG")

    # 8. Favicon ICO (favicon.ico) - Multi-resolution ICO (16x16, 32x32, 48x48)
    print("Generating favicon.ico (16x16, 32x32, 48x48)...")
    favicon_sizes = [(16, 16), (32, 32), (48, 48)]
    ico_images = [create_padded_image(source_img, size, scale_ratio=0.9, bg_color=(0, 0, 0, 0)) for size in favicon_sizes]
    ico_images[0].save(
        output_dir / "favicon.ico",
        format="ICO",
        sizes=[(img.width, img.height) for img in ico_images]
    )

    print("-" * 50)
    print("Success! All image assets have been generated in:")
    print(f"  {output_dir.resolve()}")


if __name__ == "__main__":
    main()
