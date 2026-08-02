import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  cacheDir: '../project-data/vite-cache',
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
    clearMocks: true,
    include: ['src/test/**/*.test.{js,jsx}'],
    testTimeout: 15_000,
  },
})
