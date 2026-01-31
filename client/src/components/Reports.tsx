import React, { useState } from 'react';
import { FileSpreadsheet, Download, History, ArrowRightLeft } from 'lucide-react';

const Reports: React.FC = () => {
  const [loadingInventory, setLoadingInventory] = useState(false);
  const [loadingTransactions, setLoadingTransactions] = useState(false);

  // Hàm tải báo cáo chung (chỉ khác URL)
  const downloadReport = async (url: string, fileName: string, setLoading: (v: boolean) => void) => {
    try {
      setLoading(true);
      // Tạo thẻ a ảo để kích hoạt tải xuống
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (error) {
      console.error("Lỗi tải báo cáo:", error);
      alert("Không thể tải báo cáo. Vui lòng kiểm tra lại Backend.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Báo Cáo & Xuất Dữ Liệu</h2>
        <p className="text-slate-500">Trích xuất dữ liệu kho hàng ra file Excel để phục vụ kế toán/kiểm kê.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* CARD 1: BÁO CÁO TỒN KHO (Code cũ) */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow flex flex-col">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 bg-green-100 text-green-600 rounded-xl">
              <FileSpreadsheet size={32} />
            </div>
            <span className="bg-green-50 text-green-700 text-xs font-bold px-2 py-1 rounded">Excel</span>
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-2">Báo Cáo Tồn Kho</h3>
          <p className="text-slate-500 text-sm mb-6 flex-1">
            Xuất danh sách toàn bộ sản phẩm hiện có, bao gồm số lượng, vị trí, giá vốn và tổng giá trị tài sản.
          </p>
          <button 
            onClick={() => downloadReport('http://127.0.0.1:8000/api/reports/inventory-excel', 'TonKho.xlsx', setLoadingInventory)}
            disabled={loadingInventory}
            className="w-full py-3 bg-slate-900 hover:bg-green-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
          >
            {loadingInventory ? 'Đang tạo file...' : <><Download size={18} /> Tải Xuống Ngay</>}
          </button>
        </div>

        {/* CARD 2: BÁO CÁO NHẬP XUẤT (TÍNH NĂNG MỚI) */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow flex flex-col">
           <div className="flex items-start justify-between mb-4">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
              <ArrowRightLeft size={32} />
            </div>
            <span className="bg-blue-50 text-blue-700 text-xs font-bold px-2 py-1 rounded">Excel</span>
          </div>
           <h3 className="text-lg font-bold text-slate-800 mb-2">Sổ Nhật Ký Nhập Xuất</h3>
           <p className="text-slate-500 text-sm mb-6 flex-1">
             Chi tiết lịch sử giao dịch theo thời gian. Bao gồm thông tin đối tác, loại phiếu và số lượng biến động.
           </p>
           <button 
            onClick={() => downloadReport('http://127.0.0.1:8000/api/reports/transactions-excel', 'LichSuNhapXuat.xlsx', setLoadingTransactions)}
            disabled={loadingTransactions}
            className="w-full py-3 bg-white border-2 border-slate-200 text-slate-700 hover:border-blue-600 hover:text-blue-600 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
          >
            {loadingTransactions ? 'Đang xử lý...' : <><History size={18} /> Xuất Dữ Liệu</>}
          </button>
        </div>

      </div>
    </div>
  );
};

export default Reports;