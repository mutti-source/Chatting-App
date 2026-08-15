
const appConfig = {
  // -------------------------------------------------------------
  // 1. APP INFORMATION
  // -------------------------------------------------------------
  appName: "Chatting",
  appSlug: "wc-chatting-chat",
  version: "1.0.0",
  androidPackage: "com.chat.chat",
  scheme: "chat",

  // -------------------------------------------------------------
  // 2. ASSETS (ICONS & SPLASH SCREEN)
  // -------------------------------------------------------------
  assets: {
    // App Icon (1024x1024 PNG)
    icon: "./assets/images/icon.png",

    // Web Favicon
    favicon: "./assets/images/favicon.png",

    // Splash Screen Image & Background Colors
    splashImage: "./assets/images/logo-removebg.png",
    splashBackgroundColorLight: "#F6F5F1",
    splashBackgroundColorDark: "#121212",

    // Android Adaptive Icons
    androidAdaptiveIconForeground: "./assets/images/android-icon-foreground.png",
    androidAdaptiveIconBackground: "./assets/images/android-icon-background.png",
    androidAdaptiveIconMonochrome: "./assets/images/android-icon-monochrome.png",
    androidAdaptiveIconBackgroundColor: "#F6F5F1",
  },

  // -------------------------------------------------------------
  // 3. COLOR SCHEME / THEME (Light & Dark Modes)
  // -------------------------------------------------------------
  theme: {
    dark: {
      primary: '#007AFF',            // Brand Electric Blue
      primaryContainer: '#4B8EFF',   // Active / Highlight Blue
      onPrimary: '#FFFFFF',
      background: '#131313',         // Deep Charcoal Surface
      card: '#1E1E1E',               // Elevated container
      surfaceLow: '#1C1B1B',         // Container low
      surfaceHigh: '#2A2A2A',        // Container high
      surfaceHighest: '#353534',     // Container highest
      surfaceBright: '#393939',      // Surface bright
      text: '#FFFFFF',               // On surface
      textSecondary: '#8B90A0',      // On surface variant / subtext
      border: 'rgba(255, 255, 255, 0.08)', // Subtle glass border
      borderHighlight: 'rgba(255, 255, 255, 0.15)',
      inputBackground: '#201F1F',    // Input container
      messageOwn: '#007AFF',         // Sent chat bubble
      messageOther: '#2A2A2A',       // Received chat bubble
      danger: '#FF453A',             // Delete / Error
      dangerContainer: '#3B1414',
      success: '#34C759',            // Success / Approved
      successContainer: '#0E3A1A',
      warning: '#FF9F0A',
    },
    light: {
      primary: '#007AFF',            // Brand Electric Blue
      primaryContainer: '#007AFF',
      onPrimary: '#FFFFFF',
      background: '#FFFFFF',         // Crisp White
      card: '#F3F3F8',               // Container Low
      surfaceLow: '#F8F9FA',
      surfaceHigh: '#EDEDF2',
      surfaceHighest: '#E5E5EA',
      surfaceBright: '#FFFFFF',
      text: '#131313',               // Deep Charcoal Text
      textSecondary: '#6E6E73',      // Subtext / Muted text
      border: 'rgba(0, 0, 0, 0.08)', // Subtle border
      borderHighlight: 'rgba(0, 0, 0, 0.15)',
      inputBackground: '#EBEBF0',    // Input background
      messageOwn: '#007AFF',         // Sent chat bubble
      messageOther: '#E9E9EB',       // Received chat bubble
      danger: '#FF3B30',
      dangerContainer: '#FFECEB',
      success: '#34C759',
      successContainer: '#E8F8ED',
      warning: '#FF9500',
    },
  },

  // -------------------------------------------------------------
  // 4. OTHER CONFIGURATIONS & FEATURE FLAGS
  // -------------------------------------------------------------
  features: {
    enableGroupCreation: true,
    enableDirectMessages: true,
    enableJoinRequests: true,
  },
};

module.exports = appConfig;
