from typing import List, Optional
from enum import Enum
from datetime import datetime
from beanie import Document
from pydantic import BaseModel, EmailStr, Field

# 1. ENUMS 
class Category(str, Enum):
    LAPTOP = 'Laptop'
    PHONE = 'Điện thoại'
    #TABLET = 'Máy tính bảng'
    #WATCH = 'Đồng hồ thông minh'
    #ACCESSORY = 'Phụ kiện' # (Sạc, cáp, tai nghe...)
    #COMPONENT = 'Linh kiện' # (RAM, SSD...)


class TransactionType(str, Enum):
    IMPORT = 'NHAP'
    EXPORT = 'XUAT'

class StocktakeStatus(str, Enum):
    DRAFT = 'DRAFT'
    COMPLETED = 'COMPLETED'

# 2. MODELS

class Role(str, Enum):
    ADMIN = "admin"       # Toàn quyền
    MANAGER = "manager"   # Xem báo cáo, không được xóa
    STAFF = "staff"       # Chỉ nhập xuất

class User(Document):
    username: str # Dùng để đăng nhập
    email: str
    password_hash: str # Mật khẩu đã mã hóa (KHÔNG LƯU MẬT KHẨU GỐC)
    full_name: str
    role: Role = Role.STAFF
    disabled: bool = False

    class Settings:
        name = "users"  # Tên collection trong MongoDB

# Model cho Thương hiệu (Collection: brands)
class Brand(Document):
    name: str           # Tên thương hiệu (Apple, Samsung, Dell...)
    logo_url: Optional[str] = None # (Tùy chọn) Link ảnh logo
    description: Optional[str] = None # Mô tả thêm (nếu có)
    
    class Settings:
        name = "brands"

# Model cho Sản phẩm (Collection: products)
class Product(Document):
    name: str
    sku: str
    category: Category  # Sử dụng Enum Category ở trên
    brand: Optional[str] = None 
    quantity: int = 0
    imeis: List[str] = Field(default_factory=list) 
    minStock: int = 0
    price: float = 0.0
    location: str
    lastUpdated: datetime = Field(default_factory=datetime.now)

    class Settings:
        name = "products"  # Tên collection trong MongoDB
    
    class Config:
        # Cho phép map dữ liệu dù tên trường là camelCase (frontend) hay snake_case
        populate_by_name = True
        json_encoders = {datetime: lambda v: v.isoformat()}

# Model cho Giao dịch (Collection: transactions)
class Transaction(Document):
    productId: str
    productName: str
    type: TransactionType # Sử dụng Enum TransactionType
    quantity: int
    imeis: List[str] = Field(default_factory=list)
    partner: Optional[str] = None # (Lưu tên NCC hoặc Khách hàng)
    date: datetime = Field(default_factory=datetime.now)
    notes: Optional[str] = None

    class Settings:
        name = "transactions"
    
    class Config:
        populate_by_name = True
        json_encoders = {datetime: lambda v: v.isoformat()}

# Model cho Đối tác (Collection: partners)
class PartnerType(str, Enum):
    SUPPLIER = "supplier"  # Nhà cung cấp
    CUSTOMER = "customer"  # Khách hàng

class Partner(Document):
    name: str               # Tên (VD: FPT Trading)
    type: PartnerType       # Loại
    phone: Optional[str]    # SĐT
    email: Optional[str] = None
    address: Optional[str] = None
    tax_code: Optional[str] = None # Mã số thuế
    note: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.now)

    class Settings:
        name = "partners"

# Model cho quản lý phiếu bảo hành/sửa chữa (Collection: warranty_tickets)
class WarrantyStatus(str, Enum):
    RECEIVED = "Đã nhận"        # Mới nhận máy từ khách
    CHECKING = "Đang kiểm tra"  # Kỹ thuật đang test
    REPAIRING = "Đang sửa"      # Đang thay thế linh kiện
    DONE = "Đã xong"            # Sửa xong, chờ khách lấy
    RETURNED = "Đã trả khách"   # Khách đã lấy máy

