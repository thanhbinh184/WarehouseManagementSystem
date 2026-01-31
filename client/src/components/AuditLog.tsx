import React, { useEffect, useState } from 'react';
import { warehouseApi } from '../services/api';
import { SystemLog } from '../types';
import { Clock, User, FileText, ShieldAlert, Filter, Search, Loader2 } from 'lucide-react';

const AuditLog: React.FC = () => {
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<SystemLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState('ALL');

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const data = await warehouseApi.getSystemLogs();
        setLogs(data);
        setFilteredLogs(data);
      } catch (err) {
        setError("Bạn không có quyền xem nhật ký hoặc lỗi kết nối.");
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  // Xử lý tìm kiếm và lọc
  useEffect(() => {
    let result = logs;

    // Lọc theo từ khóa
    if (searchTerm) {
      result = result.filter(log => 
        log.target.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.details.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Lọc theo hành động
    if (filterAction !== 'ALL') {
      result = result.filter(log => log.action === filterAction);
    }

    setFilteredLogs(result);
  }, [searchTerm, filterAction, logs]);

  // Helper chọn màu cho hành động
  const getActionColor = (action: string) => {
    switch (action) {
      case 'CREATE': return 'bg-green-100 text-green-700 border-green-200';
      case 'IMPORT': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'DELETE': return 'bg-red-100 text-red-700 border-red-200';
      case 'EXPORT': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'UPDATE': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'LOGIN': return 'bg-purple-100 text-purple-700 border-purple-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    // THÊM pb-20 VÀO ĐÂY ĐỂ TRÁNH BỊ ĐÈ NỘI DUNG CUỐI
    <div className="space-y-6 animate-fade-in pb-20">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <ShieldAlert className="text-indigo-600"/> Nhật Ký Hoạt Động
          </h2>
          <p className="text-slate-500">Theo dõi toàn bộ thao tác trong hệ thống (Audit Trail).</p>
        </div>
        
        {/* Bộ lọc */}
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
           <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Tìm user, sản phẩm..." 
                className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 w-full"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
           </div>
           <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <select 
                className="pl-10 pr-8 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 appearance-none bg-white cursor-pointer w-full"
                value={filterAction}
                onChange={e => setFilterAction(e.target.value)}
              >
                <option value="ALL">Tất cả hành động</option>
                <option value="LOGIN">Đăng nhập</option>
                <option value="CREATE">Thêm mới</option>
                <option value="UPDATE">Cập nhật</option>
                <option value="DELETE">Xóa</option>
                <option value="IMPORT">Nhập kho</option>
                <option value="EXPORT">Xuất kho</option>
              </select>
           </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500 flex flex-col items-center">
             <Loader2 className="animate-spin text-indigo-600 mb-2" size={32} />
             Đang tải nhật ký...
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-500 font-bold bg-red-50">{error}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase whitespace-nowrap">Thời Gian</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase whitespace-nowrap">Người Dùng</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase whitespace-nowrap">Hành Động</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase whitespace-nowrap">Đối Tượng</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Chi Tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-slate-500 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Clock size={14} className="text-slate-400" />
                        {new Date(log.timestamp).toLocaleString('vi-VN')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 font-medium text-slate-700 bg-slate-100 px-2 py-1 rounded-full w-fit">
                        <User size={14} className="text-slate-500" />
                        {log.username}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded text-[10px] font-bold border ${getActionColor(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-800 whitespace-nowrap">
                      {log.target}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      <div className="flex items-start gap-2">
                        <FileText size={14} className="text-slate-400 mt-1 shrink-0" />
                        <span className="line-clamp-2" title={log.details}>{log.details}</span>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredLogs.length === 0 && (
                   <tr>
                     <td colSpan={5} className="p-8 text-center text-slate-400 italic">Không tìm thấy nhật ký nào phù hợp.</td>
                   </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditLog;