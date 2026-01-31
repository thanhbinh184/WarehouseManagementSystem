import React, { useState, useEffect } from 'react';
import { Brand } from '../types';
import { warehouseApi } from '../services/api';
import { Tag, Plus, Edit2, Trash2, Search, X, Image as ImageIcon } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const Brands: React.FC = () => {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const { isAdmin } = useAuth();

  // State form có thêm logo_url
  const [formData, setFormData] = useState<Partial<Brand>>({
    name: '', 
    description: '',
    logo_url: ''
  });

  const fetchBrands = async () => {
    try {
      const data = await warehouseApi.getBrands();
      setBrands(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBrands(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (formData.id) {
        await warehouseApi.updateBrand(formData as Brand);
      } else {
        await warehouseApi.addBrand(formData);
      }
      fetchBrands();
      setIsModalOpen(false);
      setFormData({ name: '', description: '', logo_url: '' });
    } catch (error) {
      alert("Lỗi lưu thương hiệu!");
    }
  };

  const handleEdit = (brand: Brand) => {
    setFormData(brand);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Bạn có chắc chắn muốn xóa thương hiệu này?")) {
      await warehouseApi.deleteBrand(id);
      fetchBrands();
    }
  };

  const filtered = brands.filter(b => b.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Thương Hiệu</h2>
          <p className="text-slate-500">Quản lý danh sách các hãng sản xuất.</p>
        </div>
        <button onClick={() => { setFormData({}); setIsModalOpen(true); }} className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex gap-2 font-medium hover:bg-indigo-700">
          <Plus size={20} /> Thêm Mới
        </button>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input type="text" placeholder="Tìm kiếm thương hiệu..." className="w-full pl-10 pr-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
            value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
      </div>

      {/* List */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filtered.map(b => (
          <div key={b.id} className="bg-white p-5 rounded-xl border border-slate-200 hover:shadow-md transition-all group flex flex-col justify-between h-full">
            <div>
                <div className="flex justify-between items-start mb-4">
                    {/* HIỂN THỊ LOGO HOẶC ICON MẶC ĐỊNH */}
                    <div className="w-14 h-14 rounded-xl border border-slate-100 bg-slate-50 flex items-center justify-center overflow-hidden">
                        {b.logo_url ? (
                            <img src={b.logo_url} alt={b.name} className="w-full h-full object-contain p-1" 
                                 onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/50?text=ERR'; }} 
                            />
                        ) : (
                            <Tag size={24} className="text-indigo-400" />
                        )}
                    </div>

                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleEdit(b)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"><Edit2 size={16}/></button>
                        {isAdmin && <button onClick={() => handleDelete(b.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 size={16}/></button>}
                    </div>
                </div>
                
                <h3 className="font-bold text-lg text-slate-800 mb-1">{b.name}</h3>
                <p className="text-xs text-slate-500 line-clamp-2">{b.description || 'Chưa có mô tả'}</p>
            </div>
          </div>
        ))}
        {filtered.length === 0 && !loading && (
            <div className="col-span-full py-10 text-center text-slate-400">Không tìm thấy thương hiệu nào.</div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 animate-fade-in-up">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-slate-800">{formData.id ? 'Cập Nhật' : 'Thêm Thương Hiệu'}</h3>
                <button onClick={() => setIsModalOpen(false)}><X className="text-slate-400 hover:text-slate-600" size={20}/></button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tên Thương Hiệu</label>
                  <input required placeholder="VD: Apple, Samsung..." className="w-full border p-2.5 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" 
                    value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>

              {/* Ô NHẬP LOGO */}
              <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-2">
                    Logo URL <span className="text-xs text-slate-400 font-normal">(Link ảnh trên mạng)</span>
                  </label>
                  <div className="relative">
                    <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                        placeholder="https://example.com/logo.png" 
                        className="w-full pl-9 p-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                        value={formData.logo_url || ''} 
                        onChange={e => setFormData({...formData, logo_url: e.target.value})} 
                    />
                  </div>
                  {/* Preview Logo */}
                  {formData.logo_url && (
                      <div className="mt-2 flex items-center gap-2">
                          <span className="text-xs text-slate-500">Xem trước:</span>
                          <img src={formData.logo_url} alt="Preview" className="w-8 h-8 object-contain border rounded bg-slate-50" />
                      </div>
                  )}
              </div>
              
              <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Mô Tả</label>
                  <textarea placeholder="Ghi chú thêm..." className="w-full border p-2.5 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 h-20 resize-none" 
                    value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} />
              </div>
              
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2.5 border rounded-xl font-medium hover:bg-slate-50">Hủy</button>
                <button type="submit" className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-lg">Lưu</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Brands;