class WarrantyTicket(Document):
    ticket_code: Optional[str] = None        # Mã phiếu (VD: BH-241001)
    customer_name: str      # Tên khách
    customer_phone: str     # SĐT khách
    product_name: str       # Tên máy (VD: iPhone 13 Pro)
    imei: str               # IMEI máy
    issue_description: str  # Mô tả lỗi (VD: Loa rè, Màn sọc)
    status: WarrantyStatus = WarrantyStatus.RECEIVED
    cost: float = 0         # Chi phí sửa chữa (nếu có)
    technician_note: Optional[str] = None # Ghi chú của kỹ thuật viên
    
    received_date: datetime = Field(default_factory=datetime.now)
    returned_date: Optional[datetime] = None

    class Settings:
        name = "warranty_tickets"
    
    class Config:
        json_encoders = {datetime: lambda v: v.isoformat()}

# Model con (Embedded) dùng trong StocktakeSession, không tạo collection riêng
class StocktakeItem(BaseModel):
    productId: str
    productName: str
    sku: str
    systemQuantity: int
    actualQuantity: int
    difference: int
    notes: Optional[str] = None

# Model cho Phiếu kiểm kê (Collection: stocktakes)
class StocktakeSession(Document):
    date: datetime = Field(default_factory=datetime.now)
    items: List[StocktakeItem] # Chứa danh sách các item bên trên
    status: StocktakeStatus # Sử dụng Enum StocktakeStatus
    notes: Optional[str] = None
    totalDifference: int = 0

    class Settings:
        name = "stocktakes"
    
    class Config:
        populate_by_name = True
        json_encoders = {datetime: lambda v: v.isoformat()}

# Model lưu lịch sử di chuyển kho
class MovementLog(Document):
    productId: str
    productName: str
    sku: str
    fromLocation: str
    toLocation: str
    date: datetime = Field(default_factory=datetime.now)

    class Settings:
        name = "movement_logs"
    
    class Config:
        populate_by_name = True
        json_encoders = {datetime: lambda v: v.isoformat()}


# --- AI Response Models ---
class RestockRecommendation(BaseModel):
    productName: str
    suggestQuantity: int
    reason: str

class AIAnalysisResult(BaseModel):
    summary: str
    lowStockItems: List[str]
    restockRecommendations: List[RestockRecommendation]
    valueAnalysis: str

class SystemLog(Document):
    username: str       # Ai làm? (VD: admin)
    action: str         # Hành động gì? (CREATE, UPDATE, DELETE, LOGIN)
    target: str         # Đối tượng nào? (Sản phẩm A, Đơn hàng B)
    details: str        # Chi tiết (VD: Sửa giá từ 10k -> 20k)
    timestamp: datetime = Field(default_factory=datetime.now)

    class Settings:
        name = "system_logs"
    
    class Config:
        json_encoders = {datetime: lambda v: v.isoformat()}

class User(Document):
    username: str
    email: EmailStr
    full_name: str
    role: str = "staff" # admin, manager, staff
    password_hash: str
    created_at: datetime = Field(default_factory=datetime.now)

    class Settings:
        name = "users" # Tên collection trong MongoDB

# Schema dùng để Update (nhận từ Frontend)
class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[str] = None
    password: Optional[str] = None # Nếu có thì đổi pass, không thì thôi

# Schema dùng để tạo mới
class UserCreate(BaseModel):
    username: str
    email: EmailStr
    full_name: str
    role: str
    password: str
# # --- Forecast Models ---
# class ForecastItem(BaseModel):
#     productName: str
#     currentStock: int
#     salesLast30Days: int
#     predictedSalesNextMonth: int # AI dự đoán
#     restockSuggestion: int       # AI khuyên nhập thêm
#     analysis: str                # Lý do

# class ForecastResult(BaseModel):
#     summary: str
#     forecasts: List[ForecastItem]