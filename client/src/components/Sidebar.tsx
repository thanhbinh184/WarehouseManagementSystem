import React, { useState, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, Package, ArrowRightLeft, Sparkles, X, ClipboardCheck,
  Home, Settings, Users, FileText, BarChart2, PieChart, Box, Truck, ShoppingCart, CreditCard, Tag,
  Upload, Wrench, Image as Edit3, Check, Container, Wallet, Search
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

// Map icon
const ICON_LIBRARY: Record<string, any> = {
  LayoutDashboard, Package, ArrowRightLeft, ClipboardCheck, Sparkles, Container,
  Home, Settings, Users, FileText, BarChart2, PieChart, Box, Truck, ShoppingCart, CreditCard,
  Tag, Wrench, Wallet, Search
};

const DEFAULT_MENU_ITEMS = [
  { id: 'dashboard', label: 'Tổng Quan', icon: 'LayoutDashboard' },
  { id: 'inventory', label: 'Kho Hàng', icon: 'Package' },
  { id: 'transactions', label: 'Nhập / Xuất', icon: 'ArrowRightLeft' },
  { id: 'warranty', label: 'Bảo Hành', icon: 'Wrench' },
  { id: 'stocktake', label: 'Kiểm Kê', icon: 'ClipboardCheck' },
  { id: 'optimization', label: 'Tối Ưu Kho', icon: 'Container' },
  { id: 'partners', label: 'Đối Tác', icon: 'Users' },
  { id: 'reports', label: 'Báo Cáo', icon: 'FileText' },
  { id: 'audit-log', label: 'Nhật Ký', icon: 'ClipboardCheck' },
  { id: 'ai-analysis', label: 'Trợ Lý AI', icon: 'Sparkles' },
];

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, isOpen, setIsOpen }) => {
  const [items, setItems] = useState(() => {
    try {
      const saved = localStorage.getItem('smartwms_sidebar_config_v7'); 
      return saved ? JSON.parse(saved) : DEFAULT_MENU_ITEMS;
    } catch (e) {
      return DEFAULT_MENU_ITEMS;
    }
  });

  const [isEditing, setIsEditing] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem('smartwms_sidebar_config_v7', JSON.stringify(items));
  }, [items]);

  const updateItemIcon = (id: string, iconValue: string) => {
    setItems((prev: any[]) => prev.map((item: any) => item.id === id ? { ...item, icon: iconValue } : item));
    setEditingItemId(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && editingItemId) {
      const reader = new FileReader();
      reader.onloadend = () => {
        updateItemIcon(editingItemId, reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const renderIcon = (iconNameOrUrl: string, className: string) => {
    if (ICON_LIBRARY[iconNameOrUrl]) {
      const IconComponent = ICON_LIBRARY[iconNameOrUrl];
      return <IconComponent className={className} size={20} />;
    }
    return (
      <img 
        src={iconNameOrUrl} 
        alt="icon" 
        className={`${className} w-5 h-5 object-contain rounded-sm`} 
      />
    );
  };

  return (
    <>
      {/* Overlay Mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 lg:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* SIDEBAR CONTAINER */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white transition-transform duration-300 ease-in-out shadow-2xl 
        flex flex-col h-[100dvh] max-h-[100dvh]
        ${isOpen ? 'translate-x-0' : '-translate-x-full'} 
        lg:translate-x-0 lg:static lg:block
      `}>
        
        {/* 1. HEADER (Cố định) */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-slate-700 shrink-0 bg-slate-900 z-10">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-brand-500 to-brand-600 rounded-lg flex items-center justify-center shadow-lg shadow-brand-500/20">
              <Package className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-wider text-white">SmartWMS</span>
          </div>
          
          <div className="flex items-center">
            <button 
              onClick={() => setIsEditing(!isEditing)}
              className={`p-1.5 rounded-lg transition-colors mr-1 lg:mr-0 ${isEditing ? 'bg-brand-600 text-white' : 'text-slate-500 hover:text-white hover:bg-slate-800'}`}
              title="Tùy chỉnh menu"
            >
              {isEditing ? <Check size={18} /> : <Settings size={18} />}
            </button>
            <button onClick={() => setIsOpen(false)} className="lg:hidden text-slate-400 hover:text-white ml-2">
              <X size={24} />
            </button>
          </div>
        </div>

        {/* 2. MENU LIST (Cuộn được) */}
        <nav className="flex-1 overflow-y-auto min-h-0 px-4 py-4 space-y-2 custom-scrollbar">
            {items.map((item: any) => {
            const isActive = activeTab === item.id;
            
            return (
              <div key={item.id} className="relative group">
                <button
                  onClick={() => {
                    if (isEditing) {
                      setEditingItemId(item.id);
                    } else {
                      setActiveTab(item.id);
                      setIsOpen(false);
                    }
                  }}
                  className={`
                    w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 relative overflow-hidden
                    ${isActive 
                      ? 'bg-gradient-to-r from-brand-600 to-brand-500 text-white shadow-lg shadow-brand-500/30 ring-1 ring-white/10' 
                      : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-100 hover:translate-x-1'
                    }
                    ${isEditing ? 'border border-dashed border-slate-600 hover:border-brand-500' : ''}
                  `}
                >
                  {isActive && (
                    <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  )}

                  <div className="relative z-10 flex items-center gap-3 w-full">
                    <div className={`transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>
                      {renderIcon(item.icon, isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200')}
                    </div>
                    
                    <span className={`font-medium tracking-wide text-sm truncate ${isActive ? 'font-bold' : ''}`}>
                      {item.label}
                    </span>

                    {isEditing && (
                      <div className="absolute -top-1 -right-1 bg-brand-500 rounded-full p-1 shadow-sm z-20">
                        <Edit3 size={10} className="text-white" />
                      </div>
                    )}

                    {item.id === 'ai-analysis' && !isEditing && (
                       <span className={`ml-auto text-[10px] px-2 py-0.5 rounded-full uppercase font-bold tracking-wider shadow-sm
                         ${isActive ? 'bg-white/20 text-white' : 'bg-brand-500/20 text-brand-400'}
                       `}>
                         AI
                       </span>
                    )}
                  </div>
                </button>
              </div>
            );
          })}
        </nav>
    
        {/* 3. FOOTER (Cố định) */}
        <div className="mt-auto px-6 py-4 border-t border-slate-700 shrink-0 bg-slate-900 z-10">
          <div className="text-center">
            <p className="text-[10px] text-slate-600">v1.4.1 • SmartWMS Inc.</p>
          </div>
        </div>

      </div>

      {/* Icon Selection Modal */}
      {editingItemId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black bg-opacity-70 backdrop-blur-sm">
           <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in-up">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-lg text-slate-800">
                Chọn Biểu Tượng
              </h3>
              <button onClick={() => setEditingItemId(null)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6">
              <div className="mb-6">
                <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">Thư Viện Icon</h4>
                <div className="grid grid-cols-5 gap-3">
                  {Object.keys(ICON_LIBRARY).map((iconKey) => {
                    const IconComp = ICON_LIBRARY[iconKey];
                    const isSelected = items.find((i: any) => i.id === editingItemId)?.icon === iconKey;
                    return (
                      <button
                        key={iconKey}
                        onClick={() => updateItemIcon(editingItemId, iconKey)}
                        className={`p-3 rounded-xl flex items-center justify-center transition-all ${
                          isSelected 
                            ? 'bg-brand-100 text-brand-600 ring-2 ring-brand-500' 
                            : 'bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-800 hover:scale-105'
                        }`}
                      >
                        <IconComp size={24} />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="border-t border-slate-100 pt-6">
                <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">Tải Lên Hình Ảnh</h4>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-slate-300 rounded-xl p-4 flex flex-col items-center justify-center text-slate-500 hover:border-brand-500 hover:text-brand-600 hover:bg-brand-50 transition-all cursor-pointer group"
                >
                  <div className="p-3 bg-slate-50 rounded-full mb-3 group-hover:bg-brand-50 transition-colors">
                    <Upload size={24} className="group-hover:scale-110 transition-transform" />
                  </div>
                  <span className="text-sm font-medium">Chọn file ảnh từ máy tính</span>
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="image/*"
                  className="hidden"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;