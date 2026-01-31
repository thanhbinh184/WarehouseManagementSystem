import React, { useState, useEffect } from 'react';
import { Product, Transaction, TransactionType, MovementLog } from '../types';
import { warehouseApi } from '../services/api'; // Import API
import { ArrowRight, Box, CheckCircle, AlertCircle, X, RefreshCw, TrendingUp, Zap, PieChart as PieIcon, History, Calendar, MoveRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';

interface StorageOptimizationProps {
  products: Product[];
  transactions: Transaction[];
  onUpdateProduct: (product: Product) => void;
}

interface MoveSuggestion {
  product: Product;
  currentZone: string;
  idealZone: string;
  velocityScore: number;
  reason: string;
}

const StorageOptimization: React.FC<StorageOptimizationProps> = ({ products, transactions, onUpdateProduct }) => {
  const [activeTab, setActiveTab] = useState<'analysis' | 'history'>('analysis');
  const [suggestions, setSuggestions] = useState<MoveSuggestion[]>([]);
  const [idealZoneStats, setIdealZoneStats] = useState<any[]>([]);
  const [currentZoneStats, setCurrentZoneStats] = useState<any[]>([]);
  const [efficiency, setEfficiency] = useState(0);
  const [moveHistory, setMoveHistory] = useState<MovementLog[]>([]);

  // --- STATE THÔNG BÁO ---
  const [notification, setNotification] = useState<{
    show: boolean;
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Hàm hiển thị thông báo
  const showToast = (type: 'success' | 'error', message: string) => {
    setNotification({ show: true, type, message });
    setTimeout(() => {
      setNotification(null);
    }, 3000);
  };

  // Load lịch sử di chuyển
  useEffect(() => {
    if (activeTab === 'history') {
      const fetchHistory = async () => {
        try {
          const data = await warehouseApi.getMovements();
          setMoveHistory(data);
        } catch (error) {
          console.error("Lỗi lấy lịch sử di chuyển:", error);
          showToast('error', 'Không thể tải lịch sử di chuyển');
        }
      };
      fetchHistory();
    }
  }, [activeTab]);

  // Phân tích kho
  useEffect(() => {
    if (products.length > 0) {
      analyzeWarehouse();
    }
  }, [products, transactions]);

  const analyzeWarehouse = () => {
    // 1. Thống kê hiện tại
    const currentCounts = { A: 0, B: 0, C: 0, Other: 0 };
    products.forEach(p => {
      const zone = p.location ? p.location.charAt(0).toUpperCase() : 'Other';
      if (zone === 'A') currentCounts.A++;
      else if (zone === 'B') currentCounts.B++;
      else if (zone === 'C') currentCounts.C++;
      else currentCounts.Other++;
    });

    setCurrentZoneStats([
      { name: 'Zone A', value: currentCounts.A, color: '#ef4444' },
      { name: 'Zone B', value: currentCounts.B, color: '#f59e0b' },
      { name: 'Zone C', value: currentCounts.C, color: '#3b82f6' },
      { name: 'Khác', value: currentCounts.Other, color: '#94a3b8' },
    ]);

    // 2. Tính tốc độ xuất hàng
    const productVelocity = products.map(p => {
      const exportCount = transactions
        .filter(t => t.productId === p.id && t.type === TransactionType.EXPORT)
        .reduce((sum, t) => sum + t.quantity, 0);
      return { ...p, exportCount };
    });

    productVelocity.sort((a, b) => b.exportCount - a.exportCount);

    const totalItems = productVelocity.length;
    const moves: MoveSuggestion[] = [];
    const idealCounts = { A: 0, B: 0, C: 0 };
    let correctPlacements = 0;

    // 3. Phân tích ABC
    productVelocity.forEach((p, index) => {
      const percentile = (index + 1) / totalItems;
      let idealZone = 'C';
      let reason = 'Hàng bán chậm, nên để ở Zone C (xa cửa)';

      if (percentile <= 0.2) { 
        idealZone = 'A';
        reason = 'Hàng bán chạy (Top 20%), cần chuyển về Zone A (gần cửa)';
      } else if (percentile <= 0.5) {
        idealZone = 'B';
        reason = 'Sức mua trung bình, phù hợp Zone B';
      }

      const currentZone = p.location ? p.location.charAt(0).toUpperCase() : 'Unknown';
      const validZones = ['A', 'B', 'C'];

      if (validZones.includes(idealZone)) idealCounts[idealZone as keyof typeof idealCounts]++;

      if (currentZone !== idealZone && validZones.includes(currentZone)) {
        moves.push({ product: p, currentZone, idealZone, velocityScore: p.exportCount, reason });
      } else if (currentZone === idealZone) {
        correctPlacements++;
      }
    });

    setSuggestions(moves);
    setEfficiency(totalItems > 0 ? Math.round((correctPlacements / totalItems) * 100) : 0);
    setIdealZoneStats([
      { name: 'Zone A (Hot)', count: idealCounts.A, color: '#ef4444' },
      { name: 'Zone B (Warm)', count: idealCounts.B, color: '#f59e0b' },
      { name: 'Zone C (Cold)', count: idealCounts.C, color: '#3b82f6' },
    ]);
  };

  const handleApplyMove = async (suggestion: MoveSuggestion) => {
    const randomShelf = Math.floor(Math.random() * 100) + 1;
    const newLocation = `${suggestion.idealZone}-${randomShelf.toString().padStart(2, '0')}`;

    try {
      const updatedProduct = { 
        ...suggestion.product, 
        location: newLocation, 
        lastUpdated: new Date().toISOString()
      };
      
      await warehouseApi.updateProduct(updatedProduct);

      await warehouseApi.addMovement({
        productId: suggestion.product.id,
        productName: suggestion.product.name,
        sku: suggestion.product.sku,
        fromLocation: suggestion.product.location,
        toLocation: newLocation,
        date: new Date().toISOString()
      });

      onUpdateProduct(updatedProduct);
      setSuggestions(prev => prev.filter(s => s.product.id !== suggestion.product.id));
      setEfficiency(prev => Math.min(100, prev + 1));
      
      // Hiện thông báo thành công
      showToast('success', `Đã chuyển "${suggestion.product.name}" sang vị trí ${newLocation}`);

    } catch (error) {
      console.error("Lỗi khi di chuyển hàng:", error);
      showToast('error', 'Lỗi kết nối! Không thể cập nhật vị trí.');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in relative">
      {/* Header Tabs */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Tối Ưu Vị Trí Kho</h2>
          <p className="text-slate-500">Phân tích tần suất xuất hàng (ABC Analysis) để đề xuất sắp xếp.</p>
        </div>
        
        <div className="flex items-center gap-3 bg-white p-1 rounded-lg border border-slate-200">
           <button
             onClick={() => setActiveTab('analysis')}
             className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
               activeTab === 'analysis' ? 'bg-indigo-100 text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
             }`}
           >
             <Zap size={16} className="inline mr-2"/> Phân Tích
           </button>
           <button
             onClick={() => setActiveTab('history')}
             className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
               activeTab === 'history' ? 'bg-indigo-100 text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
             }`}
           >
             <History size={16} className="inline mr-2"/> Lịch Sử
           </button>
        </div>
      </div>

      {/* Nội dung Tab */}
      {activeTab === 'analysis' ? (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-slate-500 text-sm font-medium">Hiệu Suất Sắp Xếp</p>
                <h3 className={`text-3xl font-bold ${efficiency >= 80 ? 'text-green-600' : efficiency >= 50 ? 'text-amber-500' : 'text-red-500'}`}>
                  {efficiency}%
                </h3>
              </div>
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                <Zap size={24} />
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-slate-500 text-sm font-medium">Cần Di Chuyển</p>
                <h3 className="text-3xl font-bold text-slate-800">{suggestions.length}</h3>
              </div>
              <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                <MoveRight size={24} />
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-slate-500 text-sm font-medium">Hàng Hot (Zone A)</p>
                <h3 className="text-3xl font-bold text-slate-800">{idealZoneStats[0]?.count || 0}</h3>
              </div>
              <div className="p-3 bg-red-50 text-red-600 rounded-xl">
                <TrendingUp size={24} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Charts Section */}
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><PieIcon size={16}/> Hiện Trạng</h3>
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie data={currentZoneStats} innerRadius={40} outerRadius={60} paddingAngle={5} dataKey="value">
                          {currentZoneStats.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                        </Pie>
                        <Tooltip />
                        <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><TrendingUp size={16}/> Mô Hình Lý Tưởng</h3>
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={idealZoneStats} layout="vertical" margin={{ left: 20 }}>
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" width={80} tick={{fontSize: 10}} />
                        <Tooltip />
                        <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={20}>
                          {idealZoneStats.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                        </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Suggestions List */}
            <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col h-[500px]">
              <div className="p-5 border-b border-slate-100 bg-slate-50 rounded-t-2xl flex justify-between items-center">
                <h3 className="font-bold text-lg text-slate-800">Đề Xuất Tối Ưu ({suggestions.length})</h3>
                <button onClick={analyzeWarehouse} className="text-indigo-600 hover:bg-indigo-50 p-2 rounded-lg transition-colors">
                  <RefreshCw size={18} />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {suggestions.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400">
                      <CheckCircle size={48} className="mb-2 text-green-500 opacity-50" />
                      <p>Kho hàng đã được sắp xếp tối ưu!</p>
                  </div>
                ) : (
                  suggestions.map((item, idx) => (
                    <div key={idx} className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-white border border-slate-200 rounded-xl hover:shadow-md transition-all group gap-4">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-white shrink-0
                              ${item.idealZone === 'A' ? 'bg-red-500' : item.idealZone === 'B' ? 'bg-amber-500' : 'bg-blue-500'}
                          `}>
                              {item.idealZone}
                          </div>
                          <div>
                              <h4 className="font-bold text-slate-800">{item.product.name}</h4>
                              <p className="text-xs text-slate-500 flex items-center gap-1">
                                <Box size={12} /> {item.reason}
                              </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between md:justify-end gap-4 min-w-[200px]">
                          <div className="flex items-center gap-2 text-sm font-mono bg-slate-100 px-3 py-1 rounded-full">
                            <span className="text-slate-500 line-through">{item.currentZone}</span>
                            <ArrowRight size={14} className="text-slate-400" />
                            <span className="font-bold text-slate-800">{item.idealZone}</span>
                          </div>
                          <button 
                            onClick={() => handleApplyMove(item)}
                            className="bg-slate-900 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-indigo-600 transition-colors shadow-lg shadow-slate-200"
                          >
                            Di chuyển
                          </button>
                        </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      ) : (
        /* History Tab */
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-slate-50">
             <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
               <History size={20}/> Lịch Sử Di Chuyển Kho
             </h3>
          </div>
          <div className="overflow-x-auto">
             <table className="w-full text-left">
               <thead className="bg-slate-50 border-b border-slate-200">
                 <tr>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Thời Gian</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Sản Phẩm</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-center">Từ Vị Trí</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-center">Đến Vị Trí</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                  {moveHistory.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50">
                       <td className="px-6 py-4 text-slate-600 text-sm">
                          <div className="flex items-center gap-2">
                             <Calendar size={14} className="text-slate-400" />
                             {new Date(log.date).toLocaleString('vi-VN')}
                          </div>
                       </td>
                       <td className="px-6 py-4 font-medium text-slate-800">
                          {log.productName} <span className="text-slate-400 font-normal text-xs ml-1">({log.sku})</span>
                       </td>
                       <td className="px-6 py-4 text-center">
                          <span className="px-2 py-1 bg-red-50 text-red-600 rounded text-xs font-bold border border-red-100">
                            {log.fromLocation}
                          </span>
                       </td>
                       <td className="px-6 py-4 text-center">
                          <span className="px-2 py-1 bg-green-50 text-green-600 rounded text-xs font-bold border border-green-100 flex items-center justify-center gap-1 mx-auto w-fit">
                             {log.toLocation} <CheckCircle size={12} />
                          </span>
                       </td>
                    </tr>
                  ))}
                  {moveHistory.length === 0 && (
                     <tr><td colSpan={4} className="p-8 text-center text-slate-400">Chưa có lịch sử di chuyển nào.</td></tr>
                  )}
               </tbody>
             </table>
          </div>
        </div>
      )}

      {/* --- PHẦN THÔNG BÁO (TOAST) ĐƯỢC ĐẶT RA NGOÀI CÙNG --- */}
      {notification && notification.show && (
        <div className={`
            fixed top-4 right-4 z-[9999] flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border transition-all duration-300 animate-fade-in-left
            ${notification.type === 'success' ? 'bg-white border-green-500 text-green-700' : 'bg-white border-red-500 text-red-700'}
        `}>
            {/* Icon */}
            <div className={`p-2 rounded-full ${notification.type === 'success' ? 'bg-green-100' : 'bg-red-100'}`}>
               {notification.type === 'success' ? <CheckCircle size={20}/> : <AlertCircle size={20}/>}
            </div>
            
            {/* Nội dung */}
            <div>
               <h4 className="font-bold text-sm">
                 {notification.type === 'success' ? 'Thành Công' : 'Thất Bại'}
               </h4>
               <p className="text-xs opacity-90">{notification.message}</p>
            </div>

            {/* Nút đóng */}
            <button 
              onClick={() => setNotification(null)}
              className="ml-2 p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600"
            >
              <X size={16} />
            </button>

            {/* Thanh thời gian chạy */}
            <div className={`absolute bottom-0 left-0 h-1 ${notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'} animate-[width_3s_linear_forwards]`} style={{width: '100%'}}></div>
        </div>
      )}

    </div>
  );
};

export default StorageOptimization;