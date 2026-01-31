import os
import io
from bson import ObjectId
from datetime import datetime, timedelta
from typing import List, Optional
from contextlib import asynccontextmanager

# Third-party imports
import motor.motor_asyncio
import pandas as pd
from fastapi import FastAPI, HTTPException, Depends, status, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse 
from fastapi.security import OAuth2PasswordRequestForm
from beanie import init_beanie, PydanticObjectId
from pydantic import BaseModel, EmailStr
from dotenv import load_dotenv

# --- Import Models & Logic ---
# Đảm bảo các file models.py, auth.py, log_service.py, ai_service.py nằm cùng thư mục
from auth import get_password_hash, verify_password, create_access_token, get_current_user
from log_service import create_log
from ai_service import analyze_inventory_service, ask_gemini_service

from models import (
    User,
    Role,
    SystemLog,
    Product, 
    Transaction, 
    StocktakeSession, 
    TransactionType, 
    StocktakeStatus,
    MovementLog, 
    AIAnalysisResult,
    Partner,
    WarrantyTicket,
    WarrantyStatus,
    Brand
)

# Load biến môi trường
load_dotenv()

# --- Cấu hình Database ---
MONGO_URL = "mongodb://localhost:27017"
DB_NAME = "warehouse"

# ==========================================
# 👇 SCHEMAS (Khai báo ở đầu để tránh lỗi NameError)
# ==========================================

class ChatRequest(BaseModel):
    question: str

# Schema cho User Management (Thêm/Sửa từ Admin)
class UserCreate(BaseModel):
    full_name: str
    email: str       
    username: str
    password: str
    role: str = "staff"

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None
    password: Optional[str] = None

# 👇 ĐÂY LÀ CLASS BẠN ĐANG THIẾU 👇
class ChangePasswordSchema(BaseModel):
    current_password: str
    new_password: str

# ==========================================

# --- LIFESPAN (Vòng đời ứng dụng) ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    print("🚀 Đang khởi động Server...")
    client = motor.motor_asyncio.AsyncIOMotorClient(MONGO_URL)
    database = client[DB_NAME]
    
    await init_beanie(
        database=database,
        document_models=[
            User, Product, Transaction, StocktakeSession, MovementLog, SystemLog, Partner, WarrantyTicket, Brand
        ]
    )
    print(f"✅ Đã kết nối thành công đến MongoDB: {DB_NAME}")
    yield
    print("🛑 Server đang tắt...")

# --- Khởi tạo App ---
app = FastAPI(lifespan=lifespan)

# --- Cấu hình CORS ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ================= DASHBOARD STATS API (MỚI) =================
@app.get("/api/reports/dashboard-stats")
async def get_dashboard_stats():
    # 1. Lấy dữ liệu thô từ DB
    products = await Product.find_all().to_list()
    transactions = await Transaction.find_all().to_list()
    
    # Nếu chưa có dữ liệu thì trả về rỗng để không lỗi Frontend
    if not products:
        return {
            "categoryData": [],
            "trendData": [],
            "topProducts": []
        }

    # --- A. BIỂU ĐỒ TRÒN (Pie): Tỷ lệ tồn kho theo Danh mục ---
    cat_stats = {}
    for p in products:
        # Lấy giá trị chuỗi của Enum hoặc string
        cat = p.category.value if hasattr(p.category, 'value') else str(p.category)
        cat_stats[cat] = cat_stats.get(cat, 0) + p.quantity
    
    category_data = [{"name": k, "value": v} for k, v in cat_stats.items()]

    # --- B. BIỂU ĐỒ ĐƯỜNG (Area): Xu hướng Nhập/Xuất 7 ngày qua ---
    trend_data = []
    today = datetime.now()
    
    # Tạo khung dữ liệu cho 7 ngày gần nhất (để biểu đồ luôn đủ 7 cột)
    for i in range(6, -1, -1):
        date_obj = today - timedelta(days=i)
        date_label = date_obj.strftime("%d/%m")
        trend_data.append({"date": date_label, "import": 0, "export": 0})

    # Điền dữ liệu transaction vào khung
    for t in transactions:
        # Chỉ tính giao dịch trong vòng 7 ngày qua
        if (today - t.date).days <= 7:
            t_date = t.date.strftime("%d/%m")
            for day in trend_data:
                if day["date"] == t_date:
                    if t.type == TransactionType.IMPORT:
                        day["import"] += t.quantity
                    elif t.type == TransactionType.EXPORT:
                        day["export"] += t.quantity

    # --- C. BIỂU ĐỒ CỘT (Bar): Top 5 Sản phẩm bán chạy (Xuất kho nhiều nhất) ---
    export_counts = {}
    for t in transactions:
        if t.type == TransactionType.EXPORT:
            # Cộng dồn số lượng xuất theo tên sản phẩm
            export_counts[t.productName] = export_counts.get(t.productName, 0) + t.quantity
    
    # Sắp xếp giảm dần và lấy Top 5
    sorted_products = sorted(export_counts.items(), key=lambda x: x[1], reverse=True)[:5]
    top_products = [{"name": name, "quantity": qty} for name, qty in sorted_products]

    return {
        "categoryData": category_data,
        "trendData": trend_data,
        "topProducts": top_products
    }

