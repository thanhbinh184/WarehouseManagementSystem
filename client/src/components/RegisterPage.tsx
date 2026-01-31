import React, { useState } from 'react';
import { User, Lock, ArrowRight, AlertCircle, Mail, Type, Shield } from 'lucide-react';

interface RegisterPageProps {
  onSwitchToLogin: () => void;
}

const RegisterPage: React.FC<RegisterPageProps> = ({ onSwitchToLogin }) => {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    email: '',
    full_name: '',
    role: 'staff'
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const response = await fetch('http://127.0.0.1:8000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
           username: formData.username,
           email: formData.email,
           password_hash: formData.password,
           full_name: formData.full_name,
           role: formData.role
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Đăng ký thất bại');
      }

      setSuccess('Tạo tài khoản thành công! Hãy đăng nhập.');
      setFormData({ username: '', password: '', email: '', full_name: '', role: 'staff' });

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      {/* Thêm max-h-[90vh] và overflow-y-auto để có thanh cuộn nếu màn hình quá bé */}
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col animate-fade-in-up max-h-[95vh] overflow-y-auto">
        
        {/* Header: Giảm padding py-6 xuống py-4 */}
        <div className="px-6 py-4 bg-emerald-600 text-center shrink-0">
           <h1 className="text-xl font-bold text-white mb-1">Tạo Tài Khoản Mới</h1>
           <p className="text-emerald-100 text-xs">Thêm thành viên vào hệ thống SmartWMS</p>
        </div>

        {/* Body: Giảm padding p-8 xuống p-6 */}
        <div className="p-6">
          {error && <div className="mb-3 p-2 bg-red-50 text-red-600 rounded-lg text-xs border border-red-100 flex gap-2"><AlertCircle size={14}/>{error}</div>}
          {success && <div className="mb-3 p-2 bg-green-50 text-green-600 rounded-lg text-xs border border-green-100 flex gap-2"><Shield size={14}/>{success}</div>}

          {/* Form: Giảm khoảng cách space-y-4 xuống space-y-3 */}
          <form onSubmit={handleSubmit} className="space-y-3">
            
            {/* Full Name */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Họ và Tên</label>
              <div className="relative">
                <Type className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input type="text" required 
                  className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="Nguyễn Văn A"
                  value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} />
              </div>
            </div>

            {/* Username */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Tên đăng nhập</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input type="text" required 
                  className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="username"
                  value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input type="email" required 
                  className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="email@example.com"
                  value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Mật khẩu</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input type="password" required 
                  className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="••••••"
                  value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
              </div>
            </div>

            {/* Role Select */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Vai trò</label>
              <div className="relative">
                <Shield className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <select 
                  className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-white cursor-pointer"
                  value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}>
                   <option value="staff">Nhân viên (Staff)</option>
                   <option value="manager">Quản lý (Manager)</option>
                   <option value="admin">Quản trị viên (Admin)</option>
                </select>
              </div>
            </div>

            <button type="submit" disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-lg transition-all flex items-center justify-center gap-2 shadow-md shadow-emerald-200 mt-4 text-sm">
              {loading ? 'Đang tạo...' : <>Đăng Ký Thành Viên <ArrowRight size={16} /></>}
            </button>
          </form>

          <div className="mt-4 text-center">
             <button onClick={onSwitchToLogin} className="text-sm text-emerald-600 hover:underline font-medium hover:text-emerald-800 transition-colors">
               ← Quay lại đăng nhập
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;