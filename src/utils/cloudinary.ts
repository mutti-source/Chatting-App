import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';

export const uploadToCloudinary = async (uri: string, type: 'image' | 'audio'): Promise<string> => {
  try {
    if (!uri || typeof uri !== 'string') {
      throw new Error("Invalid or missing file URI provided for upload.");
    }

    const cloudName = process.env.EXPO_PUBLIC_CLOUD_NAME?.trim();
    const uploadPreset = process.env.EXPO_PUBLIC_UPLOAD_PRESET?.trim();

    if (!cloudName || !uploadPreset) {
      throw new Error(
        "Cloudinary environment variables missing. Please set EXPO_PUBLIC_CLOUD_NAME and EXPO_PUBLIC_UPLOAD_PRESET in your .env file and restart Expo dev server."
      );
    }

    const resourceType = type === 'image' ? 'image' : 'video'; // Cloudinary handles audio files under the 'video' resource type
    const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`;

    let data: any;
    let status = 200;

    if (Platform.OS === 'web' || !FileSystem?.uploadAsync) {
      // Cross-platform Web fallback using standard fetch & FormData
      const formData = new FormData();

      if (Platform.OS === 'web') {
        const fileRes = await fetch(uri);
        const blob = await fileRes.blob();
        const fileExt = type === 'image' ? 'jpg' : 'mp3';
        formData.append('file', blob, `upload.${fileExt}`);
      } else {
        formData.append('file', {
          uri,
          type: type === 'image' ? 'image/jpeg' : 'audio/mpeg',
          name: `upload.${type === 'image' ? 'jpg' : 'mp3'}`,
        } as any);
      }
      formData.append('upload_preset', uploadPreset);

      const response = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
      });

      status = response.status;
      data = await response.json();
    } else {
      // Native iOS & Android: High-performance background streaming upload via FileSystem
      const response = await FileSystem.uploadAsync(uploadUrl, uri, {
        httpMethod: 'POST',
        uploadType: FileSystem.FileSystemUploadType.MULTIPART,
        fieldName: 'file',
        parameters: {
          upload_preset: uploadPreset,
        },
      });

      status = response.status;
      try {
        data = JSON.parse(response.body);
      } catch {
        throw new Error(`Cloudinary server returned non-JSON response (Status ${status})`);
      }
    }

    if (status === 200 && data?.secure_url) {
      return data.secure_url as string;
    } else {
      const errorMsg = data?.error?.message || `Upload failed with HTTP status ${status}`;
      console.error("[Cloudinary Upload Error Details]:", data);
      throw new Error(`Cloudinary Upload Failed: ${errorMsg}`);
    }
  } catch (error: any) {
    console.error("[Cloudinary Exception]:", error);
    throw error;
  }
};