# ==========================================
# 1. AUTHENTICATION API
# ==========================================

@app.post("/api/auth/register", response_model=User)
async def register_user(user_data: User):
    existing = await User.find_one(User.username == user_data.username)
    if existing:
        raise HTTPException(status_code=400, detail="Username đã tồn tại")
    
    user_data.password_hash = get_password_hash(user_data.password_hash)
    await user_data.create()
    await create_log("System", "REGISTER", user_data.username, f"Tạo tài khoản mới: {user_data.full_name}")
    return user_data

@app.post("/api/auth/login")
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    user = await User.find_one(User.username == form_data.username)
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sai tài khoản hoặc mật khẩu",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=60 * 24)
    access_token = create_access_token(
        data={"sub": user.username, "role": user.role},
        expires_delta=access_token_expires
    )
    await create_log(user.username, "LOGIN", "System", "Đăng nhập thành công")
    
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "username": user.username,
        "role": user.role,
        "full_name": user.full_name
    }

@app.get("/api/auth/me", response_model=User)
async def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user

# ==========================================
# 3. PERSONAL PROFILE API (Cài đặt tài khoản)
# ==========================================

# Lấy thông tin chính mình
@app.get("/api/users/me", response_model=User)
async def read_my_profile(current_user: User = Depends(get_current_user)):
    return current_user

# Tự cập nhật thông tin (Tên, Email)
@app.put("/api/users/me", response_model=User)
async def update_own_profile(
    user_data: UserUpdate, 
    current_user: User = Depends(get_current_user)
):
    if user_data.full_name:
        current_user.full_name = user_data.full_name
    if user_data.email:
        current_user.email = user_data.email
    
    await current_user.save()
    return current_user

