import React, { useState, useRef, useEffect } from 'react';
import { Product, Category, Brand } from '../types';
import { Search, Plus, Filter, AlertCircle, Edit2, Trash2, MapPin, X, Package, Hash, DollarSign, Calendar, Layers, Tag, Download, ChevronLeft, ChevronRight, Printer, Container, Smartphone, List, Search as SearchIcon } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { useReactToPrint } from 'react-to-print';
import { ProductLabel } from './ProductLabel';
import { useAuth } from '../hooks/useAuth';
import { warehouseApi } from '../services/api';
// Import component Tra cứu (Đảm bảo bạn đã tạo file Traceability.tsx ở bước trước)
import Traceability from './Traceability'; 

interface InventoryProps {
  products: Product[];
  onAddProduct: (p: Product) => void;
  onUpdateProduct: (p: Product) => void;
  onDeleteProduct: (id: string) => void;
  onNavigateToOptimization?: () => void;
}

const ITEMS_PER_PAGE = 50;

const Inventory: React.FC<InventoryProps> = ({ products, onAddProduct, onUpdateProduct, onDeleteProduct, onNavigateToOptimization }) => {
  // --- STATE QUẢN LÝ TAB CON ---
  const [viewMode, setViewMode] = useState<'list' | 'trace'>('list');

  // --- CÁC STATE CŨ CỦA INVENTORY ---
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  
  const qrRef = useRef<HTMLDivElement>(null);
  const printRef = useRef<HTMLDivElement>(null);
  
  const { isAdmin } = useAuth();
  const [brands, setBrands] = useState<Brand[]>([]);

  // Load brands
  useEffect(() => {
    const fetchBrands = async () => {
      try {
        const data = await warehouseApi.getBrands();
        setBrands(data);
      } catch (error) { console.error(error); }
    };
    fetchBrands();
  }, []);

  // Form State
  const [newProduct, setNewProduct] = useState<Partial<Product>>({
    category: Category.LAPTOP,
    minStock: 10,
    quantity: 0,
    price: 0,
    brand: ''
  });

  const [imeiInput, setImeiInput] = useState(''); 

  const handlePrint = useReactToPrint({
    contentRef: printRef, 
    documentTitle: `Tem_${selectedProduct?.sku}`,
  });

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || p.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const currentTableData = filteredProducts.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1); 
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilterCategory(e.target.value);
    setCurrentPage(1); 
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const resetForm = () => {
    setNewProduct({
      category: Category.LAPTOP,
      minStock: 10,
      quantity: 0,
      price: 0,
      name: '',
      sku: '',
      location: '',
      brand: ''
    });
    setImeiInput('');
  };

  const handleOpenAddModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleEditClick = (product: Product) => {
    setNewProduct({ ...product });
    setImeiInput(product.imeis ? product.imeis.join('\n') : '');
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const processedImeis = imeiInput ? imeiInput.split(/[\n,]+/).map(s => s.trim()).filter(s => s !== '') : [];
    const finalQuantity = processedImeis.length > 0 ? processedImeis.length : Number(newProduct.quantity);

    if (newProduct.name && newProduct.sku) {
      if (newProduct.id) {
        const updatedProduct: Product = {
          ...newProduct as Product,
          quantity: finalQuantity,
          imeis: processedImeis,
          lastUpdated: new Date().toISOString()
        };
        onUpdateProduct(updatedProduct);
      } else {
        const productToAdd: any = {
          name: newProduct.name,
          sku: newProduct.sku,
          category: newProduct.category || Category.LAPTOP,
          brand: newProduct.brand || '',
          quantity: finalQuantity,
          minStock: Number(newProduct.minStock),
          price: Number(newProduct.price),
          location: newProduct.location || 'Kho A',
          imeis: processedImeis,
          lastUpdated: new Date().toISOString()
        };
        onAddProduct(productToAdd);
      }
      setIsModalOpen(false);
      resetForm();
    }
  };

  const handleDeleteClick = (id: string, name: string) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa sản phẩm "${name}" không?`)) {
      onDeleteProduct(id);
    }
  };

  const handleExportCSV = () => {
    const headers = ['ID', 'Tên Sản Phẩm', 'SKU', 'Danh Mục', 'Thương Hiệu', 'Vị Trí', 'Số Lượng','Mã IMEI', 'Giá (VNĐ)', 'Tồn Kho Tối Thiểu', 'Cập Nhật Lần Cuối'];
    const csvContent = [
      headers.join(','),
      ...filteredProducts.map(p => {
        return [
          `"${p.id}"`, `"${p.name.replace(/"/g, '""')}"`, `"${p.sku}"`, `"${p.category}"`, `"${p.brand || ''}"`, `"${p.location}"`,
          p.quantity, `"${(p.imeis || []).join(';')}"`, p.price, p.minStock, `"${p.lastUpdated}"`
        ].join(',');
      })
    ].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `inventory.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* --- HEADER CHUYỂN TAB --- */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Quản Lý Kho Hàng</h2>
          <p className="text-slate-500">Quản lý sản phẩm và tra cứu lịch sử IMEI.</p>
        </div>
        
        {/* Nút chuyển chế độ xem */}
        <div className="bg-white p-1 rounded-xl border border-slate-200 flex shadow-sm">
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                viewMode === 'list' 
                  ? 'bg-slate-800 text-white shadow-md' 
                  : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              <List size={18} />
              Danh Sách
            </button>
            <button
              onClick={() => setViewMode('trace')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                viewMode === 'trace' 
                  ? 'bg-indigo-600 text-white shadow-md' 
                  : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              <SearchIcon size={18} />
              Tra Cứu IMEI
            </button>
        </div>
      </div>

      {/* --- NỘI DUNG CHÍNH --- */}
      {viewMode === 'trace' ? (
        // HIỂN THỊ COMPONENT TRA CỨU
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-1">
           <Traceability />
        </div>
      ) : (
        // HIỂN THỊ DANH SÁCH SẢN PHẨM 
        <>
          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            {onNavigateToOptimization && (
              <button onClick={onNavigateToOptimization} className="bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800 px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition-colors shadow-sm hidden md:flex">
                <Container size={18} /> Tối Ưu Vị Trí
              </button>
            )}
            <button onClick={handleExportCSV} className="bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 px-4 py-2 rounded-lg flex items-center gap-2 font-medium shadow-sm">
              <Download size={18} /> Xuất CSV
            </button>
            <button onClick={handleOpenAddModal} className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium shadow-sm">
              <Plus size={18} /> Thêm Sản Phẩm
            </button>
          </div>

          {/* Lọc và tìm kiếm */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input type="text" placeholder="Tìm kiếm theo tên hoặc mã SKU..." value={searchTerm} onChange={handleSearchChange} className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all" />
            </div>
            <div className="flex items-center gap-2 min-w-[200px]">
              <div className="relative w-full">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Filter size={18} className="text-slate-400" /></div>
                <select value={filterCategory} onChange={handleCategoryChange} className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500 appearance-none cursor-pointer">
                  <option value="all">Tất cả danh mục</option>
                  {Object.values(Category).map((cat) => (<option key={cat} value={cat}>{cat}</option>))}
                </select>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Sản Phẩm</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">SKU</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Danh Mục</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Thương Hiệu</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Vị Trí</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Tồn Kho</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Giá Trị</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Trạng Thái</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Hành Động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {currentTableData.map((product) => {
                    const isLowStock = product.quantity <= product.minStock;
                    return (
                      <tr key={product.id} onClick={() => setSelectedProduct(product)} className="hover:bg-slate-50 transition-colors group cursor-pointer">
                        <td className="px-6 py-4 font-medium text-slate-800">{product.name}</td>
                        <td className="px-6 py-4 text-slate-500 font-mono text-sm">{product.sku}</td>
                        <td className="px-6 py-4 text-slate-600"><span className="bg-slate-100 px-2 py-1 rounded text-xs font-medium">{product.category}</span></td>
                        <td className="px-6 py-4 text-slate-600"><span className="font-medium">{product.brand || '-'}</span></td>
                        <td className="px-6 py-4 text-slate-600"><div className="flex items-center gap-1.5"><MapPin size={14} className="text-slate-400" /> <span className="text-sm font-medium">{product.location}</span></div></td>
                        <td className="px-6 py-4 text-right font-semibold text-slate-700">{product.quantity}</td>
                        <td className="px-6 py-4 text-right text-slate-600">{(product.price).toLocaleString('vi-VN')} đ</td>
                        <td className="px-6 py-4 text-center">
                          {isLowStock ? <div className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-full border border-amber-100"><AlertCircle size={12} /> Low Stock</div> : <div className="inline-flex items-center gap-1 text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full border border-green-100">In Stock</div>}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button onClick={(e) => { e.stopPropagation(); handleEditClick(product); }} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Edit2 size={16} /></button>
                            {isAdmin && <button onClick={(e) => { e.stopPropagation(); handleDeleteClick(product.id, product.name); }} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16} /></button>}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            
            {/* Phân trang */}
            {filteredProducts.length > 0 && (
              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
                <div className="text-sm text-slate-500">Hiển thị {startIndex + 1}-{Math.min(startIndex + ITEMS_PER_PAGE, filteredProducts.length)} trên {filteredProducts.length}</div>
                <div className="flex items-center gap-2">
                  <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} className="p-2 border rounded bg-white hover:bg-slate-50 disabled:opacity-50"><ChevronLeft size={16} /></button>
                  <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} className="p-2 border rounded bg-white hover:bg-slate-50 disabled:opacity-50"><ChevronRight size={16} /></button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Hộp thoại Thêm/Sửa Sản phẩm */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-fade-in-up flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
              <h3 className="font-bold text-lg text-slate-800">{newProduct.id ? 'Cập Nhật Sản Phẩm' : 'Thêm Sản Phẩm Mới'}</h3>
              <button onClick={() => setIsModalOpen(false)}><X size={20} className="text-slate-400" /></button>
            </div>
            <div className="p-6 overflow-y-auto">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Tên Sản Phẩm</label>
                    <input required className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-brand-500 outline-none" value={newProduct.name || ''} onChange={e => setNewProduct({...newProduct, name: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Mã SKU</label>
                    <input required className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-brand-500 outline-none" value={newProduct.sku || ''} onChange={e => setNewProduct({...newProduct, sku: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Danh Mục</label>
                    <select className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-brand-500 outline-none" value={newProduct.category} onChange={e => setNewProduct({...newProduct, category: e.target.value as Category})}>
                      {Object.values(Category).map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Thương Hiệu</label>
                    <select className="w-full border p-2.5 rounded-lg outline-none bg-white" value={newProduct.brand || ''} onChange={e => setNewProduct({...newProduct, brand: e.target.value})}>
                      <option value="">-- Chọn --</option>
                      {brands.map(b => (<option key={b.id} value={b.name}>{b.name}</option>))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Giá (VNĐ)</label>
                    <input type="number" min="0" required className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-brand-500 outline-none" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: Number(e.target.value)})} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Số Lượng</label>
                    <input type="number" min="0" required className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-brand-500 outline-none bg-slate-50" value={imeiInput ? imeiInput.split(/[\n,]+/).filter(s => s.trim() !== '').length : newProduct.quantity} onChange={e => setNewProduct({...newProduct, quantity: Number(e.target.value)})} placeholder="Nhập thủ công nếu không dùng IMEI" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Cảnh Báo Tối Thiểu</label>
                    <input type="number" min="0" required className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-brand-500 outline-none" value={newProduct.minStock} onChange={e => setNewProduct({...newProduct, minStock: Number(e.target.value)})} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Vị Trí Kho</label>
                    <input className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-brand-500 outline-none" value={newProduct.location || ''} onChange={e => setNewProduct({...newProduct, location: e.target.value})} placeholder="VD: Kệ A-1" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1 flex justify-between"><span>Danh sách IMEI / Serial Number</span><span className="text-xs text-slate-400 font-normal">Mỗi dòng một mã</span></label>
                    <textarea className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-brand-500 outline-none font-mono text-sm h-32" placeholder="IMEI1&#10;IMEI2&#10;IMEI3..." value={imeiInput} onChange={e => setImeiInput(e.target.value)} />
                    <p className="text-[10px] text-slate-500 mt-1">* Số lượng sẽ tự động cập nhật theo số dòng IMEI.</p>
                  </div>
                </div>
                <div className="pt-4 flex justify-end gap-3">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium">Hủy</button>
                  <button type="submit" className="px-6 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-medium shadow-md shadow-brand-500/30">{newProduct.id ? 'Cập Nhật' : 'Lưu Sản Phẩm'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

       {/* Modal chi tiết sản phẩm   */}
       {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-fade-in-up flex flex-col max-h-[90vh]">
            <div className="relative bg-slate-900 text-white p-8 shrink-0">
              <button 
                onClick={() => setSelectedProduct(null)} 
                className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
              >
                <X size={20} className="text-white" />
              </button>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-1 bg-brand-500 text-xs font-bold uppercase tracking-wider rounded text-white">
                      {selectedProduct.category}
                    </span>
                    {selectedProduct.quantity <= selectedProduct.minStock && (
                      <span className="px-2 py-1 bg-red-500 text-xs font-bold uppercase tracking-wider rounded text-white flex items-center gap-1">
                        <AlertCircle size={10} /> Low Stock
                      </span>
                    )}
                  </div>
                  <h2 className="text-3xl font-bold mb-1">{selectedProduct.name}</h2>
                  <p className="text-slate-400 font-mono text-sm flex items-center gap-2">
                    <Hash size={14} /> {selectedProduct.sku}
                  </p>
                </div>
                <div className="text-right hidden sm:block">
                  <p className="text-slate-400 text-sm">Đơn Giá</p>
                  <p className="text-2xl font-bold text-emerald-400">
                    {selectedProduct.price.toLocaleString('vi-VN')} ₫
                  </p>
                </div>
              </div>
            </div>

            <div className="p-8 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Inventory Status */}
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-2">
                    Trạng Thái Kho
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50 p-4 rounded-xl">
                      <div className="flex items-center gap-2 text-slate-500 mb-1">
                        <Package size={16} />
                        <span className="text-xs font-medium">Hiện Có</span>
                      </div>
                      <p className="text-xl font-bold text-slate-800">{selectedProduct.quantity}</p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl">
                      <div className="flex items-center gap-2 text-slate-500 mb-1">
                        <Layers size={16} />
                        <span className="text-xs font-medium">Tối Thiểu</span>
                      </div>
                      <p className="text-xl font-bold text-slate-800">{selectedProduct.minStock}</p>
                    </div>
                  </div>
                </div>

                {/* Location & Value */}
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-2">
                    Thông Tin Khác
                  </h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600 flex items-center gap-2 text-sm">
                        <MapPin size={16} className="text-slate-400" /> Vị Trí
                      </span>
                      <span className="font-semibold text-slate-800">{selectedProduct.location}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600 flex items-center gap-2 text-sm">
                        <Tag size={16} className="text-slate-400" /> Danh Mục
                      </span>
                      <span className="font-semibold text-slate-800">{selectedProduct.category}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600 flex items-center gap-2 text-sm">
                        <DollarSign size={16} className="text-slate-400" /> Tổng Giá Trị
                      </span>
                      <span className="font-bold text-emerald-600">
                        {(selectedProduct.quantity * selectedProduct.price).toLocaleString('vi-VN')} ₫
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* IMEI LIST SECTION (MỚI THÊM) */}
              <div className="mt-8 border-t border-slate-100 pt-6">
                <h4 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
                  <Smartphone size={18} className="text-slate-400" />
                  Danh sách IMEI / Serial Number tồn kho
                </h4>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 max-h-48 overflow-y-auto">
                  {selectedProduct.imeis && selectedProduct.imeis.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {selectedProduct.imeis.map((imei, idx) => (
                        <div key={idx} className="bg-white px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 font-mono flex items-center justify-between group hover:border-brand-300 transition-colors">
                          <span>{imei}</span>
                          <span className="text-xs text-slate-300 group-hover:text-brand-500">#{idx + 1}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-slate-400 italic text-sm">
                      Không có dữ liệu IMEI (Sản phẩm không quản lý theo Serial/IMEI hoặc chưa nhập)
                    </div>
                  )}
                </div>
              </div>
              
              {/* QR Code Section */}
              <div className="mt-8">
                 <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-2 mb-4">
                    Mã Định Danh (QR)
                 </h4>
                 <div className="bg-slate-50 p-4 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="bg-white p-2 rounded-lg border border-slate-200" ref={qrRef}>
                        <QRCodeCanvas value={selectedProduct.sku} size={80} level={"H"} />
                      </div>
                      <div>
                        <p className="font-bold text-slate-800 text-sm">Quét để kiểm kê</p>
                        <p className="text-xs text-slate-500 mb-2">Dùng mã này để quét nhanh trong phần Kiểm Kê.</p>
                        <p className="text-xs font-mono bg-slate-200 px-2 py-0.5 rounded inline-block text-slate-600">{selectedProduct.sku}</p>
                      </div>
                    </div>
                    <button 
                      onClick={handlePrint}
                      className="p-2 hover:bg-white hover:shadow-sm rounded-lg text-slate-500 hover:text-indigo-600 transition-all border border-transparent hover:border-slate-200"
                      title="In tem ngay"
                    >
                      <Printer size={20} />
                    </button>
                 </div>
                  {/* Component ẩn dùng để in */}
                <div style={{ display: "none" }}>
                    <ProductLabel ref={printRef} product={selectedProduct} />
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between text-sm text-slate-500">
                <div className="flex items-center gap-2">
                  <Calendar size={14} />
                  <span>Cập nhật lần cuối: {new Date(selectedProduct.lastUpdated).toLocaleString('vi-VN')}</span>
                </div>
                <div className="flex gap-3">
                   <button 
                    onClick={() => {
                       setSelectedProduct(null);
                       handleEditClick(selectedProduct);
                    }}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors"
                  >
                    Chỉnh Sửa
                  </button>
                  <button 
                    onClick={() => setSelectedProduct(null)}
                    className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-medium transition-colors"
                  >
                    Đóng
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;