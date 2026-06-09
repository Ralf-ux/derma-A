import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    envPrefix: ['VITE_', 'EXPO_PUBLIC_'],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.EXPO_PUBLIC_SUPABASE_URL': JSON.stringify(env.EXPO_PUBLIC_SUPABASE_URL),
      'process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY': JSON.stringify(env.EXPO_PUBLIC_SUPABASE_ANON_KEY),
      'process.env.EXPO_PUBLIC_ADMIN_EMAIL': JSON.stringify(env.EXPO_PUBLIC_ADMIN_EMAIL),
      'process.env.EXPO_PUBLIC_ADMIN_EMAILS': JSON.stringify(env.EXPO_PUBLIC_ADMIN_EMAILS),
      'process.env.EXPO_PUBLIC_OPENROUTER_API_KEY': JSON.stringify(env.EXPO_PUBLIC_OPENROUTER_API_KEY),
      global: 'globalThis',
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
        'react-native': 'react-native-web',
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
