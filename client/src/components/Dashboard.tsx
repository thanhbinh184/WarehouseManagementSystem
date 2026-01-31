import React, { useEffect, useState } from 'react';
import { Product, Transaction, TransactionType  } from '../types';
import { warehouseApi, DashboardStats } from '../services/api';
import { 
  TrendingUp, TrendingDown, AlertTriangle, DollarSign, Package, Activity, 
  ArrowUpRight, ArrowDownRight, Loader2, RefreshCw 
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, 
  PieChart, Pie, AreaChart, Area, Legend 
} from 'recharts';

interface DashboardProps {
  products: Product[];
  transactions: Transaction[];
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const Dashboard: React.FC<DashboardProps> = ({ products, transactions }) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null); // Thêm state lỗi

  // Tính toán các chỉ số tổng quan (Cards) ngay lập tức (Không cần chờ API)
  const totalProducts = products.length;
  const totalStock = products.reduce((acc, p) => acc + p.quantity, 0);
  const totalValue = products.reduce((acc, p) => acc + (p.price * p.quantity), 0);
  const lowStockCount = products.filter(p => p.quantity <= p.minStock).length;

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await warehouseApi.getDashboardStats();
      setStats(data);
    } catch (error) {
      console.error("Lỗi tải biểu đồ:", error);
      setError("Không thể tải dữ liệu biểu đồ.");
      
      // Fallback: Nếu lỗi, tạo dữ liệu rỗng để không bị trắng trang
      setStats({
        categoryData: [],
        trendData: [],
        topProducts: []
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const data = await warehouseApi.getDashboardStats();
        setStats(data);
      } catch (error) {
        console.error("Lỗi tải biểu đồ:", error);
        // Fallback data rỗng để không crash app
        setStats({ categoryData: [], trendData: [], topProducts: [] });
      } finally {
        setLoading(false);
      }
    };
    fetchStats(); // Luôn gọi 1 lần khi mount
  }, [products, transactions]); // Gọi lại khi dữ liệu thay đổi

  // Component Card nhỏ
  const StatCard = ({ title, value, icon: Icon, color, subtext, trend }: any) => (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-all">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-slate-500 text-sm font-medium mb-1">{title}</p>
          <h3 className="text-2xl font-bold text-slate-800">{value}</h3>
        </div>
        <div className={`p-3 rounded-xl ${color} bg-opacity-20`}>
          <Icon size={24} className={color.replace('bg-', 'text-')} />
        </div>
      </div>
      <div className="mt-4 flex items-center text-xs">
        {trend === 'up' && <span className="text-green-500 flex items-center font-bold bg-green-50 px-2 py-0.5 rounded mr-2"><ArrowUpRight size={14}/> Tốt</span>}
        {trend === 'down' && <span className="text-red-500 flex items-center font-bold bg-red-50 px-2 py-0.5 rounded mr-2"><ArrowDownRight size={14}/> Cần chú ý</span>}
        <span className="text-slate-400">{subtext}</span>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
            <h2 className="text-2xl font-bold text-slate-800">Tổng Quan Kho Hàng</h2>
            <p className="text-slate-500">Báo cáo thời gian thực về tài sản và hiệu suất kinh doanh.</p>
        </div>
        <button onClick={fetchStats} className="text-indigo-600 hover:bg-indigo-50 p-2 rounded-lg transition-colors" title="Làm mới">
            <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* 1. Hàng Thống Kê Tổng (Luôn hiển thị được vì tính từ props) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
      <StatCard title="Tổng Sản Phẩm"
       value={totalProducts} icon={Package} 
       color="bg-blue-500" 
       subtext="Đang hoạt động" 
       />
        <StatCard 
          title="Tổng Tài Sản" 
          value={`${(totalValue / 1000000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}M`} 
          icon={DollarSign} 
          color="bg-emerald-100 text-emerald-600"
          subtext="VNĐ (Ước tính)"
          trend="up"
        />
        <StatCard 
          title="Tổng Tồn Kho" 
          value={totalStock} 
          icon={Package} 
          color="bg-blue-100 text-blue-600"
          subtext="Sản phẩm"
        />
        <StatCard 
          title="Sắp Hết Hàng" 
          value={lowStockCount} 
          icon={AlertTriangle} 
          color="bg-amber-100 text-amber-600"
          subtext={lowStockCount > 0 ? "Cần nhập thêm" : "Kho ổn định"}
          trend={lowStockCount > 0 ? 'down' : 'up'}
        />
        <StatCard 
          title="Hoạt Động" 
          value={transactions.length} 
          icon={Activity} 
          color="bg-purple-100 text-purple-600"
          subtext="Giao dịch phát sinh"
        />
      </div>

      {/* 2. Phần Biểu Đồ (Xử lý Loading/Error) */}
      {loading ? (
         <div className="flex items-center justify-center h-64 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
            <Loader2 className="animate-spin text-indigo-600" size={32} />
            <span className="ml-2 text-slate-500">Đang phân tích dữ liệu...</span>
         </div>
      ) : error ? (
         <div className="flex items-center justify-center h-64 bg-red-50 rounded-2xl border border-red-100 text-red-500">
            <AlertTriangle className="mr-2"/> {error}
         </div>
      ) : (
        <>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Xu Hướng Nhập Xuất */}
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <TrendingUp size={20} className="text-indigo-500"/> Xu Hướng Nhập / Xuất (7 Ngày)
                </h3>
                <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={stats?.trendData || []}>
                        <defs>
                        <linearGradient id="colorImport" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorExport" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1}/>
                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                        </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10}/>
                        <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                        <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}} />
                        <Legend verticalAlign="top" height={36}/>
                        <Area type="monotone" dataKey="import" name="Nhập Kho" stroke="#10b981" fillOpacity={1} fill="url(#colorImport)" strokeWidth={3} />
                        <Area type="monotone" dataKey="export" name="Xuất Kho" stroke="#ef4444" fillOpacity={1} fill="url(#colorExport)" strokeWidth={3} />
                    </AreaChart>
                    </ResponsiveContainer>
                </div>
                </div>

                {/* Phân Bổ Danh Mục */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
                <h3 className="text-lg font-bold text-slate-800 mb-2">Cơ Cấu Kho Hàng</h3>
                <div className="flex-1 min-h-[240px] w-full relative">
                    <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                        data={stats?.categoryData || []}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        >
                        {(stats?.categoryData || []).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                        </Pie>
                        <Tooltip />
                    </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="text-center">
                        <span className="text-3xl font-bold text-slate-800">{totalStock}</span>
                        <p className="text-xs text-slate-400 uppercase">Sản phẩm</p>
                    </div>
                    </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                    {(stats?.categoryData || []).slice(0,6).map((entry, index) => (
                    <div key={index} className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{backgroundColor: COLORS[index % COLORS.length]}}></div>
                        <span className="text-slate-600 truncate">{entry.name}</span>
                    </div>
                    ))}
                </div>
                </div>
            </div>

            {/* 3. Hàng Top Sản Phẩm */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <h3 className="text-lg font-bold text-slate-800 mb-6">Top 5 Sản Phẩm Bán Chạy Nhất</h3>
                    <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={stats?.topProducts || []} layout="vertical" margin={{left: 20}}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9"/>
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" width={150} tick={{fontSize: 12}} />
                        <Tooltip cursor={{fill: 'transparent'}} />
                        <Bar dataKey="quantity" name="Đã bán" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={20} />
                        </BarChart>
                    </ResponsiveContainer>
                    </div>
                </div>

                {/* Hoạt động gần đây */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <h3 className="text-lg font-bold text-slate-800 mb-4">Hoạt Động Gần Đây</h3>
                    <div className="space-y-4 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                    {transactions.slice(0, 5).map((t) => (
                        <div key={t.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="flex items-center space-x-3">
                            <div className={`p-2 rounded-lg ${t.type === TransactionType.IMPORT ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                            {t.type === TransactionType.IMPORT ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                            </div>
                            <div>
                            <p className="text-sm font-bold text-slate-800 line-clamp-1">{t.productName}</p>
                            <p className="text-[10px] text-slate-500">{new Date(t.date).toLocaleDateString('vi-VN')}</p>
                            </div>
                        </div>
                        <span className={`text-sm font-bold ${t.type === TransactionType.IMPORT ? 'text-green-600' : 'text-red-600'}`}>
                        {t.type === TransactionType.IMPORT ? '+' : '-'}{t.quantity}
                        </span>
                        </div>
                    ))}
                    {transactions.length === 0 && <p className="text-slate-400 text-center text-sm">Chưa có giao dịch nào</p>}
                    </div>
                </div>
            </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;