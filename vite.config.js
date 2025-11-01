import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  // ตั้งค่าให้ Vite ใช้ plugin สำหรับ React
  plugins: [react()], 
});