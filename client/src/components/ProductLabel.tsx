import React from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Product } from '../types';

interface ProductLabelProps {
  product: Product;
}

// Dùng React.forwardRef để thư viện in ấn có thể "chụp" được component này
export const ProductLabel = React.forwardRef<HTMLDivElement, ProductLabelProps>(({ product }, ref) => {
  return (
    <div ref={ref} className="p-4 bg-white" style={{ width: '100%', maxWidth: '400px' }}>
      {/* Đây là khung của 1 con tem (Ví dụ kích thước tem 50x30mm hoặc tương tự) */}
      <div className="border-2 border-black p-2 rounded-lg flex items-center gap-4">
        <div className="shrink-0">
          <QRCodeCanvas value={product.sku} size={80} level={"H"} />
        </div>
        <div className="flex-1 overflow-hidden">
          <h3 className="font-bold text-sm uppercase truncate leading-tight mb-1">
            {product.name}
          </h3>
          <p className="font-mono text-xs font-bold mb-1">SKU: {product.sku}</p>
          <p className="text-xs text-slate-600">Giá: {product.price.toLocaleString()} đ</p>
          <p className="text-[10px] text-slate-400 mt-1">SmartWMS Inventory</p>
        </div>
      </div>
    </div>
  );
});