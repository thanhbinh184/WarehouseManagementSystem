import React, { useState, useEffect } from 'react';
import { User, Mail, Shield, Save, Key, Lock, Loader2, UserCircle } from 'lucide-react';
import { warehouseApi } from '../services/api';

const Settings: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<any>(null);

  // Form thông tin
  const [profileData, setProfileData] = useState({ full_name: '', email: '' });
  
  // Form mật khẩu
  const [passData, setPassData] = useState({ current_password: '', new_password: '', confirm_password: '' });

  // Tải thông tin khi vào trang
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await warehouseApi.getMe();
        setUser(data);
        setProfileData({ full_name: data.full_name, email: data.email });
      } catch (error) {
        console.error("Lỗi tải thông tin:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  // Xử lý cập nhật thông tin
const handleUpdateProfile = async (e: React.FormEvent) => {
  e.preventDefault();
  setSaving(true);
  try {
    await warehouseApi.updateMe(profileData);
    
    // Cập nhật lại state và localStorage
    setUser({ ...user, ...profileData });
    const storedUser = JSON.parse(localStorage.getItem('smartwms_user') || '{}');
    localStorage.setItem('smartwms_user', JSON.stringify({ ...storedUser, ...profileData }));
    
    alert("Cập nhật thông tin thành công!");
    window.location.reload(); 
  } catch (error: any) {
    // 👇👇👇 ĐOẠN CODE SỬA LỖI [object Object] 👇👇👇
    console.error("Chi tiết lỗi:", error.response); // In lỗi ra Console F12 để kiểm tra

    let msg = "Không thể cập nhật.";
    if (error.response && error.response.data) {
      const detail = error.response.data.detail;
      
      if (typeof detail === 'string') {
        // Trường hợp 1: Lỗi là chuỗi bình thường
        msg = detail;
      } else if (Array.isArray(detail)) {
        // Trường hợp 2: Lỗi Validation (FastAPI trả về mảng)
        msg = detail.map((err: any) => `${err.loc[1]}: ${err.msg}`).join("\n");
      } else if (typeof detail === 'object') {
        // Trường hợp 3: Lỗi là object khác
        msg = JSON.stringify(detail);
      }
    }
    alert("Lỗi: " + msg);
    // 👆👆👆 HẾT ĐOẠN SỬA 👆👆👆
  } finally {
    setSaving(false);
  }
};

  // Xử lý đổi mật khẩu
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passData.new_password !== passData.confirm_password) {
      return alert("Mật khẩu xác nhận không khớp!");
    }
    if (passData.new_password.length < 6) {
      return alert("Mật khẩu mới phải từ 6 ký tự trở lên!");
    }

    setSaving(true);
    try {
      await warehouseApi.changePassword({
        current_password: passData.current_password,
        new_password: passData.new_password
      });
      alert("Đổi mật khẩu thành công! Vui lòng đăng nhập lại.");
      localStorage.removeItem('smartwms_token');
      window.location.reload();
    } catch (error: any) {
      alert("Lỗi: " + (error.response?.data?.detail || "Mật khẩu cũ không đúng"));
    } finally {
      setSaving(false);
      setPassData({ current_password: '', new_password: '', confirm_password: '' });
    }
  };

  if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin"/></div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Cài đặt tài khoản</h2>
        <p className="text-slate-500">Quản lý thông tin cá nhân của bạn</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Cột trái: Thông tin tóm tắt */}
        <div className="md:col-span-1">
          <div className="bg-white p-6 rounded-xl shadow-sm border text-center">
            <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-3 text-indigo-600">
              <UserCircle size={40} />
            </div>
            <h3 className="font-bold text-lg">{user?.full_name}</h3>
            <p className="text-slate-500 text-sm">@{user?.username}</p>
            <div className="mt-3 inline-block px-3 py-1 bg-slate-100 rounded-full text-xs font-bold uppercase text-slate-600">
              {user?.role}
            </div>
          </div>
        </div>

        {/* Cột phải: Form */}
        <div className="md:col-span-2 space-y-6">
          
          {/* Form 1: Thông tin cơ bản */}
          <div className="bg-white p-6 rounded-xl shadow-sm border">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <User size={20} className="text-indigo-600"/> Thông tin cơ bản
            </h3>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-700">Họ và tên</label>
                  <input type="text" required className="w-full border p-2 rounded-lg"
                    value={profileData.full_name} onChange={e => setProfileData({...profileData, full_name: e.target.value})} />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Username</label>
                  <input type="text" disabled className="w-full border p-2 rounded-lg bg-slate-100 text-slate-500 cursor-not-allowed"
                    value={user?.username || ''} />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 text-slate-400" size={16}/>
                  <input type="email" required className="w-full border pl-9 p-2 rounded-lg"
                    value={profileData.email} onChange={e => setProfileData({...profileData, email: e.target.value})} />
                </div>
              </div>
              <div className="flex justify-end">
                <button disabled={saving} className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-indigo-700">
                  <Save size={18}/> Lưu thông tin
                </button>
              </div>
            </form>
          </div>

          {/* Form 2: Đổi mật khẩu */}
          <div className="bg-white p-6 rounded-xl shadow-sm border">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Shield size={20} className="text-indigo-600"/> Đổi mật khẩu
            </h3>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700">Mật khẩu hiện tại</label>
                <div className="relative">
                   <Lock className="absolute left-3 top-2.5 text-slate-400" size={16}/>
                   <input type="password" required className="w-full border pl-9 p-2 rounded-lg"
                    value={passData.current_password} onChange={e => setPassData({...passData, current_password: e.target.value})}/>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-700">Mật khẩu mới</label>
                  <input type="password" required className="w-full border p-2 rounded-lg"
                    value={passData.new_password} onChange={e => setPassData({...passData, new_password: e.target.value})}/>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Xác nhận mật khẩu</label>
                  <input type="password" required className="w-full border p-2 rounded-lg"
                    value={passData.confirm_password} onChange={e => setPassData({...passData, confirm_password: e.target.value})}/>
                </div>
              </div>
              <div className="flex justify-end">
                <button disabled={saving} className="bg-slate-800 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-slate-900">
                  <Key size={18}/> Đổi mật khẩu
                </button>
              </div>
            </form>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Settings;