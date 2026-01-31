import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    strictPort: true, // Nếu cổng 3000 bận, báo lỗi thay vì tự nhảy sang 3001
  },
})
