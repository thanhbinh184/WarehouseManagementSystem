import React, { useEffect, useState, useRef } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Inventory from './components/Inventory';
import Transactions from './components/Transactions';
import Stocktake from './components/Stocktake';
import StorageOptimization from './components/StorageOptimization';
import AIAssistant from './components/AIAssistant';
import UserManagement from './components/UserManagement';
import Reports from './components/Reports';
import LoginPage from './components/LoginPage';
import RegisterPage from './components/RegisterPage';
import AuditLog from './components/AuditLog';
import Partners from './components/Partners';
import Warranty from './components/Warranty';
import Brands from './components/Brands';

// 👇 1. IMPORT TRANG SETTINGS (NẾU CHƯA CÓ FILE NÀY HÃY TẠO NÓ)
import Settings from './components/Settings'; 

import { warehouseApi } from './services/api';
import { Product, Transaction, StocktakeSession } from './types';
// 👇 2. ĐỔI TÊN ICON 'Settings' THÀNH 'SettingsIcon' ĐỂ TRÁNH TRÙNG TÊN VỚI TRANG SETTINGS
import { Loader2, Menu, LogOut, User as UserIcon, ChevronDown, Settings as SettingsIcon, Users } from 'lucide-react';

function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);

  // --- STATE XÁC THỰC ---
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(!!localStorage.getItem('smartwms_token'));
  const [currentUser, setCurrentUser] = useState<any>(
    JSON.parse(localStorage.getItem('smartwms_user') || 'null')
  );
  const [isRegistering, setIsRegistering] = useState<boolean>(false);

  // --- STATE MENU ADMIN ---
  const [isUserMenuOpen, setIsUserMenuOpen] = useState<boolean>(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // State quản lý dữ liệu toàn cục
  const [products, setProducts] = useState<Product[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stocktakes, setStocktakes] = useState<StocktakeSession[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const [prefillTransaction, setPrefillTransaction] = useState<{ productId: string; quantity: number } | null>(null);

  // --- LOGIC ĐĂNG NHẬP / ĐĂNG XUẤT ---

  const handleLoginSuccess = (token: string, userData: any) => {
    localStorage.setItem('smartwms_token', token);
    localStorage.setItem('smartwms_user', JSON.stringify(userData));
    
    setIsAuthenticated(true);
    setCurrentUser(userData);
    
    refreshData();
  };

  const handleLogout = () => {
    localStorage.removeItem('smartwms_token');
    localStorage.removeItem('smartwms_user');
    
    setIsAuthenticated(false);
    setCurrentUser(null);
    setProducts([]);
    setTransactions([]);
    setActiveTab('dashboard');
    setIsUserMenuOpen(false); 
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // --- LOGIC DATA ---

  const refreshData = async () => {
    if (!isAuthenticated) return;

    setLoading(true);
    try {
      const [pData, tData, sData] = await Promise.all([
        warehouseApi.getProducts(),
        warehouseApi.getTransactions(),
        warehouseApi.getStocktakes()
      ]);
      setProducts(pData);
      setTransactions(tData);
      setStocktakes(sData);
    } catch (error) {
      console.error("Lỗi kết nối Backend:", error);
      if ((error as any).response && (error as any).response.status === 401) {
        handleLogout();
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      refreshData();
    }
  }, [isAuthenticated]);

  // --- HANDLERS ---
  
  const handleAddProduct = async (p: Product) => {
    await warehouseApi.addProduct(p);
    refreshData();
  };

  const handleUpdateProduct = async (p: Product) => {
    await warehouseApi.updateProduct(p);
    refreshData();
  };

  const handleDeleteProduct = async (id: string) => {
    await warehouseApi.deleteProduct(id);
    refreshData();
  };

  const handleAddTransaction = async (t: Transaction) => {
    await warehouseApi.addTransaction(t);
    refreshData();
  };

  const handleSaveStocktake = async (s: StocktakeSession) => {
    await warehouseApi.saveStocktake(s);
    refreshData();
  };

  const handleRestockFromAI = (productName: string, quantity: number) => {
    const product = products.find(p => p.name === productName);
    if (product) {
      setPrefillTransaction({ productId: product.id, quantity: quantity });
      setActiveTab('transactions');
    } else {
      alert(`Không tìm thấy sản phẩm "${productName}" trong hệ thống!`);
    }
  };

  // =========================================================
  // PHẦN RENDER GIAO DIỆN
  // =========================================================

  if (!isAuthenticated) {
    if (isRegistering) {
      return <RegisterPage onSwitchToLogin={() => setIsRegistering(false)} />;
    }
    return (
      <LoginPage 
        onLogin={handleLoginSuccess} 
        onSwitchToRegister={() => setIsRegistering(true)} 
      />
    );
  }

  // Thêm nút reload phòng trường hợp mạng lag loading mãi
  if (loading && products.length === 0) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
        <Loader2 className="animate-spin text-indigo-600" size={40}/>
        <p className="text-slate-500 text-sm">Đang tải dữ liệu...</p>
        <button onClick={() => window.location.reload()} className="text-xs text-indigo-600 underline">
            Tải lại trang
        </button>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard products={products} transactions={transactions} />;
      case 'inventory':
        return (
          <Inventory 
            products={products}
            onAddProduct={handleAddProduct}
            onUpdateProduct={handleUpdateProduct}
            onDeleteProduct={handleDeleteProduct}
            onNavigateToOptimization={() => setActiveTab('optimization')}
          />
        );
      case 'transactions':
        return (
          <Transactions 
            products={products} 
            transactions={transactions}
            onAddTransaction={handleAddTransaction}
            initialData={prefillTransaction}
          />
        );
      case 'stocktake':
        return (
          <Stocktake 
            products={products}
            stocktakes={stocktakes}
            onSaveStocktake={handleSaveStocktake}
          />
        );
      case 'optimization':
        return (
           <StorageOptimization 
              products={products} 
              transactions={transactions} 
              onUpdateProduct={handleUpdateProduct}
           />
        );
      case 'warranty': 
      return <Warranty />;
      case 'brands': 
      return <Brands />;
      case 'partners':
        return <Partners />;
      case 'reports':
        return <Reports />;
      case 'audit-log':
        return <AuditLog />;
      case 'ai-analysis':
        return (
           <AIAssistant 
             products={products}
             onRestock={handleRestockFromAI}
           />
        );
      case 'users': 
        return <UserManagement />;
      case 'settings':
        return <Settings />; // Component Settings này giờ đã an toàn, không bị trùng tên với Icon
      default:
        return <Dashboard products={products} transactions={transactions} />;
    }
  };

  return (
    // 1. Container Tổng: Dùng h-[100dvh] để ép chặt theo chiều cao thực tế của trình duyệt
    <div className="flex h-[100dvh] w-screen bg-slate-50 overflow-hidden relative">
      
      {/* 2. SIDEBAR WRAPPER: Thêm h-full để nó cao bằng Container tổng */}
      {/* Ẩn hiện dựa trên isSidebarOpen */}
      <div className={`
          h-full shrink-0 z-50
          ${isSidebarOpen ? 'fixed inset-y-0 left-0 block shadow-2xl' : 'hidden'} 
          lg:static lg:block lg:shadow-none
      `}>
          <Sidebar 
            activeTab={activeTab} 
            setActiveTab={setActiveTab} 
            isOpen={isSidebarOpen} 
            setIsOpen={setIsSidebarOpen} 
          />
      </div>

      {/* KHUNG NỘI DUNG BÊN PHẢI */}
      <div className="flex-1 flex flex-col h-full w-full relative min-w-0 min-h-0">
      {/* --- HEADER --- */}
      <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 z-10 shadow-sm">            
        <div className="flex items-center gap-4 lg:hidden">
              <button 
                onClick={() => setIsSidebarOpen(true)} 
                className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                <Menu size={24} />
              </button>
              <span className="font-bold text-slate-700">SmartWMS</span>
            </div>

            {/* Desktop Title */}
            <div className="hidden lg:block font-bold text-slate-700 text-lg">
               Hệ Thống Quản Lý Kho
            </div>

            {/* --- USER MENU DROPDOWN --- */}
            <div className="relative" ref={userMenuRef}>
              <button 
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-3 hover:bg-slate-50 p-1.5 rounded-lg transition-colors focus:outline-none"
              >
                <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 border border-indigo-200">
                  <UserIcon size={20} />
                </div>
                <div className="hidden md:block text-right">
                  <p className="text-sm font-bold text-slate-700 leading-tight">{currentUser?.full_name || 'Admin'}</p>
                  <p className="text-xs text-slate-500 font-mono capitalize">{currentUser?.role || 'User'}</p>
                </div>
                <ChevronDown size={16} className={`text-slate-400 transition-transform duration-200 ${isUserMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* DROPDOWN CONTENT */}
              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-100 py-2 animate-in fade-in slide-in-from-top-2 z-50">
                  <div className="px-4 py-2 border-b border-slate-100 md:hidden">
                    <p className="text-sm font-bold text-slate-700">{currentUser?.full_name}</p>
                    <p className="text-xs text-slate-500 capitalize">{currentUser?.role}</p>
                  </div>
                  
                  {currentUser?.role === 'admin' && (
                    <button 
                      onClick={() => { setActiveTab('users'); setIsUserMenuOpen(false); }}
                      className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 flex items-center gap-2 transition-colors"
                    >
                      <Users size={18} />
                      Quản lý nhân viên
                    </button>
                  )}
                  
                  {/* 👇 3. SỬA SỰ KIỆN ONCLICK ĐỂ CHUYỂN TAB */}
                  <button 
                    onClick={() => { setActiveTab('settings'); setIsUserMenuOpen(false); }}
                    className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors"
                  >
                    {/* Sử dụng SettingsIcon thay vì Settings */}
                    <SettingsIcon size={18} />
                    Cài đặt tài khoản
                  </button>

                  <div className="h-px bg-slate-100 my-1"></div>

                  <button 
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
                  >
                    <LogOut size={18} />
                    Đăng xuất
                  </button>
                </div>
              )}
            </div>
         </header>

         {/* MAIN CONTENT */}
         <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 bg-slate-50 scroll-smooth pb-40">         
          <div className="w-full h-full">
                {renderContent()}
            </div>
         </main>
      </div>
    </div>
  );
}


export default App;