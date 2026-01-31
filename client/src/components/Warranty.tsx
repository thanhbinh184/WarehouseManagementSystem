import React, { useState, useEffect } from 'react';
import { WarrantyTicket, WarrantyStatus } from '../types';
import { warehouseApi } from '../services/api';
import { Wrench, Plus, Edit2, Search, CheckCircle, Clock, Smartphone, User, FileText } from 'lucide-react';

const Warranty: React.FC = () => {
  const [tickets, setTickets] = useState<WarrantyTicket[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // KHỞI TẠO STATE CHUẨN (Tránh null/undefined)
  const [formData, setFormData] = useState<Partial<WarrantyTicket>>({
    customer_name: '', 
    customer_phone: '', 
    product_name: '', 
    imei: '',
    issue_description: '', 
    status: WarrantyStatus.RECEIVED, 
    cost: 0, 
    technician_note: '' // Phải có trường này rỗng, không được để undefined
  });

  const fetchTickets = async () => {
    try {
      const data = await warehouseApi.getTickets();
      setTickets(data);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchTickets(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (formData.id) {
        // Update: Cần ép kiểu đầy đủ
        await warehouseApi.updateTicket(formData as WarrantyTicket);
      } else {
        // Create
        await warehouseApi.addTicket(formData);
      }
      
      fetchTickets();
      setIsModalOpen(false);
      // Reset form về chuỗi rỗng
      setFormData({ 
        customer_name: '', customer_phone: '', product_name: '', imei: '',
        issue_description: '', status: WarrantyStatus.RECEIVED, cost: 0, technician_note: '' 
      });
    } catch (e) { 
        console.error(e);
        alert("Lỗi lưu phiếu! Kiểm tra lại thông tin."); 
    }
  };

  const getStatusColor = (status: WarrantyStatus) => {
    switch (status) {
      case WarrantyStatus.RECEIVED: return 'bg-gray-100 text-gray-600';
      case WarrantyStatus.CHECKING: return 'bg-blue-100 text-blue-600';
      case WarrantyStatus.REPAIRING: return 'bg-yellow-100 text-yellow-600';
      case WarrantyStatus.DONE: return 'bg-green-100 text-green-600';
      case WarrantyStatus.RETURNED: return 'bg-slate-200 text-slate-500 line-through';
      default: return 'bg-gray-100';
    }
  };

  const filtered = tickets.filter(t => 
    t.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.imei.includes(searchTerm) ||
    t.product_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Bảo Hành & Sửa Chữa</h2>
          <p className="text-slate-500">Quản lý phiếu tiếp nhận bảo hành của khách hàng.</p>
        </div>
        <button onClick={() => { 
            // Reset form khi mở modal tạo mới
            setFormData({
                customer_name: '', customer_phone: '', product_name: '', imei: '',
                issue_description: '', status: WarrantyStatus.RECEIVED, cost: 0, technician_note: ''
            }); 
            setIsModalOpen(true); 
        }} 
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex gap-2 font-medium hover:bg-indigo-700">
          <Plus size={20} /> Tạo Phiếu Mới
        </button>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input type="text" placeholder="Tìm theo Tên khách, IMEI hoặc Tên máy..." 
            className="w-full pl-10 pr-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
            value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
      </div>

      {/* List View */}
      <div className="grid grid-cols-1 gap-4">
        {filtered.map(t => (
          <div key={t.id} className="bg-white p-5 rounded-xl border border-slate-200 hover:shadow-md transition-all flex flex-col md:flex-row justify-between gap-4">
            
            {/* Info Left */}
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(t.status)}`}>
                  {t.status}
                </span>
                <span className="text-slate-400 text-xs font-mono">{t.ticket_code}</span>
                <span className="text-slate-400 text-xs flex items-center gap-1"><Clock size={12}/> {new Date(t.received_date).toLocaleDateString('vi-VN')}</span>
              </div>
              
              <div className="flex items-start gap-4">
                 <div>
                    <h3 className="font-bold text-lg text-slate-800">{t.product_name}</h3>
                    <p className="text-sm text-slate-500 font-mono">IMEI: {t.imei}</p>
                 </div>
              </div>

              <div className="flex items-center gap-6 text-sm text-slate-600 mt-2">
                 <div className="flex items-center gap-2"><User size={16} className="text-indigo-500"/> {t.customer_name} ({t.customer_phone})</div>
                 <div className="flex items-center gap-2"><FileText size={16} className="text-red-500"/> Lỗi: {t.issue_description}</div>
              </div>
            </div>

            {/* Info Right & Action */}
            <div className="flex flex-col items-end justify-between gap-4 min-w-[150px]">
               <div className="text-right">
                  <p className="text-xs text-slate-400 uppercase">Chi phí dự kiến</p>
                  <p className="text-xl font-bold text-slate-800">{t.cost.toLocaleString()} đ</p>
               </div>
               <button onClick={() => { 
                   // Set form data khi sửa, đảm bảo technician_note không bị null
                   setFormData({
                       ...t,
                       technician_note: t.technician_note || '' 
                   }); 
                   setIsModalOpen(true); 
               }} 
                 className="flex items-center gap-2 text-indigo-600 hover:bg-indigo-50 px-3 py-2 rounded-lg text-sm font-medium transition-colors">
                 <Edit2 size={16} /> Cập nhật
               </button>
            </div>

          </div>
        ))}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-2xl p-6 animate-fade-in-up max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4 border-b pb-2">{formData.id ? 'Cập Nhật Phiếu' : 'Tiếp Nhận Bảo Hành'}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Thông tin Khách */}
                <div className="space-y-3">
                   <h4 className="font-bold text-sm text-slate-500 uppercase">Khách Hàng</h4>
                   <input required placeholder="Tên khách hàng" className="w-full border p-2.5 rounded-lg text-sm" 
                     value={formData.customer_name || ''} 
                     onChange={e => setFormData({...formData, customer_name: e.target.value})} />
                   <input required placeholder="Số điện thoại" className="w-full border p-2.5 rounded-lg text-sm" 
                     value={formData.customer_phone || ''} 
                     onChange={e => setFormData({...formData, customer_phone: e.target.value})} />
                </div>

                {/* Thông tin Máy */}
                <div className="space-y-3">
                   <h4 className="font-bold text-sm text-slate-500 uppercase">Thiết Bị</h4>
                   <input required placeholder="Tên máy (VD: iPhone 13)" className="w-full border p-2.5 rounded-lg text-sm" 
                     value={formData.product_name || ''} 
                     onChange={e => setFormData({...formData, product_name: e.target.value})} />
                   <input required placeholder="IMEI / Serial Number" className="w-full border p-2.5 rounded-lg text-sm font-mono" 
                     value={formData.imei || ''} 
                     onChange={e => setFormData({...formData, imei: e.target.value})} />
                </div>
              </div>

              {/* Tình trạng & Mô tả */}
              <div>
                 <label className="block text-sm font-medium mb-1">Mô tả lỗi của khách</label>
                 <textarea required className="w-full border p-2.5 rounded-lg text-sm" rows={2}
                   value={formData.issue_description || ''} 
                   onChange={e => setFormData({...formData, issue_description: e.target.value})} />
              </div>

              {/* Chỉ hiện phần này khi Cập nhật (Sửa chữa) */}
              {formData.id && (
                <div className="bg-slate-50 p-4 rounded-xl space-y-4 border border-slate-200">
                   <h4 className="font-bold text-sm text-indigo-600 uppercase flex items-center gap-2"><Wrench size={16}/> Kỹ Thuật Viên Xử Lý</h4>
                   
                   <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Trạng thái hiện tại</label>
                        <select className="w-full border p-2.5 rounded-lg text-sm bg-white"
                          value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as WarrantyStatus})}>
                          {Object.values(WarrantyStatus).map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Chi phí sửa chữa</label>
                        <input type="number" className="w-full border p-2.5 rounded-lg text-sm" 
                          value={formData.cost} onChange={e => setFormData({...formData, cost: Number(e.target.value)})} />
                      </div>
                   </div>
                   
                   <div>
                      <label className="block text-sm font-medium mb-1">Ghi chú kỹ thuật / Linh kiện thay thế</label>
                      <textarea className="w-full border p-2.5 rounded-lg text-sm" rows={2} placeholder="Đã thay pin, vệ sinh máy..."
                        value={formData.technician_note || ''} // Handle null here
                        onChange={e => setFormData({...formData, technician_note: e.target.value})} />
                   </div>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 border rounded-xl font-medium hover:bg-slate-50">Hủy</button>
                <button type="submit" className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-lg">
                  {formData.id ? 'Cập Nhật Trạng Thái' : 'Tạo Phiếu Tiếp Nhận'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Warranty;