# Đổi mật khẩu
@app.post("/api/users/change-password")
async def change_password(
    password_data: ChangePasswordSchema,
    current_user: User = Depends(get_current_user)
):
    if not verify_password(password_data.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Mật khẩu hiện tại không đúng")
    
    current_user.password_hash = get_password_hash(password_data.new_password)
    await current_user.save()
    
    return {"message": "Đổi mật khẩu thành công"}

# ==========================================
# 2. USER MANAGEMENT API (Dành cho Admin)
# ==========================================

@app.get("/api/users", response_model=List[User])
async def get_users(current_user: User = Depends(get_current_user)):
    # Có thể thêm check if current_user.role != 'admin' raise HTTPException...
    users = await User.find_all().to_list()
    return users

@app.post("/api/users", response_model=User)
async def create_user(user_data: UserCreate, current_user: User = Depends(get_current_user)):
    # Check trùng
    existing_user = await User.find_one(User.username == user_data.username)
    if existing_user:
        raise HTTPException(status_code=400, detail="Username đã tồn tại")
    
    existing_email = await User.find_one(User.email == user_data.email)
    if existing_email:
        raise HTTPException(status_code=400, detail="Email này đã được sử dụng")
    
    # Tạo User
    hashed_password = get_password_hash(user_data.password)
    new_user = User(
        username=user_data.username,
        email=user_data.email,
        full_name=user_data.full_name,
        role=user_data.role,
        password_hash=hashed_password
    )
    await new_user.insert()
    await create_log(current_user.username, "CREATE_USER", new_user.username, "Admin tạo nhân viên mới")
    return new_user

@app.put("/api/users/{user_id}")
async def update_user(user_id: PydanticObjectId, user_data: UserUpdate, current_user: User = Depends(get_current_user)):
    try:
        oid = PydanticObjectId(user_id)
    except:
        raise HTTPException(status_code=400, detail="ID không hợp lệ")

    user = await User.get(oid)
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy nhân viên")
    
    update_data = user_data.dict(exclude_unset=True)
    
    # Xử lý mật khẩu nếu có
    if "password" in update_data and update_data["password"]:
        user.password_hash = get_password_hash(update_data.pop("password"))
    elif "password" in update_data:
        del update_data["password"]

    # Cập nhật các trường khác
    if "full_name" in update_data: user.full_name = update_data["full_name"]
    if "email" in update_data: user.email = update_data["email"]
    if "role" in update_data: user.role = update_data["role"]
        
    await user.save()
    await create_log(current_user.username, "UPDATE_USER", user.username, "Admin cập nhật thông tin")
    return user

@app.delete("/api/users/{user_id}")
async def delete_user(user_id: PydanticObjectId, current_user: User = Depends(get_current_user)):
    try:
        oid = PydanticObjectId(user_id)
    except:
        raise HTTPException(status_code=400, detail="ID không hợp lệ")

    user = await User.get(oid)
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy nhân viên")
    
    if user.username == current_user.username:
        raise HTTPException(status_code=400, detail="Không thể tự xóa tài khoản đang đăng nhập")
    
    username_backup = user.username
    await user.delete()
    await create_log(current_user.username, "DELETE_USER", username_backup, "Admin xóa nhân viên")
    return {"message": "Đã xóa thành công"}

# ==========================================
# 4. BRANDS API
# ==========================================

@app.get("/api/brands", response_model=List[Brand])
async def get_brands():
    return await Brand.find_all().to_list()

@app.post("/api/brands", response_model=Brand)
async def create_brand(brand: Brand):
    existing = await Brand.find_one(Brand.name == brand.name)
    if existing:
        raise HTTPException(status_code=400, detail="Thương hiệu đã tồn tại")
    await brand.create()
    return brand

@app.put("/api/brands/{id}", response_model=Brand)
async def update_brand(id: str, data: Brand):
    brand = await Brand.get(id)
    if not brand:
        raise HTTPException(status_code=404, detail="Không tìm thấy thương hiệu")
    
    # Cập nhật dữ liệu
    await brand.update({"$set": data.dict(exclude={"id"})})
    return brand

@app.delete("/api/brands/{id}")
async def delete_brand(id: str):
    brand = await Brand.get(id)
    if not brand:
        raise HTTPException(status_code=404, detail="Không tìm thấy thương hiệu")
    await brand.delete()
    return {"message": "Đã xóa thương hiệu"}

# ==========================================
# 5. PRODUCTS API
# ==========================================

@app.get("/api/products", response_model=List[Product])
async def get_products():
    return await Product.find_all().to_list()

@app.post("/api/products", response_model=Product)
async def create_product(product: Product, current_user: User = Depends(get_current_user)):
    existing = await Product.find_one(Product.sku == product.sku)
    if existing:
        raise HTTPException(status_code=400, detail="Mã SKU này đã tồn tại")
    
    await product.create()
    await create_log(current_user.username, "CREATE", product.name, f"Thêm SP mới (SKU: {product.sku})")
    return product

@app.put("/api/products/{id}", response_model=Product)
async def update_product(id: str, data: Product, current_user: User = Depends(get_current_user)):
    product = await Product.get(id)
    if not product:
        raise HTTPException(404, "Không tìm thấy sản phẩm")
    
    update_data = data.dict(exclude={"id"})
    update_data['lastUpdated'] = datetime.now()
    
    await product.update({"$set": update_data})
    await create_log(current_user.username, "UPDATE", product.name, "Cập nhật thông tin")
    return product

@app.delete("/api/products/{id}")
async def delete_product(id: str, current_user: User = Depends(get_current_user)):
    if current_user.role != "admin": # Check role đơn giản
        raise HTTPException(status_code=403, detail="Chỉ Admin mới có quyền xóa sản phẩm")

    product = await Product.get(id)
    if not product:
        raise HTTPException(404, "Không tìm thấy sản phẩm")
    
    name_backup = product.name
    await product.delete()
    await create_log(current_user.username, "DELETE", name_backup, "Xóa sản phẩm khỏi hệ thống")
    return {"message": "Đã xóa sản phẩm thành công"}

# ==========================================
# 6. TRANSACTIONS API
# ==========================================

@app.get("/api/transactions", response_model=List[Transaction])
async def get_transactions():
    return await Transaction.find_all().sort("-date").to_list()

@app.post("/api/transactions", response_model=Transaction)
async def create_transaction(trans: Transaction, current_user: User = Depends(get_current_user)):
    # 1. Validate cơ bản: Nếu có nhập IMEI, số lượng IMEI phải khớp với số lượng tổng
    if trans.imeis and len(trans.imeis) != trans.quantity:
        raise HTTPException(status_code=400, detail=f"Số lượng là {trans.quantity} nhưng danh sách chứa {len(trans.imeis)} mã IMEI.")

    # 2. Lưu transaction vào lịch sử
    await trans.create()
    
    # 3. Cập nhật Sản phẩm (Product)
    product = await Product.get(trans.productId)
    if product:
        # === TRƯỜNG HỢP NHẬP KHO ===
        if trans.type == TransactionType.IMPORT:
            # Nếu có IMEI, thêm vào danh sách
            if trans.imeis:
                # Kiểm tra xem IMEI đã tồn tại trong kho chưa (tránh trùng lặp)
                for imei in trans.imeis:
                    if imei in product.imeis:
                        raise HTTPException(status_code=400, detail=f"IMEI {imei} đã tồn tại trong kho!")
                
                # Thêm mới vào danh sách
                product.imeis.extend(trans.imeis)
            
            # Cộng số lượng
            product.quantity += trans.quantity

        # === TRƯỜNG HỢP XUẤT KHO (SỬA Ở ĐÂY) ===
        elif trans.type == TransactionType.EXPORT:
            # Kiểm tra đủ số lượng không
            if product.quantity < trans.quantity:
                 raise HTTPException(status_code=400, detail="Lỗi: Không đủ hàng trong kho để xuất!")
            
            # Nếu giao dịch có kèm IMEI (VD: Bán điện thoại)
            if trans.imeis:
                for imei_to_remove in trans.imeis:
                    # Kiểm tra IMEI này có thực sự ở trong kho không
                    if imei_to_remove not in product.imeis:
                        raise HTTPException(status_code=400, detail=f"Lỗi: IMEI {imei_to_remove} không có trong kho để xuất!")
                    
                    # XÓA IMEI KHỎI DANH SÁCH TỒN KHO
                    product.imeis.remove(imei_to_remove)
            
            # Trừ số lượng
            product.quantity -= trans.quantity
            
        # Cập nhật thời gian và lưu lại
        product.lastUpdated = datetime.now()
        await product.save()
        
        # 4. Ghi Log hệ thống
        action_type = "IMPORT" if trans.type == TransactionType.IMPORT else "EXPORT"
        
        # Tạo nội dung log chi tiết
        imei_info = f" (IMEI: {', '.join(trans.imeis)})" if trans.imeis else ""
        partner_info = f" - Đối tác: {trans.partner}" if trans.partner else ""
        
        log_detail = f"{action_type} {trans.quantity} cái{imei_info}{partner_info}"
        
        await create_log(current_user.username, action_type, product.name, log_detail)
        
    return trans

# ==========================================
# 7. STOCKTAKES & MOVEMENTS & LOGS
# ==========================================

@app.get("/api/stocktakes", response_model=List[StocktakeSession])
async def get_stocktakes():
    return await StocktakeSession.find_all().sort("-date").to_list()

@app.post("/api/stocktakes", response_model=StocktakeSession)
async def create_stocktake(session: StocktakeSession, current_user: User = Depends(get_current_user)):
    await session.create()
    
    if session.status == StocktakeStatus.COMPLETED:
        for item in session.items:
            product = await Product.get(item.productId)
            if product:
                product.quantity = item.actualQuantity
                product.lastUpdated = datetime.now()
                await product.save()
        await create_log(current_user.username, "STOCKTAKE", "Toàn kho", f"Hoàn tất kiểm kê. Chênh lệch: {session.totalDifference}")
    return session

@app.get("/api/movements", response_model=List[MovementLog])
async def get_movements():
    return await MovementLog.find_all().sort("-date").to_list()

@app.post("/api/movements", response_model=MovementLog)
async def create_movement(log: MovementLog, current_user: User = Depends(get_current_user)):
    await log.create()
    await create_log(current_user.username, "MOVE", log.productName, f"Từ {log.fromLocation} -> {log.toLocation}")
    return log

@app.get("/api/logs", response_model=List[SystemLog])
async def get_system_logs(current_user: User = Depends(get_current_user)):
    return await SystemLog.find_all().sort("-timestamp").limit(200).to_list()

# ==========================================
# 8. AI & REPORTS & SEED
# ==========================================

@app.get("/api/ai/analyze", response_model=AIAnalysisResult)
async def analyze_inventory():
    products = await Product.find_all().to_list()
    if not products:
        return AIAnalysisResult(summary="Kho hàng đang trống.", lowStockItems=[], restockRecommendations=[], valueAnalysis="Chưa có dữ liệu.")
    result = await analyze_inventory_service(products)
    return result

@app.post("/api/ai/chat")
async def chat_with_ai(req: ChatRequest):
    products = await Product.find_all().to_list()
    transactions = await Transaction.find_all().sort("-date").to_list()
    answer = await ask_gemini_service(req.question, products, transactions)
    return {"answer": answer}

@app.get("/api/reports/inventory-excel")
async def export_inventory_excel():
    products = await Product.find_all().to_list()
    data = []
    for p in products:
        data.append({
            "Mã SKU": p.sku, "Tên Sản Phẩm": p.name, "Danh Mục": p.category,
            "Vị Trí": p.location, "Số Lượng Tồn": p.quantity,
            "Định Mức Tối Thiểu": p.minStock, "Đơn Giá": p.price,
            "Tổng Giá Trị": p.quantity * p.price
        })
    df = pd.DataFrame(data)
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
        df.to_excel(writer, index=False, sheet_name='TonKho')
    output.seek(0)
    headers = {'Content-Disposition': f'attachment; filename="BaoCao.xlsx"'}
    return StreamingResponse(output, headers=headers, media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')

@app.get("/api/reports/transactions-excel")
async def export_transactions_excel():
    # 1. Lấy dữ liệu
    transactions = await Transaction.find_all().sort("-date").to_list()
    products = await Product.find_all().to_list()
    
    # Tạo từ điển để tra cứu SKU nhanh từ productId
    product_map = {str(p.id): p.sku for p in products}
    
    # 2. Chuyển đổi dữ liệu
    data = []
    total_import = 0
    total_export = 0

    for t in transactions:
        sku = product_map.get(t.productId, "N/A") # Lấy SKU, nếu không có thì N/A
        
        # Dịch loại giao dịch sang Tiếng Việt
        trans_type = "Nhập Kho" if t.type == TransactionType.IMPORT else "Xuất Kho"
        
        # Cộng dồn tổng
        if t.type == TransactionType.IMPORT:
            total_import += t.quantity
        else:
            total_export += t.quantity

        data.append({
            "Ngày Giao Dịch": t.date.strftime("%d/%m/%Y"),
            "Giờ": t.date.strftime("%H:%M"),
            "Loại Phiếu": trans_type,
            "Mã SKU": sku,
            "Tên Sản Phẩm": t.productName,
            "Số Lượng": t.quantity,
            "Đối Tác": t.partner or "",
            "Ghi Chú": t.notes or ""
        })
    
    df = pd.DataFrame(data)
    
    if not data:
        df = pd.DataFrame(columns=["Ngày Giao Dịch", "Loại Phiếu", "Tên Sản Phẩm", "Số Lượng"])

    # 3. Thêm dòng tổng kết
    if len(df) > 0:
        # Dòng trống để cách ra
        df = pd.concat([df, pd.DataFrame([{"Tên Sản Phẩm": ""}])], ignore_index=True)
        
        # Dòng tổng nhập
        df = pd.concat([df, pd.DataFrame([{
            "Tên Sản Phẩm": "TỔNG NHẬP:", 
            "Số Lượng": total_import
        }])], ignore_index=True)
        
        # Dòng tổng xuất
        df = pd.concat([df, pd.DataFrame([{
            "Tên Sản Phẩm": "TỔNG XUẤT:", 
            "Số Lượng": total_export
        }])], ignore_index=True)

    # 4. Xuất file Excel
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
        df.to_excel(writer, index=False, sheet_name='LichSuGiaoDich')
        
        workbook = writer.book
        worksheet = writer.sheets['LichSuGiaoDich']
        
        # Format Header
        header_fmt = workbook.add_format({'bold': True, 'bg_color': '#BDD7EE', 'border': 1})
        worksheet.set_row(0, None, header_fmt)
        
        # Chỉnh độ rộng cột
        worksheet.set_column('A:B', 12) # Ngày giờ
        worksheet.set_column('C:C', 15) # Loại
        worksheet.set_column('D:D', 15) # SKU
        worksheet.set_column('E:E', 30) # Tên SP
        worksheet.set_column('F:F', 10) # Số lượng
        worksheet.set_column('G:G', 25) # Đối tác
        worksheet.set_column('H:H', 30) # Ghi chú

    output.seek(0)
    
    filename = f"BaoCaoNhapXuat_{datetime.now().strftime('%Y%m%d')}.xlsx"
    headers = {'Content-Disposition': f'attachment; filename="{filename}"'}
    return StreamingResponse(output, headers=headers, media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')

# ==========================================
# 9. PARTNERS API
# ==========================================
@app.get("/api/partners", response_model=List[Partner])
async def get_partners():
    return await Partner.find_all().to_list()

@app.post("/api/partners", response_model=Partner)
async def create_partner(partner: Partner):
    await partner.create()
    return partner

@app.put("/api/partners/{id}", response_model=Partner)
async def update_partner(id: str, data: Partner):
    partner = await Partner.get(id)
    if not partner:
        raise HTTPException(404)
    await partner.update({"$set": data.dict(exclude={"id"})})
    return partner

@app.delete("/api/partners/{id}")
async def delete_partner(id: str):
    partner = await Partner.get(id)
    if not partner:
        raise HTTPException(404)
    await partner.delete()
    return {"message": "Deleted"}

# ==========================================
# 10. WARRANTY API
# ==========================================
@app.get("/api/warranty", response_model=List[WarrantyTicket])
async def get_tickets():
    return await WarrantyTicket.find_all().sort("-received_date").to_list()

@app.post("/api/warranty", response_model=WarrantyTicket)
async def create_ticket(ticket: WarrantyTicket):
    # Tự động tạo mã phiếu nếu chưa có (VD: BH + Timestamp)
    # --- THÊM ĐOẠN LOGIC TỰ TẠO MÃ ---
    if not ticket.ticket_code:
        # Tạo mã theo thời gian (VD: BH-231025-1430) -> Không bao giờ trùng
        ticket.ticket_code = f"BH-{datetime.now().strftime('%y%m%d-%H%M%S')}"

    await ticket.create()
    return ticket

@app.put("/api/warranty/{id}", response_model=WarrantyTicket)
async def update_ticket(id: str, data: WarrantyTicket):
    ticket = await WarrantyTicket.get(id)
    if not ticket:
        raise HTTPException(404, "Không tìm thấy phiếu bảo hành")
    
    # Loại bỏ id khỏi dữ liệu update để tránh lỗi đè id
    update_data = data.dict(exclude={"id"})
    
    # Cập nhật ngày trả nếu trạng thái là Đã trả khách
    if data.status == WarrantyStatus.RETURNED and ticket.status != WarrantyStatus.RETURNED:
        update_data['returned_date'] = datetime.now()
        
    await ticket.update({"$set": update_data})
    return ticket

@app.delete("/api/warranty/{id}")
async def delete_ticket(id: str):
    ticket = await WarrantyTicket.get(id)
    if not ticket:
        raise HTTPException(404)
    await ticket.delete()
    return {"message": "Deleted"}

# ==========================================
# 11. TRACEABILITY API (TRA CỨU IMEI)
# ==========================================

@app.get("/api/trace/{imei}")
async def trace_imei(imei: str):
    timeline = []

    # 1. Tìm trong lịch sử Giao dịch (Nhập / Xuất)
    # Lưu ý: Transaction lưu 'imeis' là một danh sách (List)
    # Beanie/MongoDB hỗ trợ tìm kiếm: nếu 'imeis' chứa giá trị 'imei' -> khớp.
    transactions = await Transaction.find({"imeis": imei}).to_list()
    
    for t in transactions:
        action_name = "Nhập Kho" if t.type == TransactionType.IMPORT else "Xuất Kho"
        timeline.append({
            "date": t.date,
            "type": "TRANSACTION",
            "sub_type": t.type, # IMPORT / EXPORT
            "title": f"Giao dịch: {action_name}",
            "description": f"Sản phẩm: {t.productName}. Đối tác: {t.partner or 'Không rõ'}",
            "ref_id": str(t.id)
        })

    # 2. Tìm trong lịch sử Bảo hành
    warranties = await WarrantyTicket.find(WarrantyTicket.imei == imei).to_list()
    
    for w in warranties:
        timeline.append({
            "date": w.received_date,
            "type": "WARRANTY",
            "sub_type": w.status,
            "title": "Tiếp nhận Bảo hành / Sửa chữa",
            "description": f"Khách: {w.customer_name}. Lỗi: {w.issue_description}",
            "ref_id": str(w.id)
        })

    # 3. Sắp xếp theo thời gian (Mới nhất lên đầu)
    timeline.sort(key=lambda x: x["date"], reverse=True)
    
    return timeline

# ==========================================
# 12. SEED DATA API
# ==========================================
@app.get("/api/seed")
async def seed_data():

    if await Product.count() > 0:
        return {"message": "Dữ liệu đã tồn tại."}
        
    products = [
        Product(
            name="MacBook Pro 14 M3", 
            sku="MBP-14-M3", 
            category="Laptop", 
            quantity=10, 
            minStock=3, 
            price=45000000, 
            location="Kệ A-01"
        ),
        Product(
            name="iPhone 15 Pro Max 256GB", 
            sku="IP15PM-256", 
            category="Điện thoại", 
            quantity=25, 
            minStock=5, 
            price=34990000, 
            location="Tủ Kính B-01"
        ),
        Product(
            name="Samsung Galaxy S24 Ultra", 
            sku="SS-S24U", 
            category="Điện thoại", 
            quantity=15, 
            minStock=5, 
            price=31000000, 
            location="Tủ Kính B-02"
        ),
        Product(
            name="Dell XPS 13 Plus", 
            sku="DELL-XPS13", 
            category="Laptop", 
            quantity=8, 
            minStock=2, 
            price=42000000, 
            location="Kệ A-02"
        ),
        Product(
            name="AirPods Pro 2", 
            sku="APP2", 
            category="Phụ kiện", 
            quantity=50, 
            minStock=10, 
            price=5990000, 
            location="Móc treo C-01"
        )
    ]
    
    for p in products:
        await p.create()
    
    return {"message": "Đã tạo dữ liệu Laptop & Điện thoại mẫu thành công!"}
