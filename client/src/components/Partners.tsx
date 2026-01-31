import React, { useState, useEffect } from 'react';
import { Partner } from '../types';
import { warehouseApi } from '../services/api';
import { Users, Plus, Edit2, Trash2, Search, Phone, MapPin, Briefcase } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const Partners: React.FC = () => {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const { isAdmin } = useAuth();

  const [formData, setFormData] = useState<Partial<Partner>>({
    name: '', type: 'supplier', phone: '', email: '', address: '', tax_code: ''
  });

  const fetchPartners = async () => {
    try {
      const data = await warehouseApi.getPartners();
      setPartners(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPartners(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (formData.id) {
        await warehouseApi.updatePartner(formData as Partner);
      } else {
        await warehouseApi.addPartner(formData);
      }
      fetchPartners();
      setIsModalOpen(false);
      setFormData({ name: '', type: 'supplier', phone: '', email: '', address: '', tax_code: '' });
    } catch (error) {
      alert("Lỗi lưu đối tác!");
    }
  };

  const handleEdit = (p: Partner) => {
    setFormData(p);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Bạn có chắc chắn muốn xóa đối tác này?")) {
      await warehouseApi.deletePartner(id);
      fetchPartners();
    }
  };

  const filtered = partners.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Đối Tác</h2>
          <p className="text-slate-500">Quản lý Nhà cung cấp & Khách hàng.</p>
        </div>
        <button onClick={() => { setFormData({}); setIsModalOpen(true); }} className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex gap-2 font-medium hover:bg-indigo-700">
          <Plus size={20} /> Thêm Mới
        </button>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input type="text" placeholder="Tìm kiếm đối tác..." className="w-full pl-10 pr-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
            value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
      </div>

      {/* List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(p => (
          <div key={p.id} className="bg-white p-5 rounded-xl border border-slate-200 hover:shadow-md transition-shadow relative group">
            <div className="flex justify-between items-start mb-3">
              <div className={`px-2 py-1 rounded text-xs font-bold ${p.type === 'supplier' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                {p.type}
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleEdit(p)} className="p-1 text-slate-400 hover:text-blue-600"><Edit2 size={16}/></button>
                {isAdmin && <button onClick={() => handleDelete(p.id)} className="p-1 text-slate-400 hover:text-red-600"><Trash2 size={16}/></button>}
              </div>
            </div>
            
            <h3 className="font-bold text-lg text-slate-800 mb-1">{p.name}</h3>
            {p.tax_code && <p className="text-xs text-slate-400 font-mono mb-3">MST: {p.tax_code}</p>}
            
            <div className="space-y-2 text-sm text-slate-600">
              {p.phone && <div className="flex items-center gap-2"><Phone size={14}/> {p.phone}</div>}
              {p.address && <div className="flex items-center gap-2"><MapPin size={14}/> {p.address}</div>}
              {p.email && <div className="flex items-center gap-2"><Briefcase size={14}/> {p.email}</div>}
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 animate-fade-in-up">
            <h3 className="text-xl font-bold mb-4">{formData.id ? 'Cập Nhật' : 'Thêm Đối Tác'}</h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Loại Đối Tác</label>
                <div className="flex bg-slate-100 p-1 rounded-lg">
                  <button type="button" onClick={() => setFormData({...formData, type: 'supplier'})}
                    className={`flex-1 py-2 text-sm rounded ${formData.type === 'supplier' ? 'bg-white shadow text-blue-700' : 'text-slate-500'}`}>Nhà Cung Cấp</button>
                  <button type="button" onClick={() => setFormData({...formData, type: 'customer'})}
                    className={`flex-1 py-2 text-sm rounded ${formData.type === 'customer'? 'bg-white shadow text-green-700' : 'text-slate-500'}`}>Khách Hàng</button>
                </div>
              </div>
              <input required placeholder="Tên đối tác (Công ty/Cá nhân)" className="w-full border p-2 rounded" 
                value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} />
              <input placeholder="Số điện thoại" className="w-full border p-2 rounded" 
                value={formData.phone || ''} onChange={e => setFormData({...formData, phone: e.target.value})} />
              <input placeholder="Email" className="w-full border p-2 rounded" 
                value={formData.email || ''} onChange={e => setFormData({...formData, email: e.target.value})} />
              <input placeholder="Địa chỉ" className="w-full border p-2 rounded" 
                value={formData.address || ''} onChange={e => setFormData({...formData, address: e.target.value})} />
              <input placeholder="Mã số thuế" className="w-full border p-2 rounded" 
                value={formData.tax_code || ''} onChange={e => setFormData({...formData, tax_code: e.target.value})} />
              
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2 border rounded">Hủy</button>
                <button type="submit" className="flex-1 py-2 bg-indigo-600 text-white rounded">Lưu</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Partners;