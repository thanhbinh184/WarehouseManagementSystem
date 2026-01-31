import React from 'react';
import { Transaction, TransactionType } from '../types';

interface DeliveryNoteProps {
  transaction: Transaction;
}

export const DeliveryNote = React.forwardRef<HTMLDivElement, DeliveryNoteProps>(({ transaction }, ref) => {
  const isImport = transaction.type === TransactionType.IMPORT;
  
  return (
    <div ref={ref} className="p-8 bg-white text-slate-900 font-serif" style={{ width: '100%', maxWidth: '800px', margin: '0 auto' }}>
      {/* HEADER */}
      <div className="flex justify-between items-start border-b-2 border-slate-800 pb-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold uppercase tracking-wide">SmartWMS Store</h1>
          <p className="text-sm mt-1">Địa chỉ: 123 Đường Công Nghệ, Hà Nội</p>
          <p className="text-sm">Hotline: 098.888.8888</p>
        </div>
        <div className="text-right">
          <h2 className="text-xl font-bold uppercase">{isImport ? 'PHIẾU NHẬP KHO' : 'PHIẾU XUẤT KHO'}</h2>
          <p className="text-sm italic">Mã phiếu: #{transaction.id.slice(0, 8).toUpperCase()}</p>
          <p className="text-sm italic">Ngày: {new Date(transaction.date).toLocaleDateString('vi-VN')}</p>
        </div>
      </div>

      {/* INFO */}
      <div className="mb-6 grid grid-cols-2 gap-4 text-sm">
        <div>
          <p><span className="font-bold">Đối tác:</span> {transaction.partner || 'Khách lẻ'}</p>
          <p><span className="font-bold">Người lập phiếu:</span> Admin</p> {/* Có thể lấy từ user login */}
        </div>
        <div>
          <p><span className="font-bold">Ghi chú:</span> {transaction.notes || 'Không có'}</p>
        </div>
      </div>

      {/* TABLE */}
      <table className="w-full border-collapse border border-slate-300 mb-6 text-sm">
        <thead>
          <tr className="bg-slate-100">
            <th className="border border-slate-300 p-2 text-center w-12">STT</th>
            <th className="border border-slate-300 p-2 text-left">Tên Hàng Hóa / Dịch Vụ</th>
            <th className="border border-slate-300 p-2 text-center w-24">ĐVT</th>
            <th className="border border-slate-300 p-2 text-center w-24">Số Lượng</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="border border-slate-300 p-2 text-center">1</td>
            <td className="border border-slate-300 p-2">
              <p className="font-bold">{transaction.productName}</p>
              
              {/* Hiển thị IMEI nếu có */}
              {transaction.imeis && transaction.imeis.length > 0 && (
                <div className="mt-1 text-xs text-slate-500 font-mono">
                  <strong>IMEI/Serial:</strong><br/>
                  {transaction.imeis.join(', ')}
                </div>
              )}
            </td>
            <td className="border border-slate-300 p-2 text-center">Cái</td>
            <td className="border border-slate-300 p-2 text-center font-bold">{transaction.quantity}</td>
          </tr>
        </tbody>
      </table>

      {/* SIGNATURE */}
      <div className="flex justify-between mt-12 text-center text-sm">
        <div className="w-1/3">
          <p className="font-bold mb-16">Người Lập Phiếu</p>
          <p>(Ký, họ tên)</p>
        </div>
        <div className="w-1/3">
          <p className="font-bold mb-16">{isImport ? 'Người Giao Hàng' : 'Người Nhận Hàng'}</p>
          <p>(Ký, họ tên)</p>
        </div>
      </div>
      
      <div className="mt-8 text-center text-xs italic text-slate-400">
        Cảm ơn quý khách đã tin tưởng và sử dụng dịch vụ!
      </div>
    </div>
  );
});