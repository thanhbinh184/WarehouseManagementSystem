# 🚀 SmartWMS - Hệ thống Quản lý kho Laptop & Điện thoại tích hợp AI

**SmartWMS** là một ứng dụng Web toàn diện được thiết kế đặc thù cho việc quản lý các mặt hàng công nghệ có giá trị cao. Dự án tập trung vào việc giải quyết bài toán quản lý chi tiết đến từng đơn vị sản phẩm thông qua mã **IMEI/Serial Number**.

---

## 🌟 Tính năng nổi bật

- **Quản lý IMEI chặt chẽ:** Kiểm soát chính xác 100% vòng đời sản phẩm từ lúc nhập kho đến khi bán ra và bảo hành.
- **Tích hợp Generative AI (Google Gemini):** 
  - Chatbot hỗ trợ truy vấn dữ liệu tồn kho bằng ngôn ngữ tự nhiên.
  - Phân tích và đưa ra dự báo nhập hàng thông minh dựa trên dữ liệu thực tế.
- **Nghiệp vụ kho đầy đủ:** Số hóa quy trình Nhập kho, Xuất kho, Kiểm kê và Bảo hành.
- **Hệ thống Dashboard:** Trực quan hóa dữ liệu bằng biểu đồ realtime (doanh thu, cơ cấu kho).
- **Công nghệ QR Code:** Hỗ trợ quét mã vạch bằng camera trình duyệt và in tem nhãn sản phẩm.

---

## 🛠 Công nghệ sử dụng (FARM Stack)

### Backend:
- **Ngôn ngữ:** Python 3.10+
- **Framework:** FastAPI (Hiệu năng cao, Async/Await)
- **Cơ sở dữ liệu:** MongoDB (NoSQL)
- **AI Integration:** Google Gemini 2.5 Flash API
- **Xác thực:** JWT (JSON Web Token)

### Frontend:
- **Framework:** ReactJS (TypeScript)
- **Build Tool:** Vite
- **Styling:** Tailwind CSS (Responsive Design)
- **Thư viện:** Recharts, Axios, Html5-qrcode.

---

## ⚙️ Hướng dẫn cài đặt

### 1. Backend
cd server
pip install -r requirements.txt
uvicorn app.main:app --reload
### 2. Frontend
cd client
npm install
npm run dev
cd server
pip install -r requirements.txt
uvicorn app.main:app --reload
