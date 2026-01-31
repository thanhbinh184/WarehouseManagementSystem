import React, { useState, useEffect, useRef } from 'react';
import { Product, Transaction, TransactionType, Partner } from '../types';
import { ArrowDownCircle, ArrowUpCircle, Calendar, Plus, Zap, Check, Eye, Printer, X } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { warehouseApi } from '../services/api';
import { useReactToPrint } from 'react-to-print';
import { DeliveryNote } from './DeliveryNote';

interface TransactionsProps {
  products: Product[];
  transactions: Transaction[];
  onAddTransaction: (t: Transaction) => void;
  // Prop nhận dữ liệu từ AI để tự động điền form
  initialData?: { productId: string; quantity: number } | null; 
}

const Transactions: React.FC<TransactionsProps> = ({ products, transactions, onAddTransaction, initialData }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null); // State cho modal chi tiết
  
  // Phân quyền: Manager chỉ xem, Admin/Staff được tạo
  const { isManager, isAdmin, isStaff } = useAuth();
  const canCreate = isAdmin || isStaff;

  // Danh sách đối tác lấy từ API
  const [partners, setPartners] = useState<Partner[]>([]);

  // Ref để in phiếu
  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Phieu_${selectedTransaction?.id}`,
  });

  // Load partners khi component mount
  useEffect(() => {
      const loadPartners = async () => {
          try {
              const data = await warehouseApi.getPartners();
              setPartners(data);
          } catch (e) { console.error("Lỗi tải đối tác:", e); }
      };
      loadPartners();
  }, []);

  // State for Modal Form
  const [newTrans, setNewTrans] = useState<{
    productId: string;
    type: TransactionType;
    quantity: number;
    imeisText: string; // Chuỗi IMEI nhập tay
    partner: string;
    notes: string;
  }>({
    productId: '',
    type: TransactionType.IMPORT,
    quantity: 1,
    imeisText: '',
    partner: '',
    notes: ''
  });

  // State for Quick Entry Form
  const [quickTrans, setQuickTrans] = useState<{
    productId: string;
    type: TransactionType;
    quantity: number;
    partner: string;
    notes: string;
  }>({
    productId: '',
    type: TransactionType.IMPORT,
    quantity: 1,
    partner: '',
    notes: ''
  });

  // Xử lý dữ liệu từ AI chuyển sang
  useEffect(() => {
    if (initialData) {
      setNewTrans({
        productId: initialData.productId,
        type: TransactionType.IMPORT,
        quantity: initialData.quantity,
        imeisText: '',
        partner: '',
        notes: 'Đề xuất nhập hàng từ AI'
      });
      setIsModalOpen(true);
    }
  }, [initialData]);

  // --- HANDLERS ---

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const product = products.find(p => p.id === newTrans.productId);
    if (!product) return;

    // Tách chuỗi IMEI thành mảng
    const imeiList = newTrans.imeisText
      ? newTrans.imeisText.split(/[\n,]+/).map(s => s.trim()).filter(s => s !== '')
      : [];
  
    // Validate số lượng IMEI (Nếu có nhập)
    if (imeiList.length > 0 && imeiList.length !== Number(newTrans.quantity)) {
      alert(`Lỗi: Bạn nhập số lượng là ${newTrans.quantity} nhưng lại điền ${imeiList.length} mã IMEI.`);
      return;
    }

    // Check tồn kho nếu là Xuất
    if (newTrans.type === TransactionType.EXPORT && product.quantity < newTrans.quantity) {
      alert("Lỗi: Không đủ hàng trong kho để xuất!");
      return;
    }

    const transaction: Transaction = {
      id: crypto.randomUUID(), // Backend sẽ bỏ qua ID này
      productId: newTrans.productId,
      productName: product.name,
      type: newTrans.type,
      quantity: Number(newTrans.quantity),
      imeis: imeiList, // Gửi mảng IMEI lên server
      partner: newTrans.partner,
      date: new Date().toISOString(),
      notes: newTrans.notes
    };

    onAddTransaction(transaction);
    setIsModalOpen(false);
    
    // Reset form
    setNewTrans({ 
      productId: '', type: TransactionType.IMPORT, quantity: 1, 
      imeisText: '', partner: '', notes: '' 
    });
  };

  const handleQuickSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const product = products.find(p => p.id === quickTrans.productId);
    if (!product) return;

    if (quickTrans.type === TransactionType.EXPORT && product.quantity < quickTrans.quantity) {
      alert("Không đủ hàng trong kho để xuất!");
      return;
    }

    const transaction: Transaction = {
      id: crypto.randomUUID(),
      productId: quickTrans.productId,
      productName: product.name,
      type: quickTrans.type,
      quantity: Number(quickTrans.quantity),
      partner: quickTrans.partner,
      date: new Date().toISOString(),
      notes: quickTrans.notes
    };

    onAddTransaction(transaction);
    // Reset quick form
    setQuickTrans({ ...quickTrans, productId: '', quantity: 1, partner: '', notes: '' });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Lịch Sử Nhập / Xuất</h2>
          <p className="text-slate-500">Theo dõi dòng chảy hàng hóa và đối tác.</p>
        </div>
        
        {/* Nút Tạo Giao Dịch (Ẩn với Manager) */}
        {canCreate && (
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium shadow-sm transition-colors"
          >
            <Plus size={18} />
            Tạo Giao Dịch
          </button>
        )}
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Loại</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Đối Tác</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Sản Phẩm</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">Số Lượng</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Thời Gian</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">Chi Tiết</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transactions.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wide
                      ${t.type === TransactionType.IMPORT ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}
                    `}>
                      {t.type === TransactionType.IMPORT ? <ArrowDownCircle size={14} /> : <ArrowUpCircle size={14} />}
                      {t.type === TransactionType.IMPORT ? 'NHẬP' : 'XUẤT'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-600 text-sm">
                    {t.partner ? (
                      <span className="font-medium text-slate-800">{t.partner}</span>
                    ) : (
                      <span className="text-slate-400 text-xs italic">N/A</span>
                    )}
                  </td>
                  <td className="px-6 py-4 font-medium text-slate-700">{t.productName}</td>
                  <td className="px-6 py-4 text-right font-mono font-semibold text-slate-800">{t.quantity}</td>
                  <td className="px-6 py-4 text-slate-500 text-sm flex items-center gap-2">
                    <Calendar size={14} />
                    {new Date(t.date).toLocaleString('vi-VN')}
                  </td>
                  
                  {/* Cột Action: Xem Chi Tiết */}
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => setSelectedTransaction(t)}
                      className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      title="Xem chi tiết phiếu"
                    >
                      <Eye size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {transactions.length === 0 && (
             <div className="p-8 text-center text-slate-400">Chưa có giao dịch nào.</div>
          )}
        </div>
      </div>

      {/* Quick Entry Form (Chỉ hiện nếu có quyền)
      {canCreate && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-amber-100 text-amber-600 rounded-lg">
              <Zap size={20} />
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-800">Giao Dịch Nhanh</h3>
              <p className="text-xs text-slate-500">Tạo phiếu nhập/xuất nhanh mà không cần nhập IMEI.</p>
            </div>
          </div>
          
          <form onSubmit={handleQuickSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                // {/* Type Toggle}
                <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Loại</label>
                    <div className="flex bg-slate-100 p-1 rounded-lg">
                      <button
                        type="button"
                        onClick={() => setQuickTrans({...quickTrans, type: TransactionType.IMPORT})}
                        className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${
                          quickTrans.type === TransactionType.IMPORT 
                            ? 'bg-white text-green-600 shadow-sm' 
                            : 'text-slate-400 hover:text-slate-600'
                        }`}
                      >
                        NHẬP
                      </button>
                      <button
                        type="button"
                        onClick={() => setQuickTrans({...quickTrans, type: TransactionType.EXPORT})}
                        className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${
                          quickTrans.type === TransactionType.EXPORT 
                            ? 'bg-white text-red-600 shadow-sm' 
                            : 'text-slate-400 hover:text-slate-600'
                        }`}
                      >
                        XUẤT
                      </button>
                    </div>
                </div>
              // {{/* Partner Input (Select Box) *}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {quickTrans.type === TransactionType.IMPORT ? 'NCC' : 'Khách'}
                  </label>
                  <select 
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                    value={quickTrans.partner} 
                    onChange={e => setQuickTrans({...quickTrans, partner: e.target.value})} 
                  >
                    <option value="">-- Chọn --</option>
                    {partners
                        .filter(p => p.type === (quickTrans.type === TransactionType.IMPORT ? 'supplier' : 'customer'))
                        .map(p => (
                        <option key={p.id} value={p.name}>{p.name}</option>
                        ))
                    }
                  </select>
                </div>

                {/* Product Select *}
                <div className="md:col-span-3">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Sản Phẩm</label>
                    <select 
                      required 
                      className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-brand-500 outline-none bg-slate-50 focus:bg-white transition-colors"
                      value={quickTrans.productId} 
                      onChange={e => setQuickTrans({...quickTrans, productId: e.target.value})}
                    >
                      <option value="">-- Chọn sản phẩm --</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>{p.name} (Tồn: {p.quantity})</option>
                      ))}
                    </select>
                </div>

                {/* Quantity *}
                <div className="md:col-span-1">
                    <label className="block text-sm font-medium text-slate-700 mb-1">SL</label>
                    <input 
                      type="number" 
                      min="1" 
                      required 
                      className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                      value={quickTrans.quantity} 
                      onChange={e => setQuickTrans({...quickTrans, quantity: Number(e.target.value)})}
                    />
                </div>

                {/* Notes *}
                <div className="md:col-span-3">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Ghi Chú</label>
                    <input 
                      type="text" 
                      className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                      placeholder="..."
                      value={quickTrans.notes} 
                      onChange={e => setQuickTrans({...quickTrans, notes: e.target.value})}
                    />
                </div>

                {/* Action Button *}
                <div className="md:col-span-1">
                    <button 
                      type="submit" 
                      className="w-full h-[42px] bg-slate-800 hover:bg-slate-900 text-white rounded-lg transition-colors flex items-center justify-center shadow-lg shadow-slate-300/50"
                      title="Thực hiện giao dịch"
                    >
                        <Check size={20} strokeWidth={3} />
                    </button>
                </div>
              </div>
          </form>
        </div>
      )}

      {/* ================================================= */}
      {/* MODAL TẠO GIAO DỊCH MỚI (FULL) */}
      {/* ================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-fade-in-up flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 shrink-0">
              <h3 className="font-bold text-lg text-slate-800">Tạo Giao Dịch Mới</h3>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <form onSubmit={handleSubmit} className="space-y-4">
                
                {/* Loại Giao Dịch */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Loại Giao Dịch</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" 
                      onClick={() => setNewTrans({...newTrans, type: TransactionType.IMPORT})}
                      className={`py-2 rounded-lg font-medium text-sm border transition-colors ${newTrans.type === TransactionType.IMPORT ? 'bg-green-50 border-green-200 text-green-700' : 'border-slate-200 text-slate-600'}`}>
                      Nhập Kho (Import)
                    </button>
                    <button type="button" 
                      onClick={() => setNewTrans({...newTrans, type: TransactionType.EXPORT})}
                      className={`py-2 rounded-lg font-medium text-sm border transition-colors ${newTrans.type === TransactionType.EXPORT ? 'bg-red-50 border-red-200 text-red-700' : 'border-slate-200 text-slate-600'}`}>
                      Xuất Kho (Export)
                    </button>
                  </div>
                </div>

                {/* Đối Tác (Select Box) */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {newTrans.type === TransactionType.IMPORT ? 'Nhà Cung Cấp' : 'Khách Hàng'}
                  </label>
                  <select 
                    className="w-full border border-slate-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                    value={newTrans.partner} 
                    onChange={e => setNewTrans({...newTrans, partner: e.target.value})} 
                  >
                    <option value="">-- Chọn đối tác --</option>
                    {partners
                        .filter(p => p.type === (newTrans.type === TransactionType.IMPORT ? 'supplier' : 'customer'))
                        .map(p => (
                        <option key={p.id} value={p.name}>{p.name}</option>
                        ))
                    }
                  </select>
                  <p className="text-[10px] text-slate-400 mt-1">Chưa có tên? Vào mục "Đối Tác" để tạo mới.</p>
                </div>

                {/* Sản Phẩm */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Chọn Sản Phẩm</label>
                  <select required className="w-full border border-slate-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                    value={newTrans.productId} onChange={e => setNewTrans({...newTrans, productId: e.target.value})}>
                    <option value="">-- Chọn sản phẩm --</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name} (Tồn: {p.quantity})</option>
                    ))}
                  </select>
                </div>

                {/* Số Lượng */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Số Lượng</label>
                  <input type="number" min="1" required className="w-full border border-slate-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-brand-500"
                    value={newTrans.quantity} onChange={e => setNewTrans({...newTrans, quantity: Number(e.target.value)})} />
                </div>

                {/* IMEI Input */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1 flex justify-between">
                    <span>Danh sách IMEI / Serial</span>
                    <span className="text-xs text-slate-400 font-normal">(Tùy chọn)</span>
                  </label>
                  <textarea 
                    className="w-full border border-slate-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-brand-500 font-mono text-sm"
                    rows={3}
                    placeholder="Quét mã vạch hoặc nhập mỗi dòng 1 mã..."
                    value={newTrans.imeisText}
                    onChange={e => setNewTrans({...newTrans, imeisText: e.target.value})}
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    * Số lượng dòng phải khớp với số lượng nhập ở trên.
                  </p>
                </div>

                {/* Ghi Chú */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Ghi Chú</label>
                  <textarea className="w-full border border-slate-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-brand-500"
                    rows={2} value={newTrans.notes} onChange={e => setNewTrans({...newTrans, notes: e.target.value})} placeholder="..." />
                </div>

                <div className="pt-2 flex justify-end gap-3">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium">Hủy</button>
                  <button type="submit" className="px-6 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-medium">Hoàn Tất</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ================================================= */}
      {/* MODAL XEM CHI TIẾT PHIẾU */}
      {/* ================================================= */}
      {selectedTransaction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden animate-fade-in-up flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                 <div className={`p-2 rounded-lg ${selectedTransaction.type === TransactionType.IMPORT ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {selectedTransaction.type === TransactionType.IMPORT ? <ArrowDownCircle size={20} /> : <ArrowUpCircle size={20} />}
                 </div>
                 <div>
                    <h3 className="font-bold text-lg text-slate-800">
                      Chi Tiết Phiếu {selectedTransaction.type === TransactionType.IMPORT ? 'Nhập Kho' : 'Xuất Kho'}
                    </h3>
                    <p className="text-xs text-slate-500 font-mono">#{selectedTransaction.id}</p>
                 </div>
              </div>
              <button onClick={() => setSelectedTransaction(null)} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
            </div>

            {/* Modal Body */}
            <div className="p-8 overflow-y-auto bg-slate-50/50">
               
               {/* Info Cards */}
               <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                     <p className="text-xs text-slate-400 uppercase font-bold mb-1">Sản Phẩm</p>
                     <p className="font-bold text-slate-800 text-lg">{selectedTransaction.productName}</p>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                     <p className="text-xs text-slate-400 uppercase font-bold mb-1">Số Lượng</p>
                     <p className="font-bold text-indigo-600 text-lg">{selectedTransaction.quantity}</p>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                     <p className="text-xs text-slate-400 uppercase font-bold mb-1">Đối Tác</p>
                     <p className="font-bold text-slate-800">{selectedTransaction.partner || '---'}</p>
                  </div>
               </div>

               {/* IMEI List */}
               <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mb-6">
                  <h4 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
                    Danh sách IMEI / Serial ({selectedTransaction.imeis?.length || 0})
                  </h4>
                  {selectedTransaction.imeis && selectedTransaction.imeis.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                       {selectedTransaction.imeis.map((imei, idx) => (
                         <div key={idx} className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded text-sm font-mono text-slate-600">
                            {imei}
                         </div>
                       ))}
                    </div>
                  ) : (
                    <p className="text-slate-400 italic text-sm">Không có dữ liệu IMEI.</p>
                  )}
               </div>

               {/* Notes */}
               {selectedTransaction.notes && (
                 <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 text-amber-800 text-sm mb-6">
                    <span className="font-bold">Ghi chú:</span> {selectedTransaction.notes}
                 </div>
               )}

               {/* Action Buttons */}
               <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                  <button 
                    onClick={() => setSelectedTransaction(null)}
                    className="px-5 py-2.5 bg-white border border-slate-300 text-slate-700 font-medium rounded-xl hover:bg-slate-50 transition-colors"
                  >
                    Đóng
                  </button>
                  <button 
                    onClick={handlePrint}
                    className="px-5 py-2.5 bg-slate-800 text-white font-medium rounded-xl hover:bg-slate-900 transition-colors flex items-center gap-2 shadow-lg"
                  >
                    <Printer size={18} /> In Phiếu
                  </button>
               </div>

               {/* Hidden Print Component */}
               <div style={{ display: 'none' }}>
                  <DeliveryNote ref={printRef} transaction={selectedTransaction} />
               </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Transactions;