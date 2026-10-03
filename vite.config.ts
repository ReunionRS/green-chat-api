import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: 'firebase-firestore', test: /node_modules[\\/]@firebase[\\/]firestore/, priority: 30 },
            { name: 'firebase-auth', test: /node_modules[\\/]@firebase[\\/]auth/, priority: 30 },
            { name: 'firebase-core', test: /node_modules[\\/](@firebase|firebase)[\\/]/, priority: 20 },
            { name: 'react', test: /node_modules[\\/](react|react-dom)[\\/]/, priority: 20 },
          ],
        },
      },
    },
  },
})
