W5 Example Website (Health Endpoint)
=====================================

ไฟล์ที่สร้าง
- public/index.html       ← หน้า HTML ตัวอย่าง (เปิดที่ /)
- server.js               ← เซิร์ฟเวอร์ Node.js + Express ที่ให้ /health

วิธีใช้งาน (เครื่องของคุณ)
1. ติดตั้ง Node.js (เวอร์ชันแนะนำ >= 14)
2. เปิด terminal ในโฟลเดอร์นี้
3. สร้างโฟลเดอร์ public และวาง index.html ลงไป:
   mkdir public
   cp index.html public/

4. ติดตั้ง dependencies และรัน:
   npm init -y
   npm install express
   node server.js

5. เปิดเบราว์เซอร์ที่: http://localhost:3000/
   ใช้ Health URL สำหรับ n8n HTTP Request:
   http://localhost:3000/health

ทดสอบสถานะล้มเหลว (เพื่อดูการแจ้งเตือน):
- เรียก: http://localhost:3000/health/fail   (จะคืน 500)

ปรับเป็นการรันบนเซิร์ฟเวอร์จริง:
- หากต้องการ URL สาธารณะ ให้ deploy บน VPS / Render / Vercel / Heroku หรือใช้ tunneling (เช่น ngrok):
  ngrok http 3000
  แล้วเอา URL ที่ ngrok ให้มา → ใส่ใน n8n HTTP Request

