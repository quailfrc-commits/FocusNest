import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 開發時把 /api 轉到本地後端。
// S: 槽的檔案變更有時收不到通知，造成預覽沒更新，所以改用輪詢（usePolling）監看檔案。
export default defineConfig({
  plugins: [react()],
  base: './',
  server: { port: 5173, proxy: { '/api': 'http://localhost:3000' }, watch: { usePolling: true, interval: 300 } }
});
