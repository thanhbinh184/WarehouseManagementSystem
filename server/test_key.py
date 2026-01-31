# backend/test_key.py
import os
import google.generativeai as genai
from dotenv import load_dotenv

# Load file .env
load_dotenv()

KEY = os.getenv("GOOGLE_API_KEY")

print(f"🔑 Đang kiểm tra Key: {KEY[:10]}..." if KEY else "❌ KHÔNG TÌM THẤY KEY")

if KEY:
    try:
        genai.configure(api_key=KEY)
        model = genai.GenerativeModel('gemini-2.5-flash')
        response = model.generate_content("Chào bạn, bạn có khỏe không?")
        print("\n✅ KẾT NỐI THÀNH CÔNG!")
        print("🤖 AI trả lời:", response.text)
    except Exception as e:
        print("\n❌ KẾT NỐI THẤT BẠI:", e)
else:
    print("👉 Hãy tạo file .env và thêm GOOGLE_API_KEY=... vào.")