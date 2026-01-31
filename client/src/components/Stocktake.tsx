import React, { useState, useEffect, useRef } from 'react';
import { Product, StocktakeSession, StocktakeItem, Category } from '../types';
import { ClipboardCheck, Save, Download, Plus, Calendar, Check, Search, Filter, History, Scan, X, EyeOff, Eye } from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';

interface StocktakeProps {
  products: Product[];
  stocktakes: StocktakeSession[];
  onSaveStocktake: (session: StocktakeSession) => void;
}

const Stocktake: React.FC<StocktakeProps> = ({ products, stocktakes, onSaveStocktake }) => {
  const [view, setView] = useState<'list' | 'create'>('list');
  const [items, setItems] = useState<StocktakeItem[]>([]);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sessionNotes, setSessionNotes] = useState('');
  const [isBlindCount, setIsBlindCount] = useState(false);
  
  // Scanner State
  const [isScanning, setIsScanning] = useState(false);
  const [lastScannedId, setLastScannedId] = useState<string | null>(null);
  
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  
  // --- THÊM REF NÀY ĐỂ XỬ LÝ "COOLDOWN" (THỜI GIAN CHỜ) ---
  const lastScanTimeRef = useRef<number>(0);

  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.type = 'sine';
      oscillator.frequency.value = 880; 
      gainNode.gain.value = 0.1;
      oscillator.start();
      setTimeout(() => oscillator.stop(), 100);
    } catch (e) {
      console.error("Audio error:", e);
    }
  };

  const handleStartNew = (blindMode: boolean = false) => {
    setIsBlindCount(blindMode);
    const initialItems = products.map(p => ({
      productId: p.id,
      productName: p.name,
      sku: p.sku,
      systemQuantity: p.quantity,
      actualQuantity: blindMode ? 0 : p.quantity,
      difference: blindMode ? -p.quantity : 0,
      notes: ''
    }));
    setItems(initialItems);
    setSessionNotes('');
    setSearchTerm('');
    setFilterCategory('all');
    setLastScannedId(null);
    setView('create');
  };

  // --- LOGIC QUÉT MÃ QR ---
  useEffect(() => {
    if (isScanning && view === 'create') {
      const timer = setTimeout(() => {
        if (scannerRef.current) {
          try { scannerRef.current.clear(); } catch (e) { /* ignore */ }
        }

        const scanner = new Html5QrcodeScanner(
          "reader",
          { 
            fps: 10, 
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
            rememberLastUsedCamera: true
          },
          /* verbose= */ false
        );

        scanner.render(onScanSuccess, onScanFailure);
        scannerRef.current = scanner;
      }, 200);

      return () => {
        clearTimeout(timer);
        if (scannerRef.current) {
          scannerRef.current.clear().catch(err => console.warn("Scanner clear error:", err));
        }
      };
    }
  }, [isScanning, view]);

  // --- HÀM XỬ LÝ KHI QUÉT THÀNH CÔNG (QUAN TRỌNG NHẤT) ---
  const onScanSuccess = (decodedText: string) => {
    const now = Date.now();
    // Nếu chưa qua 1.5 giây kể từ lần quét trước -> Bỏ qua ngay
    if (now - lastScanTimeRef.current < 1500) {
      return; 
    }
    
    // Cập nhật thời gian quét lần này
    lastScanTimeRef.current = now;

    // Chuẩn hóa chuỗi
    const scanCode = decodedText.trim().toLowerCase();

    const productIndex = items.findIndex(item => 
      item.sku.toLowerCase() === scanCode || 
      item.productId === decodedText
    );
    
    if (productIndex !== -1) {
      playBeep();
      setLastScannedId(items[productIndex].productId);
      
      setItems(prev => {
        const newItems = [...prev];
        const item = newItems[productIndex];
        const newQty = item.actualQuantity + 1;
        newItems[productIndex] = {
          ...item,
          actualQuantity: newQty,
          difference: newQty - item.systemQuantity
        };
        return newItems;
      });
      
      // KHÔNG GỌI PAUSE/RESUME NỮA -> TRÁNH LỖI "Cannot pause"
      
    } else {
      console.warn(`Mã không tồn tại: ${decodedText}`);
    }
  };

  const onScanFailure = (error: any) => {
    // Không làm gì để tránh spam log
  };

  const handleStopScanning = () => {
    setIsScanning(false);
    if (scannerRef.current) {
      try {
        scannerRef.current.clear();
      } catch (e) {
        console.warn("Lỗi khi đóng scanner:", e);
      }
      scannerRef.current = null;
    }
  };

  // --- CÁC HÀM XỬ LÝ KHÁC GIỮ NGUYÊN ---

  const handleQuantityChange = (productId: string, actualQty: number) => {
    setItems(prev => prev.map(item => {
      if (item.productId === productId) {
        return {
          ...item,
          actualQuantity: actualQty,
          difference: actualQty - item.systemQuantity
        };
      }
      return item;
    }));
  };

  const handleItemNoteChange = (productId: string, note: string) => {
    setItems(prev => prev.map(item => {
      if (item.productId === productId) {
        return { ...item, notes: note };
      }
      return item;
    }));
  };

  const handleSave = () => {
    const totalDiff = items.reduce((acc, item) => acc + Math.abs(item.difference), 0);
    if (totalDiff > 0) {
      if (!window.confirm(`Phát hiện chênh lệch ${totalDiff} sản phẩm. Cập nhật kho theo số thực tế?`)) return;
    } else {
        if(!window.confirm("Xác nhận hoàn tất kiểm kê?")) return;
    }

    const session: StocktakeSession = {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      items: items,
      status: 'COMPLETED',
      notes: sessionNotes,
      totalDifference: totalDiff
    };

    onSaveStocktake(session);
    setView('list');
  };

  const handleExportReport = (session: StocktakeSession) => {
    const headers = ['Mã Phiếu', 'Ngày', 'Sản Phẩm', 'SKU', 'Tồn Hệ Thống', 'Tồn Thực Tế', 'Chênh Lệch', 'Ghi Chú'];
    const csvContent = [
      headers.join(','),
      ...session.items.map(item => [
        session.id,
        new Date(session.date).toLocaleDateString('vi-VN'),
        `"${item.productName.replace(/"/g, '""')}"`,
        item.sku,
        item.systemQuantity,
        item.actualQuantity,
        item.difference,
        `"${(item.notes || '').replace(/"/g, '""')}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `kiem_ke_${new Date(session.date).toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredItems = items.filter(item => {
    const product = products.find(p => p.id === item.productId);
    const matchesSearch = item.productName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          item.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || (product && product.category === filterCategory);
    return matchesSearch && matchesCategory;
  });

  if (view === 'list') {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Kiểm Kê Kho Hàng</h2>
            <p className="text-slate-500">Lịch sử và quản lý các phiên kiểm kê.</p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => handleStartNew(true)}
              className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg flex items-center gap-2 font-medium shadow-sm transition-colors"
            >
              <EyeOff size={18} /> Đếm Mù
            </button>
            <button 
              onClick={() => handleStartNew(false)}
              className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium shadow-sm transition-colors"
            >
              <Plus size={18} /> Kiểm Kê Nhanh
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          {stocktakes.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center text-slate-400">
              <ClipboardCheck size={48} className="mb-4 text-slate-300" />
              <p>Chưa có phiếu kiểm kê nào.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Ngày</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Tổng SP</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Trạng Thái</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">Hành Động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {stocktakes.map(session => (
                    <tr key={session.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 text-slate-700 font-medium">
                        <div className="flex items-center gap-2">
                          <Calendar size={16} className="text-slate-400" />
                          {new Date(session.date).toLocaleDateString('vi-VN')}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-700">{session.items.length}</td>
                      <td className="px-6 py-4">
                        {session.totalDifference === 0 ? (
                          <span className="text-green-600 bg-green-50 px-2 py-1 rounded text-xs font-bold border border-green-100">Khớp</span>
                        ) : (
                          <span className="text-red-600 bg-red-50 px-2 py-1 rounded text-xs font-bold border border-red-100">Lệch {session.totalDifference}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => handleExportReport(session)}
                          className="text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1 ml-auto"
                        >
                          <Download size={14} /> Xuất
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  }

  // View Create
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
         <div className="flex items-center gap-3">
            <button onClick={() => setView('list')} className="p-2 hover:bg-slate-200 rounded-lg text-slate-500 transition-colors">
              <History size={24} />
            </button>
            <div>
              <h2 className="text-2xl font-bold text-slate-800">Phiếu Kiểm Kê Đang Mở</h2>
              <div className="flex items-center gap-2 text-sm text-slate-500">
                {isBlindCount ? <span className="text-amber-600 font-bold">Đếm mù</span> : <span className="text-blue-600 font-bold">Thông thường</span>}
                <span>• {new Date().toLocaleDateString('vi-VN')}</span>
              </div>
            </div>
         </div>
         
         <div className="flex flex-wrap items-center gap-3">
           <button 
             onClick={() => setIsScanning(true)}
             className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-bold shadow-sm flex items-center gap-2"
           >
             <Scan size={18} /> Quét QR
           </button>

           <input 
             type="text" 
             placeholder="Ghi chú..." 
             className="border border-slate-300 rounded-lg px-4 py-2 text-sm w-full md:w-64 focus:outline-none focus:ring-2 focus:ring-brand-500"
             value={sessionNotes}
             onChange={e => setSessionNotes(e.target.value)}
           />
           <button 
             onClick={handleSave}
             className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-bold shadow-lg shadow-green-500/30 flex items-center gap-2"
           >
             <Save size={18} /> Hoàn Tất
           </button>
         </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Tìm sản phẩm..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div className="relative min-w-[200px]">
           <select 
             className="w-full pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-brand-500"
             value={filterCategory}
             onChange={e => setFilterCategory(e.target.value)}
           >
             <option value="all">Tất cả danh mục</option>
             {Object.values(Category).map(c => <option key={c} value={c}>{c}</option>)}
           </select>
           <Filter size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Sản Phẩm</th>
                <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 uppercase">Hệ Thống</th>
                <th className="px-6 py-4 w-40 text-center text-xs font-bold text-slate-500 uppercase">Thực Tế</th>
                <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 uppercase">Chênh Lệch</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Ghi Chú</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.map(item => {
                const isHighlight = item.productId === lastScannedId;
                const hasDiff = item.difference !== 0;
                return (
                  <tr key={item.productId} className={`transition-colors duration-500 ${isHighlight ? 'bg-indigo-50' : hasDiff ? 'bg-amber-50' : 'hover:bg-slate-50'}`}>
                    <td className="px-6 py-4">
                      <p className={`font-medium ${isHighlight ? 'text-indigo-700' : 'text-slate-800'}`}>{item.productName}</p>
                      <p className="text-xs text-slate-500 font-mono">{item.sku}</p>
                    </td>
                    <td className="px-6 py-4 text-center text-slate-600 font-medium">
                      {item.systemQuantity}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                         <button onClick={() => handleQuantityChange(item.productId, Math.max(0, item.actualQuantity - 1))} className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200">-</button>
                         <input 
                            type="number" min="0"
                            className={`w-16 text-center border rounded-md py-1 font-bold ${isHighlight ? 'border-indigo-300 text-indigo-700 bg-white' : 'border-slate-300 text-slate-800'}`}
                            value={item.actualQuantity}
                            onChange={(e) => handleQuantityChange(item.productId, parseInt(e.target.value) || 0)}
                          />
                          <button onClick={() => handleQuantityChange(item.productId, item.actualQuantity + 1)} className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200">+</button>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {item.difference === 0 ? <Check size={20} className="text-green-500 mx-auto" /> : 
                        <span className="font-bold text-red-600">{item.difference > 0 ? '+' : ''}{item.difference}</span>
                      }
                    </td>
                    <td className="px-6 py-4">
                      <input 
                        type="text" placeholder="..."
                        className="w-full border-b border-slate-200 bg-transparent py-1 text-sm focus:border-brand-500 outline-none"
                        value={item.notes || ''}
                        onChange={(e) => handleItemNoteChange(item.productId, e.target.value)}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* QR Scanner Modal (Overlay) */}
      {isScanning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative animate-fade-in-up">
            <button 
              onClick={handleStopScanning}
              className="absolute top-4 right-4 z-10 p-2 bg-white/20 hover:bg-white/40 rounded-full text-slate-800 hover:text-black transition-colors"
            >
              <X size={24} />
            </button>
            
            <div className="p-6">
              <h3 className="text-xl font-bold text-center text-slate-800 mb-2">Quét Mã QR</h3>
              <p className="text-center text-slate-500 mb-4 text-sm">Đưa mã QR vào khung hình.</p>
              
              <div className="bg-slate-100 rounded-lg overflow-hidden relative min-h-[300px]">
                 <div id="reader" className="w-full h-full"></div>
              </div>

              <div className="mt-4 text-center">
                 <p className="text-xs text-slate-400">Mỗi lần quét thành công: <strong className="text-indigo-600">+1</strong> số lượng.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Stocktake;