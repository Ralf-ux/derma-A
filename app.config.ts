import { ExpoConfig } from '@expo/config';

export default {
  name: 'DermaScan',
  slug: 'dermascan',
  version: '1.0.0',
  icon: './asserts/appicon.png',
  // Point Expo CLI to the CJS metro config (required when package.json has "type":"module")
  metroConfig: './metro.config.cjs',
  splash: {
    image: './asserts/appicon.png',
    resizeMode: 'contain',
    backgroundColor: '#0a4d3c',
  },
  android: {
    package: 'com.ralph2x.dermascan', // ADD THIS LINE 👇
    adaptiveIcon: {
      foregroundImage: './asserts/appicon.png',
      backgroundColor: '#0a4d3c',
    },
    permissions: [
      'android.permission.CAMERA',
      'android.permission.READ_MEDIA_IMAGES',
      'android.permission.READ_EXTERNAL_STORAGE',
    ],
  },
  ios: {
    icon: './asserts/appicon.png',
  },
  plugins: [
    [
      'expo-image-picker',
      {
        photosPermission: 'Allow DermaScan to access your photos for skin scan analysis.',
        cameraPermission: 'Allow DermaScan to use the camera for skin scan photos.',
      },
    ],
  ],
  web: {
    favicon: './asserts/appicon-for-all.png',
    name: 'DermaScan',
  },
  extra: {
    EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
    EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
    EXPO_PUBLIC_ADMIN_EMAIL: process.env.EXPO_PUBLIC_ADMIN_EMAIL ?? '',
    EXPO_PUBLIC_ADMIN_EMAILS: process.env.EXPO_PUBLIC_ADMIN_EMAILS ?? '',
    EXPO_PUBLIC_BACKEND_API_URL: process.env.EXPO_PUBLIC_BACKEND_API_URL ?? '',
    EXPO_PUBLIC_OPENROUTER_API_KEY: process.env.EXPO_PUBLIC_OPENROUTER_API_KEY ?? '',
    eas: {
      projectId: "9863f30b-9a66-412b-8be9-feaa11dc189b"
    }
  },
} satisfies ExpoConfig;