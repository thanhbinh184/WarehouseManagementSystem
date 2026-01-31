import os
import google.generativeai as genai
import json
from typing import List, Optional
from models import Product, AIAnalysisResult
from dotenv import load_dotenv
from models import Product, Transaction, TransactionType

# Load API Key từ .env
load_dotenv()
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

if GOOGLE_API_KEY:
    genai.configure(api_key=GOOGLE_API_KEY)

async def analyze_inventory_service(products: List[Product]) -> Optional[AIAnalysisResult]:
    if not GOOGLE_API_KEY:
        print("Error: Lỗi GOOGLE_API_KEY")
        return None

    try:
        # 1. Chuẩn bị dữ liệu input (Rút gọn để tiết kiệm token)
        # Chỉ lấy các trường cần thiết để AI phân tích
        inventory_data = [
            {
                "name": p.name,
                "category": p.category.value, # Lấy giá trị string của Enum
                "quantity": p.quantity,
                "minStock": p.minStock,
                "price": p.price
            }
            for p in products
        ]

        # 2. Tạo Prompt
        prompt = f"""
        Đóng vai trò là một chuyên gia quản lý kho hàng CÔNG NGHỆ (Laptop, Điện thoại).
        Dưới đây là dữ liệu tồn kho hiện tại (JSON):
        {json.dumps(inventory_data, ensure_ascii=False)}

        Hãy phân tích và trả về kết quả JSON tuân thủ nghiêm ngặt schema sau:
        1. summary: Tổng quan tình trạng kho (Tiếng Việt).
        2. lowStockItems: Danh sách tên sản phẩm sắp hết (quantity <= minStock).
        3. restockRecommendations: Đề xuất nhập hàng (tên, số lượng đề xuất, lý do).
        4. valueAnalysis: Phân tích phân bổ giá trị tồn kho.
        """

        # 3. Cấu hình Model & Gọi API
        # Sử dụng gemini-1.5-flash cho tốc độ nhanh và chi phí thấp (tương đương 2.5-flash ở bản preview)
        model = genai.GenerativeModel(
            model_name="gemini-2.5-flash",
            generation_config={
                "response_mime_type": "application/json",
                "response_schema": AIAnalysisResult, # Truyền trực tiếp Pydantic Model vào đây
            }
        )

        # Gọi hàm async generate
        response = await model.generate_content_async(prompt)
        
        # 4. Parse kết quả
        # Vì đã dùng response_schema, Gemini đảm bảo trả về đúng cấu trúc JSON khớp với Model
        result = AIAnalysisResult.model_validate_json(response.text)
        print("✅ Phân tích thành công!")
        return result

    except Exception as e:
        print(f"Gemini Analysis Failed: {e}")
        return None
    
# async def forecast_demand_service(products: List[Product], transactions: List[Transaction]) -> Optional[ForecastResult]:
#     if not GOOGLE_API_KEY:
#         return None

#     try:
#         # 1. TỔNG HỢP DỮ LIỆU BÁN HÀNG (Pre-processing)
#         # Tính tổng số lượng xuất kho trong 30 ngày qua cho từng sản phẩm
#         sales_data = {}
#         thirty_days_ago = datetime.now() - timedelta(days=30)
        
#         for t in transactions:
#             # Chỉ lấy giao dịch XUẤT và trong 30 ngày gần nhất
#             if t.type == TransactionType.EXPORT and t.date >= thirty_days_ago:
#                 if t.productId not in sales_data:
#                     sales_data[t.productId] = 0
#                 sales_data[t.productId] += t.quantity

#         # 2. CHUẨN BỊ DATA GỬI CHO AI
#         ai_input = []
#         for p in products:
#             sold_qty = sales_data.get(str(p.id), 0) # Lấy số đã bán, nếu không có thì là 0
#             ai_input.append({
#                 "product": p.name,
#                 "category": p.category.value if hasattr(p.category, 'value') else p.category,
#                 "current_stock": p.quantity,
#                 "min_stock": p.minStock,
#                 "sales_last_30_days": sold_qty
#             })

