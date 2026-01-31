import axios from 'axios';
import { 
  Product, 
  Transaction, 
  StocktakeSession, 
  AIAnalysisResult, 
  MovementLog, 
  SystemLog,
  ForecastResult ,
  User,
  Partner,
  WarrantyTicket,
  Brand
} from '../types'; 

const API_URL = 'http://127.0.0.1:8000/api';

const api = axios.create({
  baseURL: API_URL,
});

// Helper: Mongo trả về _id, Frontend dùng id. Hàm này map lại.
const mapId = (item: any) => ({ ...item, id: item._id || item.id });

// Thêm Interceptor: Tự động chèn Token vào mỗi request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('smartwms_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Thêm Interceptor: Nếu gặp lỗi 401 (Hết hạn token) -> Tự đăng xuất
api.interceptors.response.use((response) => response, (error) => {
  if (error.response && error.response.status === 401) {
    localStorage.removeItem('smartwms_token');
    window.location.href = '/'; // Reload về trang login
  }
  return Promise.reject(error);
});

// Định nghĩa kiểu dữ liệu trả về
export interface DashboardStats {
  categoryData: { name: string; value: number }[];
  trendData: { date: string; import: number; export: number }[];
  topProducts: { name: string; quantity: number }[];
}

export interface TimelineEvent {
  date: string;
  type: 'TRANSACTION' | 'WARRANTY';
  sub_type: string;
  title: string;
  description: string;
  ref_id: string;
}

export const warehouseApi = {
  // Hàm lấy thống kê biểu đồ
  getDashboardStats: async (): Promise<DashboardStats> => {
    const response = await api.get('/reports/dashboard-stats');
    return response.data;
  },
  // --- Brands ---
  getBrands: async (): Promise<Brand[]> => {
    const response = await api.get('/brands');
    return response.data.map(mapId);
  },
  addBrand: async (brand: Partial<Brand>): Promise<Brand> => {
    const { id, ...data } = brand;
    const response = await api.post('/brands', data);
    return mapId(response.data);
  },
  updateBrand: async (brand: Brand): Promise<Brand> => {
    const { id, ...data } = brand;
    const response = await api.put(`/brands/${id}`, data);
    return mapId(response.data);
  },
  deleteBrand: async (id: string): Promise<void> => {
    await api.delete(`/brands/${id}`);
  },
  // --- Products ---
  getProducts: async (): Promise<Product[]> => {
    const res = await api.get('/products');
    return res.data.map(mapId);
  },
  addProduct: async (p: Product): Promise<Product> => {
    // Loại bỏ id giả nếu có trước khi gửi
    const { id, ...data } = p; 
    const res = await api.post('/products', data);
    return mapId(res.data);
  },
  updateProduct: async (p: Product): Promise<Product> => {
    const res = await api.put(`/products/${p.id}`, p);
    return mapId(res.data);
  },
  deleteProduct: async (id: string): Promise<void> => {
    await api.delete(`/products/${id}`);
  },

  // Hàm tra cứu IMEI
  traceImei: async (imei: string): Promise<TimelineEvent[]> => {
    const response = await api.get(`/trace/${imei}`);
    return response.data;
  },

  // --- Transactions ---
  getTransactions: async (): Promise<Transaction[]> => {
    const res = await api.get('/transactions');
    return res.data.map(mapId);
  },
  addTransaction: async (t: Transaction): Promise<Transaction> => {
    const { id, ...data } = t;
    const res = await api.post('/transactions', data);
    return mapId(res.data);
  },

  // --- Stocktakes ---
  getStocktakes: async (): Promise<StocktakeSession[]> => {
    const res = await api.get('/stocktakes');
    return res.data.map(mapId);
  },
  saveStocktake: async (s: StocktakeSession): Promise<StocktakeSession> => {
    const { id, ...data } = s;
    const res = await api.post('/stocktakes', data);
    return mapId(res.data);
  },

  // --- Movement Logs ---
  getMovements: async (): Promise<MovementLog[]> => {
    const response = await api.get('/movements');
    return response.data.map(mapId);
  },

  addMovement: async (log: Omit<MovementLog, 'id'>): Promise<MovementLog> => {
    const response = await api.post('/movements', log);
    return mapId(response.data);
  },

  // --- AI ---
  analyzeInventory: async (): Promise<AIAnalysisResult> => {
    const res = await api.get('/ai/analyze');
    return res.data;
  },
  
  // Đã sửa lại đường dẫn (bỏ /api thừa vì baseURL đã có)
  getForecast: async (): Promise<ForecastResult> => {
    const response = await api.get('/ai/forecast'); 
    return response.data;
  },

  // Hàm chat
  chatWithAI: async (question: string): Promise<string> => {
    const response = await api.post('/ai/chat', { question });
    return response.data.answer;
  },

  // --- System Logs ---
  getSystemLogs: async (): Promise<SystemLog[]> => {
    const response = await api.get('/logs');
    return response.data.map(mapId);
  },

  // --- User Management ---
   getUsers: async (): Promise<User[]> => {
    const res = await api.get('/users');
    // Map _id của Mongo sang id cho React dùng
    return res.data.map((u: any) => ({ ...u, id: u._id || u.id }));
  },
  // --- Partners ---
  getPartners: async (): Promise<Partner[]> => {
    const response = await api.get('/partners');
    return response.data.map(mapId);
  },
  addPartner: async (partner: Partial<Partner>): Promise<Partner> => {
    const { id, ...data } = partner;
    const response = await api.post('/partners', data);
    return mapId(response.data);
  },
  updatePartner: async (partner: Partner): Promise<Partner> => {
    const { id, ...data } = partner;
    const response = await api.put(`/partners/${id}`, data);
    return mapId(response.data);
  },
  deletePartner: async (id: string): Promise<void> => {
    await api.delete(`/partners/${id}`);
  },

  // --- Warranty ---
  getTickets: async (): Promise<WarrantyTicket[]> => {
    const response = await api.get('/warranty');
    return response.data.map(mapId);
  },
  addTicket: async (ticket: Partial<WarrantyTicket>): Promise<WarrantyTicket> => {
    const { id, ...data } = ticket;
    const response = await api.post('/warranty', data);
    return mapId(response.data);
  },
  updateTicket: async (ticket: WarrantyTicket): Promise<WarrantyTicket> => {
    const { id, ...data } = ticket;
    const response = await api.put(`/warranty/${id}`, data);
    return mapId(response.data);
  },
  deleteTicket: async (id: string): Promise<void> => {
    await api.delete(`/warranty/${id}`);
  },

  // --- User Profile & Auth ---

  addUser: async (userData: any) => {
    const response = await api.post('/users', userData);
    return response.data;
  },

  updateUser: async (id: string | number, userData: any) => {
    const response = await api.put(`/users/${id}`, userData);
    return response.data;
  },

  deleteUser: async (id: string | number) => {
    const response = await api.delete(`/users/${id}`);
    return response.data;
  },
  getMe: async () => {
    const res = await api.get('/users/me');
    return { ...res.data, id: res.data._id || res.data.id };
  },

  // Cập nhật profile của mình
  updateMe: async (data: { full_name?: string; email?: string }) => {
    const res = await api.put('/users/me', data);
    return res.data;
  },

  // Đổi mật khẩu
  changePassword: async (data: { current_password: string; new_password: string }) => {
    const res = await api.post('/users/change-password', data);
    return res.data;
  }
};