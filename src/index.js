import React from 'react';
// ต้อง import createRoot จาก react-dom/client สำหรับ React 18
import { createRoot } from 'react-dom/client';
import App from './App.jsx'; 
// หากคุณเปลี่ยนชื่อไฟล์ FinanceTracker.jsx เป็น App.js ให้เปลี่ยนบรรทัดบนเป็น import App from './App.js';

// -----------------------------------------------------
// 1. ระบุ element ใน HTML ที่ต้องการให้ React เข้าไปแทรก (จาก public/index.html ที่มี <div id="root"></div>)
const container = document.getElementById('root');

// 2. สร้าง root สำหรับ React 18
const root = createRoot(container); 

// 3. Render (แสดงผล) Component หลัก (App)
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// หมายเหตุ: การใช้ <React.StrictMode> จะช่วยในการหาปัญหาในโค้ดระหว่างการพัฒนา
// -----------------------------------------------------

