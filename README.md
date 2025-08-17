# เอกสารสรุปเวิร์กโฟลว์ n8n (W1–W6)
เอกสารฉบับนี้จัดทำเป็นภาษาไทย สำหรับใช้สาธิตในชั้นเรียนและใช้งานจริง โดยเรียบง่าย เป็นทางการ ตรงไปตรงมา

---

## ข้อกำหนดเบื้องต้น
- บัญชี n8n (Cloud หรือ Self-hosted) และเข้าถึง Editor UI ได้
- เตรียม **Google OAuth2 Credential** สำหรับ Google Sheets / Gmail
- สำหรับ AI Agent: เตรียม Credential ของโมเดล (เช่น Gemini / OpenAI) และสามารถใช้งาน **Chat Trigger** ได้

---

## W1 — รับคำขอและออกเลข Ticket อัตโนมัติ
**วัตถุประสงค์:** รับข้อมูลจากฟอร์ม สร้างรหัส `ticket_id` (UUID) และบันทึกลง Google Sheets พร้อมอีเมลตอบรับ (เลือกได้)  
**โหนดที่ต้องมี:** `Webhook (Trigger)` → `Crypto` → `Edit Fields (Set)` → `Google Sheets (Append)` → `Gmail (Send Email)`  
**ผังย่อ:** Webhook → Crypto → Set → Sheets → (Gmail)

### ขั้นตอนย่อ
1. **Webhook (POST)** — Path: `/ticket/new` — รับ `{name, email, subject, detail}`
2. **Crypto** — Action: `Generate a random string` → Type: `UUID` → Property Name: `ticket_id`
3. **Edit Fields (Set)** — ตั้งค่า  
   - `created_at = {{$now.toISO()}}`  
   - คัดลอก `name, email, subject, detail` จาก `{{$json["body"].*}}`
4. **Google Sheets (Append)** — แมปคอลัมน์: `ticket_id, created_at, name, email, subject, detail, status="open"`
5. **Gmail (Send Email)** — ส่งอีเมลยืนยันถึงผู้ใช้ ระบุเลขอ้างอิง `ticket_id`

### ตัวอย่าง cURL (ทดสอบ Webhook)
```bash
curl -X POST "<TEST_WEBHOOK_URL>/ticket/new"   -H "Content-Type: application/json"   -d '{"name":"Ploy","email":"ploy@example.com","subject":"สอบถาม","detail":"อยากทราบข้อมูล"}'
```

---

## W2 — อีเมลตอบรับอัตโนมัติ
**วัตถุประสงค์:** ส่งอีเมลตอบกลับเมื่อได้รับข้อความ  
**โหนดที่ต้องมี:** `Webhook (Trigger)` → `Gmail (Send Email)`  
**ผังย่อ:** Webhook → Gmail

### ขั้นตอนย่อ
1. **Webhook (POST)** — Path: `/contact` — รับ `{name, email, message}`
2. **Gmail (Send Email)**  
   - To: `{{$json["body"]["email"]}}`  
   - Subject: `ยืนยันการรับข้อความ`  
   - Body (ตัวอย่าง):
     ```
     เรียนคุณ {{$json["body"]["name"]}},
     ระบบได้รับข้อความของท่านเรียบร้อยแล้ว
     ```

### ตัวอย่าง cURL
```bash
curl -X POST "<TEST_WEBHOOK_URL>/contact"   -H "Content-Type: application/json"   -d '{"name":"Nok","email":"nok@example.com","message":"ขอข้อมูลเพิ่มเติม"}'
```

---

## W3 — รับแบบประเมินสั้น → ตรวจความถูกต้อง → บันทึก Google Sheets
**วัตถุประสงค์:** เก็บคะแนนความพึงพอใจ (1–5) จากฟอร์ม ตรวจค่าก่อนบันทึก  
**โหนดที่ต้องมี:** `Webhook (Trigger)` → `If` → `Edit Fields (Set)` → `Google Sheets (Append)`  
**ผังย่อ:** Webhook → If(ตรวจ 1–5) → Set → Sheets

### ขั้นตอนย่อ
1. **Webhook (POST)** — Path: `/survey` — รับ `{name, email, rating(1–5), comment}`
2. **If** — เงื่อนไข:
   ```
   {{$json["body"]["rating"] >= 1 && $json["body"]["rating"] <= 5}}
   ```
   - เส้น **True** = ผ่านการตรวจ / เส้น **False** = ไม่บันทึก
3. **Edit Fields (Set)** *(ต่อจากเส้น True)*  
   - `timestamp = {{$now.toISO()}}`  
   - `name = {{$json["body"]["name"]}}`  
   - `email = {{$json["body"]["email"]}}`  
   - `rating = {{$json["body"]["rating"]}}`  
   - `comment = {{$json["body"]["comment"]}}`  
   - `form = "Class Feedback"`
4. **Google Sheets (Append)** — แมปคอลัมน์: `timestamp, name, email, rating, comment, form`

### ตัวอย่าง cURL
```bash
curl -X POST "<TEST_WEBHOOK_URL>/survey"   -H "Content-Type: application/json"   -d '{"name":"Ploy","email":"ploy@example.com","rating":5,"comment":"ดีมาก"}'
```

---

## W4 — ปรับข้อความให้เป็นทางการด้วย AI Agent → ส่งอีเมลตอบกลับ
**วัตถุประสงค์:** รับข้อความจากผู้เรียน ให้ AI ปรับให้เป็นภาษาไทยทางการและกระชับ แล้วส่งกลับทางอีเมล  
**โหนดที่ต้องมี:** `Webhook (Trigger)` → `Edit Fields (Set)` → `AI Agent` → `Gmail (Send Email)`  
**ผังย่อ:** Webhook → Set → AI Agent → Gmail

