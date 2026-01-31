export enum Category {
  LAPTOP = 'Laptop',
  PHONE = 'Điện thoại',
  //TABLET = 'Máy tính bảng',
  //WATCH = 'Đồng hồ thông minh',
  //ACCESSORY = 'Phụ kiện',
  //COMPONENT = 'Linh kiện'
  }
  
  export interface Product {
    id: string;
    name: string;
    sku: string;
    category: Category | string;
    brand?: string;
    quantity: number;
    imeis?: string[];
    minStock: number;
    price: number;
    location: string;
    lastUpdated: string;
  }
  
  export enum TransactionType {
    IMPORT = 'NHAP',
    EXPORT = 'XUAT'
  }
  
  export interface Transaction {
    id: string;
    productId: string;
    productName: string;
    type: TransactionType;
    quantity: number;
    imeis?: string[];
    partner?: string; // Tên nhà cung cấp hoặc khách hàng
    date: string;
    notes?: string;
  }

export interface MovementLog {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  fromLocation: string;
  toLocation: string;
  date: string;
}
  
  export interface AIAnalysisResult {
    summary: string;
    lowStockItems: string[];
    restockRecommendations: { productName: string; suggestQuantity: number; reason: string }[];
    valueAnalysis: string;
  }
  
  export interface StocktakeItem {
    productId: string;
    productName: string;
    sku: string;
    systemQuantity: number;
    actualQuantity: number;
    difference: number;
    notes?: string;
  }
  
  export interface StocktakeSession {
    id: string;
    date: string;
    items: StocktakeItem[];
    status: 'DRAFT' | 'COMPLETED';
    notes?: string;
    totalDifference: number; // Sum of absolute differences
  }

  export interface ForecastResult {
    summary: string;
    forecasts: {
      productName: string;
      currentStock: number;
      salesLast30Days: number;
      predictedSalesNextMonth: number;
      restockSuggestion: number;
      analysis: string;
    }[];
  } 
  export interface SystemLog {
    id: string;
    username: string;
    action: string;
    target: string;
    details: string;
    timestamp: string;
  }
export interface User {
  id: string | number;
  full_name: string;
  username: string;
  email: string;
  role: 'admin' | 'manager' | 'staff'; 
  password_hash?: string;
}
export interface Brand {
  id: string;
  name: string;
  logo_url?: string;
  description?: string;
}
export interface Partner {
  id: string;
  name: string;
  type: 'supplier' | 'customer';
  phone?: string;
  email?: string;
  address?: string;
  tax_code?: string;
}
export enum WarrantyStatus {
  RECEIVED = "Đã nhận",
  CHECKING = "Đang kiểm tra",
  REPAIRING = "Đang sửa",
  DONE = "Đã xong",
  RETURNED = "Đã trả khách"
}

export interface WarrantyTicket {
  id: string;
  ticket_code: string;
  customer_name: string;
  customer_phone: string;
  product_name: string;
  imei: string;
  issue_description: string;
  status: WarrantyStatus;
  cost: number;
  technician_note?: string;
  received_date: string;
  returned_date?: string;
}