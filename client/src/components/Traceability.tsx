import React, { useState } from 'react';
import { warehouseApi, TimelineEvent } from '../services/api';
import { Search, Clock, ArrowDownCircle, ArrowUpCircle, Wrench, AlertCircle, SearchX } from 'lucide-react';

const Traceability: React.FC = () => {
  const [imei, setImei] = useState('');
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!imei.trim()) return;

    setLoading(true);
    setHasSearched(true);
    try {
      const data = await warehouseApi.traceImei(imei.trim());
      setTimeline(data);
    } catch (error) {
      console.error("Lỗi tra cứu:", error);
      setTimeline([]);
    } finally {
      setLoading(false);
    }
  };

  // Helper chọn icon và màu sắc dựa trên loại sự kiện
  const getEventStyle = (event: TimelineEvent) => {
    if (event.type === 'WARRANTY') {
      return { icon: Wrench, color: 'text-amber-600', bg: 'bg-amber-100', border: 'border-amber-200' };
    }
    if (event.sub_type === 'IMPORT') {
      return { icon: ArrowDownCircle, color: 'text-green-600', bg: 'bg-green-100', border: 'border-green-200' };
    }
    // Export
    return { icon: ArrowUpCircle, color: 'text-blue-600', bg: 'bg-blue-100', border: 'border-blue-200' };
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-fade-in pb-10">
      
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-slate-800">Tra Cứu Lịch Sử IMEI</h2>
        <p className="text-slate-500">Theo dõi vòng đời sản phẩm từ khi nhập kho đến bảo hành.</p>
      </div>

      {/* Search Box */}
      <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-100">
        <form onSubmit={handleSearch} className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text" 
              className="w-full pl-11 pr-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-lg"
              placeholder="Nhập số IMEI hoặc Serial Number..."
              value={imei}
              onChange={e => setImei(e.target.value)}
            />
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-md disabled:opacity-70"
          >
            {loading ? 'Đang tìm...' : 'Tra Cứu'}
          </button>
        </form>
      </div>

      {/* Results */}
      <div className="space-y-6">
        {hasSearched && timeline.length === 0 && !loading && (
          <div className="text-center py-10 bg-white rounded-2xl border border-dashed border-slate-300">
             <SearchX size={48} className="mx-auto text-slate-300 mb-2" />
             <p className="text-slate-500 font-medium">Không tìm thấy dữ liệu cho IMEI này.</p>
             <p className="text-xs text-slate-400">Vui lòng kiểm tra lại mã hoặc sản phẩm chưa từng nhập kho.</p>
          </div>
        )}

        {timeline.length > 0 && (
          <div className="relative border-l-2 border-slate-200 ml-4 md:ml-6 space-y-8 pl-8 md:pl-10 py-2">
            {timeline.map((event, idx) => {
              const style = getEventStyle(event);
              const Icon = style.icon;
              
              return (
                <div key={idx} className="relative group">
                  {/* Dot on timeline */}
                  <div className={`absolute -left-[43px] md:-left-[51px] top-0 w-6 h-6 rounded-full border-4 border-white shadow-sm ${style.bg} flex items-center justify-center`}>
                     <div className={`w-2 h-2 rounded-full ${style.bg.replace('100', '500')}`}></div>
                  </div>

                  {/* Card Content */}
                  <div className={`bg-white p-5 rounded-xl border ${style.border} shadow-sm hover:shadow-md transition-all`}>
                    <div className="flex justify-between items-start mb-2">
                       <div className="flex items-center gap-2">
                          <Icon size={20} className={style.color} />
                          <h4 className="font-bold text-slate-800 text-lg">{event.title}</h4>
                       </div>
                       <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-lg">
                          <Clock size={12} />
                          {new Date(event.date).toLocaleString('vi-VN')}
                       </div>
                    </div>
                    
                    <p className="text-slate-600 mb-2">{event.description}</p>
                    
                    <div className="text-xs font-mono text-slate-400 flex items-center gap-2">
                       <span>Ref ID:</span>
                       <span className="bg-slate-50 px-1 rounded border">{event.ref_id}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Traceability;