### ขั้นตอนย่อ
1. **Webhook (POST)** — Path: `/polish` — รับ `{name, email, message}`
2. **Edit Fields (Set)**  
   - `policy = "Rewrite in Thai, formal and concise."`  
   - `raw_message = {{$json["body"]["message"]}}`
3. **AI Agent**  
   - เลือก **Chat Model** ที่มี Credential (เช่น Gemini / OpenAI)  
   - Prompt (Define below):
     ```
     {{$json["policy"]}}
     Text:
     {{$json["raw_message"]}}
     Output only the rewritten text.
     ```
4. **Gmail (Send Email)**  
   - To: `{{$json["body"]["email"]}}`  
   - Subject: `ข้อความที่ปรับปรุงแล้ว`  
   - Body:
     ```
     เรียนคุณ {{$json["body"]["name"]}},
     นี่คือข้อความที่ปรับปรุงให้เป็นทางการและกระชับ:
     {{$json["text"] || $json["output"]}}
     ```

### ตัวอย่าง cURL
```bash
curl -X POST "<TEST_WEBHOOK_URL>/polish"   -H "Content-Type: application/json"   -d '{"name":"Nok","email":"nok@example.com","message":"สวัสดีค่ะอาจารย์ หนูอยากทราบเรื่องส่งงานช้า"}'
```

---

## W5 — ตรวจสุขภาพเว็บไซต์ (Uptime) → แจ้งเตือนทางอีเมลเมื่อ “ล่ม”
**วัตถุประสงค์:** ตรวจปลายทางสุขภาพระบบตามช่วงเวลา และหากการเรียกไม่สำเร็จให้ส่งอีเมลแจ้งเตือนทันที  
**โหนดที่ต้องมี:** `Schedule Trigger` → `HTTP Request` → *(เอาต์พุต 1 = สำเร็จ / เอาต์พุต 2 = ไม่สำเร็จ)* → `Gmail (Send Email)`  
**ผังย่อ:** Schedule → **HTTP** *(On Error: Continue using error output)* → Output 1/2 → Gmail

### การตั้งค่าและขั้นตอน
1. **Schedule Trigger** — ตั้งทุก 5 นาที (ปรับได้)
2. **HTTP Request**  
   - Method: `GET`  
   - URL: `https://<your-domain>/health`  
   - **Timeout (แนะนำ):** `5000 ms`  
   - **On Error (แถบ Settings ของโหนด):** เลือก `Continue (using error output)`  
     - ผลลัพธ์: โหนดจะแยกทางออกเป็น 2 ทาง  
       - **Output 1 (Success):** เรียกสำเร็จ  
       - **Output 2 (Error):** เรียกไม่สำเร็จ (เช่น timeout/เชื่อมต่อไม่ได้/ข้อผิดพลาดอื่น)
3. **Gmail (Send Email)** *(เชื่อมจาก Output 2 ของ HTTP Request)*  
   - To: `<อีเมลผู้ดูแล>`  
   - Subject: `แจ้งเตือน: เว็บไซต์อาจล่ม`  
   - Body:
     ```
     ระบบตรวจพบความผิดพลาดในการตรวจสุขภาพเว็บไซต์
     เวลา: {{$now.toISO()}}
     URL: https://<your-domain>/health
     รายละเอียดล่าสุด: {{$json["statusCode"] || $json["message"] || "No response / Timeout"}}
     ```

---

## W6 — AI Chatbot พนักงานร้านอาหาร (คุยใน n8n) + ค้นข้อมูลจาก Google Sheets (แบบ A)
**วัตถุประสงค์:** ให้ผู้ใช้พิมพ์ถามเมนู/ราคา/ความพร้อมให้บริการ แล้ว Agent ใช้ Google Sheets เป็นแหล่งข้อมูลและตอบกลับในช่องแชตของ n8n  
**โครงเวิร์กโฟลว์:** `Chat Trigger` → `AI Agent (Tools Agent)` → `Respond to Chat`

### การเตรียม Google Sheets
สร้างตาราง **Menu** พร้อมคอลัมน์: `name, price, category, spicy_level, vegetarian, available, description`

### ขั้นตอนย่อ
1. **Chat Trigger** — Response mode: `Using Response Nodes`
2. **AI Agent (Tools Agent)**  
   - เลือก Chat Model ที่มี Credential  
   - ในส่วน **Tools** เพิ่ม **Google Sheets** และกำหนดเอกสาร/ชีต/ช่วงข้อมูลของตาราง `Menu`
   - Prompt (User Message) — ตัวอย่าง (ภาษาไทย ทางการ กระชับ):
     ```
     บทบาทของคุณคือ "พนักงานร้านอาหาร" ตอบคำถามลูกค้าเป็นภาษาไทย
     - เมื่อลูกค้าถามถึงราคา ความเผ็ด เมนูเจ ความพร้อมให้บริการ หรือคำแนะนำ
       ให้ใช้ข้อมูลจาก Google Sheets ก่อน แล้วจึงสรุปคำตอบ
     - ถ้าไม่มีเมนูตรงเงื่อนไข ให้เสนอเมนูใกล้เคียง 1–2 รายการ
     - ตอบสั้น กระชับ และสุภาพ
     ```
3. **Respond to Chat** — ส่งข้อความคำตอบสุดท้ายจาก Agent กลับไปยังช่องแชต n8n

### ตัวอย่างคำถามทดสอบ
- “มีเมนูเจอะไรบ้าง”  
- “ราคาแกงเขียวหวานเท่าไร”  
- “ขอเมนูไม่เผ็ด แนะนำ 2 อย่าง”  
- “วันนี้มีผัดไทยกุ้งไหม”

---