#         # 3. TẠO PROMPT
#         prompt = f"""
#         Bạn là chuyên gia phân tích chuỗi cung ứng. Dựa vào dữ liệu bán hàng 30 ngày qua (sales_last_30_days), hãy dự báo nhu cầu tháng tới.
        
#         Dữ liệu đầu vào (JSON):
#         {json.dumps(ai_input, ensure_ascii=False)}

#         Yêu cầu trả về JSON theo schema:
#         - summary: Nhận định chung về xu hướng tiêu thụ (Tiếng Việt).
#         - forecasts: Danh sách dự báo cho từng sản phẩm:
#             + predictedSalesNextMonth: Dự đoán số lượng sẽ bán tháng tới (Dựa trên sales_last_30_days, có thể tăng nhẹ theo xu hướng).
#             + restockSuggestion: Số lượng CẦN NHẬP THÊM (Công thức gợi ý: Dự đoán - Tồn kho hiện tại + Mức an toàn. Nếu âm thì ghi 0).
#             + analysis: Giải thích ngắn gọn tại sao (Tiếng Việt).
#         """

#         # 4. GỌI GEMINI 2.5 FLASH (Hoặc 1.5 Flash)
#         model = genai.GenerativeModel(
#             model_name="gemini-2.5-flash", 
#             generation_config={
#                 "response_mime_type": "application/json",
#                 "response_schema": ForecastResult,
#             }
#         )

#         response = await model.generate_content_async(prompt)
#         return ForecastResult.model_validate_json(response.text)

#     except Exception as e:
#         print(f"🔥 Forecast Error: {e}")
#         return None
async def ask_gemini_service(question: str, products: List[Product], transactions: List[Transaction]) -> str:
    if not GOOGLE_API_KEY:
        return "Chưa cấu hình API Key."

    try:
        # 1. Chuẩn bị dữ liệu ngữ cảnh (Context)
        # Rút gọn dữ liệu để tiết kiệm token, nhưng Gemini 1.5/2.5 Flash xử lý tốt lượng lớn data.
        
        # Data Sản phẩm (Chỉ lấy tên, tồn kho, giá)
        prod_context = [
            f"{p.name} (Tồn: {p.quantity}, Giá: {p.price})" 
            for p in products
        ]
        
        # Data Giao dịch (Lấy 50 giao dịch gần nhất để phân tích xu hướng ngắn hạn)
        trans_context = [
            f"{t.date.strftime('%Y-%m-%d')}: {t.type} {t.quantity} cái {t.productName} ({t.partner or 'N/A'})"
            for t in transactions[:50] 
        ]

        # 2. Tạo Prompt
        prompt = f"""
        Bạn là trợ lý ảo của hệ thống quản lý kho CÔNG NGHỆ (Laptop, Điện thoại) SmartWMS .
        Dưới đây là dữ liệu hiện tại của kho hàng:
        
        --- DANH SÁCH SẢN PHẨM ---
        {json.dumps(prod_context, ensure_ascii=False)}
        
        --- LỊCH SỬ GIAO DỊCH GẦN ĐÂY ---
        {json.dumps(trans_context, ensure_ascii=False)}
        
        --- CÂU HỎI CỦA NGƯỜI DÙNG ---
        "{question}"
        
        --- YÊU CẦU ---
        Hãy trả lời câu hỏi trên dựa vào dữ liệu đã cung cấp. 
        - Trả lời ngắn gọn, súc tích bằng tiếng Việt.
        - Nếu câu hỏi liên quan đến tính toán (tổng tiền, tổng số lượng), hãy tính toán chính xác.
        - Nếu không tìm thấy thông tin trong dữ liệu, hãy nói "Tôi không tìm thấy thông tin này trong dữ liệu hiện tại".
        - Giọng điệu chuyên nghiệp, thân thiện.
        """

        # 3. Gọi Model
        model = genai.GenerativeModel("gemini-2.5-flash") # Hoặc 1.5-flash
        response = await model.generate_content_async(prompt)
        
        return response.text

    except Exception as e:
        print(f"🔥 Chat Error: {e}")
        return "Xin lỗi, tôi đang gặp sự cố khi suy nghĩ câu trả lời."