import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // 🛑 เพิ่มส่วนนี้เพื่อแก้ไขปัญหา JSX ในไฟล์ .js
  esbuild: {
    loader: 'jsx',
    include: /src\/.*\.js$/,
    exclude: [],
  },
  // 🛑 สิ้นสุดส่วนที่เพิ่ม
});

