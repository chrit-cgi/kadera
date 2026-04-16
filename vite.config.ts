import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    target: 'es2022',
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-zustand': ['zustand'],
          'vendor-firebase': ['firebase/app', 'firebase/auth'],
          'screen-onboarding': ['./src/screens/Onboarding'],
          'screen-brief': ['./src/screens/MorningBrief'],
          'screen-chat': ['./src/screens/CoachChat'],
          'screen-plan': ['./src/screens/TrainingPlan'],
          'screen-session': ['./src/screens/SessionDetail'],
          'screen-galaxy': ['./src/screens/Galaxy'],
          'screen-food': ['./src/screens/FoodLog'],
          'screen-garmin': ['./src/screens/GarminImport'],
          'screen-settings': ['./src/screens/Settings'],
          'screen-admin': [
            './src/screens/admin/AdminDashboard',
            './src/screens/admin/AdminInvites',
            './src/screens/admin/AdminSettings',
            './src/screens/admin/AdminUsers',
          ],
        },
      },
    },
  },
})
