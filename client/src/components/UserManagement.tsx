import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Search, Mail, Shield, User as UserIcon, Edit, X, Save, Loader2, Key } from 'lucide-react';
import { warehouseApi } from '../services/api';
import { User } from '../types';

const UserManagement: React.FC = () => {
  // --- STATE & LOGIC ---
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [modalLoading, setModalLoading] = useState(false); 
  
  // Khởi tạo form chuẩn
  const [formData, setFormData] = useState({
    id: '' as string | number,
    full_name: '',
    username: '', 
    email: '',
    role: 'staff' as any, 
    password: '' 
  });

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await warehouseApi.getUsers();
      if (Array.isArray(data)) {
        setUsers(data);
      }
    } catch (error) {
      console.error("Lỗi khi tải danh sách:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const filteredUsers = users.filter(user => 
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.username?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddNewClick = () => {
    setIsEditing(false);
    setFormData({ id: '', full_name: '', username: '', email: '', role: 'staff', password: '' }); 
    setIsModalOpen(true);
  };

  const handleEditClick = (user: any) => {
    setIsEditing(true);
    setFormData({
      id: user.id,
      full_name: user.full_name,
      username: user.username || '', 
      email: user.email,
      role: user.role,
      password: '' 
    });
    setIsModalOpen(true);
  };

  const handleDeleteUser = async (id: string | number) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa nhân viên này?')) {
      try {
        await warehouseApi.deleteUser(id);
        await fetchUsers(); 
        alert("Đã xóa nhân viên thành công.");
      } catch (error: any) {
        let msg = "Lỗi khi xóa nhân viên.";
        if (error.response && error.response.data && error.response.data.detail) {
            msg = typeof error.response.data.detail === 'string' 
                ? error.response.data.detail 
                : JSON.stringify(error.response.data.detail);
        }
        alert(msg);
      }
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.full_name || !formData.email || !formData.username) {
      alert("Vui lòng điền đầy đủ: Tên, Username và Email!");
      return;
    }

    setModalLoading(true);
    try {
      if (isEditing) {
        const updateData: any = { ...formData };
        if (!updateData.password) delete updateData.password;
        await warehouseApi.updateUser(formData.id, updateData);
        alert("Cập nhật thành công!");
      } else {
        if (!formData.password) {
          alert("Vui lòng nhập mật khẩu!");
          setModalLoading(false);
          return;
        }
        await warehouseApi.addUser(formData);
        alert("Thêm nhân viên mới thành công!");
      }
      setIsModalOpen(false);
      await fetchUsers(); 
    } catch (error: any) {
      let msg = "Có lỗi xảy ra.";
      if (error.response) {
        const detail = error.response.data.detail;
        if (typeof detail === 'string') {
          msg = detail;
        } else if (Array.isArray(detail)) {
          msg = "Lỗi dữ liệu: " + detail.map((err: any) => err.msg).join(", ");
        } else {
          msg = JSON.stringify(error.response.data);
        }
      } else if (error.message) {
        msg = error.message;
      }
      alert(msg);
    } finally {
      setModalLoading(false);
    }
  };

  if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin text-indigo-600" /></div>;

  return (
    <div className="space-y-6 relative">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Quản lý nhân viên</h2>
          <p className="text-slate-500">Danh sách tài khoản từ Server</p>
        </div>
        <button 
          onClick={handleAddNewClick}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm"
        >
          <Plus size={20} />
          <span>Thêm nhân viên mới</span>
        </button>
      </div>

      {/* Search & Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex gap-4">
            <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input 
                    type="text" 
                    placeholder="Tìm theo tên, username hoặc email..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
            </div>
        </div>
        
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 text-slate-600 font-semibold text-sm">
            <tr>
              <th className="p-4 border-b">Nhân viên</th>
              <th className="p-4 border-b">Thông tin liên hệ</th>
              <th className="p-4 border-b">Vai trò</th>
              <th className="p-4 border-b text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="text-slate-700">
            {filteredUsers.length > 0 ? (
              filteredUsers.map((user: any) => (
                <tr key={user.id} className="hover:bg-slate-50 border-b last:border-0 transition-colors">
                  <td className="p-4">
                      <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                              <UserIcon size={16} />
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">{user.full_name}</p>
                            <p className="text-xs text-slate-500">@{user.username}</p>
                          </div>
                      </div>
                  </td>
                  <td className="p-4">
                      <div className="flex items-center gap-2 text-slate-600">
                          <Mail size={16} />
                          {user.email}
                      </div>
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium capitalize border ${
                      user.role === 'admin' 
                        ? 'bg-purple-50 text-purple-700 border-purple-200' 
                        : user.role === 'manager'
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : 'bg-green-50 text-green-700 border-green-200'
                    }`}>
                      <Shield size={12} />
                      {user.role}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => handleEditClick(user)}
                        className="text-slate-400 hover:text-indigo-600 p-2 hover:bg-indigo-50 rounded transition-colors"
                        title="Sửa thông tin"
                      >
                        <Edit size={18} />
                      </button>
                      <button 
                        onClick={() => handleDeleteUser(user.id)}
                        className="text-slate-400 hover:text-red-600 p-2 hover:bg-red-50 rounded transition-colors"
                        title="Xóa người dùng"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="p-8 text-center text-slate-500">
                  {users.length === 0 ? "Chưa có nhân viên nào." : "Không tìm thấy kết quả phù hợp."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden transform transition-all">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h3 className="text-lg font-bold text-slate-800">
                {isEditing ? 'Cập nhật thông tin' : 'Thêm nhân viên mới'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Họ và tên <span className='text-red-500'>*</span></label>
                  <input 
                    type="text" required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-slate-900 placeholder-slate-400"
                    placeholder="Nguyễn Văn A"
                    value={formData.full_name}
                    onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tên đăng nhập <span className='text-red-500'>*</span></label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
                    <input 
                      type="text" required
                      className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-slate-900 placeholder-slate-400"
                      placeholder="user123"
                      value={formData.username}
                      onChange={(e) => setFormData({...formData, username: e.target.value})} 
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email <span className='text-red-500'>*</span></label>
                <div className="relative">
                   <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
                   <input 
                    type="email" required
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-slate-900 placeholder-slate-400"
                    placeholder="email@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                  />
                </div>
              </div>

              {/* SỬA LẠI PHẦN SELECT CHO RÕ RÀNG */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Vai trò</label>
                <div className="relative">
                  <Shield className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 z-10" size={16}/>
                  <select 
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white text-slate-900 relative z-0 h-10"
                    value={formData.role}
                    onChange={(e) => setFormData({...formData, role: e.target.value})}
                  >
                    <option value="staff">Nhân viên (Staff)</option>
                    <option value="manager">Quản lý (Manager)</option>
                    <option value="admin">Quản trị viên (Admin)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {isEditing ? 'Mật khẩu mới (Để trống nếu không đổi)' : 'Mật khẩu'} <span className='text-red-500'>*</span>
                </label>
                <div className="relative">
                   <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
                   <input 
                    type="password" 
                    required={!isEditing} 
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-slate-900 placeholder-slate-400"
                    placeholder="******"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 mt-4">
                {/* NÚT HỦY BỎ ĐÃ ĐƯỢC SỬA CHO DỄ NHÌN HƠN */}
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)} 
                  className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
                >
                  Hủy bỏ
                </button>
                <button 
                  type="submit" 
                  disabled={modalLoading}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg flex items-center gap-2 hover:bg-indigo-700 transition-colors font-medium disabled:opacity-50"
                >
                  {modalLoading && <Loader2 className="animate-spin" size={16}/>}
                  {isEditing ? 'Lưu thay đổi' : 'Thêm nhân viên'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;