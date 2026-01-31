import React, { useState, useRef, useEffect } from 'react';
import { Product, AIAnalysisResult } from '../types';
import { warehouseApi } from '../services/api';
import { 
  Sparkles, Loader2, AlertTriangle, CheckCircle2, TrendingUp, RefreshCw, 
  ArrowRight, Box, DollarSign, BrainCircuit, AlertOctagon, MessageSquare, Send
} from 'lucide-react';

interface AIAssistantProps {
  products: Product[];
  onRestock: (productName: string, quantity: number) => void;
}

// Các bước loading giả lập
const LOADING_STEPS = [
  "Đang kết nối tới cơ sở dữ liệu...",
  "Đang quét tồn kho và lịch sử giao dịch...",
  "Đang phân tích xu hướng tiêu thụ...",
  "Đang tổng hợp các đề xuất tối ưu...",
  "Đang hoàn tất báo cáo..."
];

const AIAssistant: React.FC<AIAssistantProps> = ({ products, onRestock }) => {
  // Chỉ còn 2 tab: health và chat
  const [activeTab, setActiveTab] = useState<'health' | 'chat'>('health');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingStep, setLoadingStep] = useState(0);

  // --- HEALTH CHECK STATE ---
  const [healthResult, setHealthResult] = useState<AIAnalysisResult | null>(null);

  // --- CHATBOT STATE ---
  const [messages, setMessages] = useState<{role: 'user' | 'ai', content: string}[]>([
    { role: 'ai', content: 'Xin chào! Tôi là trợ lý kho hàng. Bạn muốn biết thông tin gì? (Ví dụ: Tổng giá trị kho? Sản phẩm nào sắp hết?)' }
  ]);
  const [inputQuestion, setInputQuestion] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeTab]);

  // Hiệu ứng chữ loading
  useEffect(() => {
    let interval: any;
    if (loading && activeTab === 'health') {
      setLoadingStep(0);
      interval = setInterval(() => {
        setLoadingStep((prev) => (prev < LOADING_STEPS.length - 1 ? prev + 1 : prev));
      }, 800);
    }
    return () => clearInterval(interval);
  }, [loading, activeTab]);

  // --- HANDLERS ---

  const handleAnalyzeHealth = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await warehouseApi.analyzeInventory();
      setHealthResult(data);
    } catch (err) {
      console.error("Lỗi AI:", err);
      setError("Không thể kết nối với bộ não AI. Vui lòng kiểm tra lại Backend.");
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputQuestion.trim()) return;

    const userQ = inputQuestion;
    setInputQuestion('');
    setMessages(prev => [...prev, { role: 'user', content: userQ }]);
    
    // Typing indicator
    setMessages(prev => [...prev, { role: 'ai', content: '...' }]);

    try {
      const answer = await warehouseApi.chatWithAI(userQ);
      setMessages(prev => {
        const newMsgs = [...prev];
        newMsgs.pop(); // Xóa dấu ...
        return [...newMsgs, { role: 'ai', content: answer }];
      });
    } catch (err) {
      setMessages(prev => {
        const newMsgs = [...prev];
        newMsgs.pop();
        return [...newMsgs, { role: 'ai', content: 'Xin lỗi, tôi gặp lỗi kết nối server.' }];
      });
    }
  };

  // Helper format text
  const renderFormattedText = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index} className="text-indigo-700 font-bold">{part.slice(2, -2)}</strong>;
      }
      return <span key={index}>{part}</span>;
    });
  };

  return (
<div className="max-w-6xl mx-auto space-y-8 pb-10 flex flex-col">      
      {/* Header Section */}
      <div className="text-center space-y-4 shrink-0">
        <div className="inline-flex items-center justify-center p-4 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-2xl shadow-xl shadow-indigo-200 mb-2">
          <BrainCircuit className="text-white w-10 h-10 animate-pulse" />
        </div>
        <h2 className="text-4xl font-extrabold text-slate-800 tracking-tight">Trợ Lý Kho Hàng AI</h2>
        <p className="text-slate-500 text-lg max-w-2xl mx-auto">
          Sử dụng Gemini để phân tích tồn kho và trả lời các câu hỏi về dữ liệu kinh doanh.
        </p>
      </div>

      {/* Tab Switcher */}
      <div className="flex justify-center gap-4 shrink-0">
        <button 
          onClick={() => setActiveTab('health')}
          className={`px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all ${
            activeTab === 'health' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-slate-500 hover:bg-slate-50'
          }`}
        >
          <Sparkles size={20} /> Kiểm Tra Sức Khỏe
        </button>
        <button 
          onClick={() => setActiveTab('chat')}
          className={`px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all ${
            activeTab === 'chat' ? 'bg-emerald-600 text-white shadow-lg' : 'bg-white text-slate-500 hover:bg-slate-50'
          }`}
        >
          <MessageSquare size={20} /> Hỏi Đáp Dữ Liệu
        </button>
      </div>

      {/* Error Section */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-r shadow-sm flex items-center gap-3 animate-fade-in">
          <AlertOctagon size={24} />
          <div>
            <p className="font-bold">Đã xảy ra lỗi</p>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* ================= TAB 1: HEALTH CHECK ================= */}
      {activeTab === 'health' && (
        <>
          {/* Start Button */}
          {!healthResult && !loading && !error && (
            <div className="text-center py-10">
              <p className="text-slate-500 mb-6">Quét toàn bộ kho để tìm rủi ro hết hàng và tồn kho ảo.</p>
              <button 
                onClick={handleAnalyzeHealth}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-full font-bold shadow-lg transition-transform hover:scale-105"
              >
                Bắt Đầu Quét
              </button>
            </div>
          )}

          {/* Loading View */}
          {loading && (
            <div className="bg-white rounded-3xl p-12 shadow-sm border border-slate-100 text-center space-y-6 animate-fade-in">
              <div className="relative w-24 h-24 mx-auto">
                <div className="absolute inset-0 border-4 border-indigo-100 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin"></div>
                <BrainCircuit className="absolute inset-0 m-auto text-indigo-600 w-8 h-8" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">{LOADING_STEPS[loadingStep]}</h3>
              </div>
              <div className="w-64 h-2 bg-slate-100 rounded-full mx-auto overflow-hidden">
                <div 
                  className="h-full bg-indigo-500 transition-all duration-500 ease-out"
                  style={{ width: `${((loadingStep + 1) / LOADING_STEPS.length) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Result View */}
          {healthResult && !loading && (
            <div className="space-y-6 animate-fade-in-up">
              
              {/* Top Toolbar */}
              <div className="flex justify-end">
                <button onClick={handleAnalyzeHealth} className="text-indigo-600 hover:bg-indigo-50 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
                  <RefreshCw size={16} /> Phân tích lại
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Summary & Recommendations */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Summary Card */}
                  <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-8 rounded-3xl shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10"><Sparkles size={120} /></div>
                    <h3 className="text-2xl font-bold mb-4 flex items-center gap-3"><Sparkles className="text-yellow-400" /> Tổng Quan</h3>
                    <div className="text-slate-200 text-lg leading-relaxed font-light">{renderFormattedText(healthResult.summary)}</div>
                  </div>

                  {/* Recommendations */}
                  <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
                    <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                      <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2"><Box className="text-indigo-600" /> Đề Xuất Nhập Hàng</h3>
                      <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold">{healthResult.restockRecommendations.length} Đề xuất</span>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {healthResult.restockRecommendations.length === 0 ? (
                        <div className="p-8 text-center text-slate-400">Không có đề xuất nhập hàng nào. Kho đang ổn định!</div>
                      ) : (
                        healthResult.restockRecommendations.map((rec, idx) => (
                          <div key={idx} className="p-6 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-bold text-slate-800 text-lg">{rec.productName}</h4>
                                <span className="bg-red-50 text-red-600 text-[10px] px-2 py-0.5 rounded border border-red-100 uppercase font-bold">Cần nhập</span>
                              </div>
                              <p className="text-slate-500 text-sm">{rec.reason}</p>
                            </div>
                            <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                              <div className="text-right">
                                <p className="text-xs text-slate-400 font-medium uppercase">Số lượng</p>
                                <p className="text-2xl font-bold text-indigo-600">+{rec.suggestQuantity}</p>
                              </div>
                              <button 
                                onClick={() => onRestock(rec.productName, rec.suggestQuantity)}
                                title="Tạo phiếu nhập"
                                className="bg-slate-900 hover:bg-indigo-600 text-white p-3 rounded-xl transition-colors shadow-lg group"
                              >
                                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Column: Stats */}
                <div className="space-y-6">
                  {/* Alerts */}
                  <div className={`rounded-3xl p-6 border shadow-sm ${healthResult.lowStockItems.length > 0 ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'}`}>
                    <h3 className={`font-bold text-lg mb-4 flex items-center gap-2 ${healthResult.lowStockItems.length > 0 ? 'text-red-700' : 'text-green-700'}`}>
                      {healthResult.lowStockItems.length > 0 ? <AlertTriangle /> : <CheckCircle2 />}
                      {healthResult.lowStockItems.length > 0 ? 'Cảnh Báo Tồn Kho' : 'Trạng Thái An Toàn'}
                    </h3>
                    {healthResult.lowStockItems.length > 0 ? (
                      <ul className="space-y-2">
                        {healthResult.lowStockItems.map((item, idx) => (
                          <li key={idx} className="bg-white p-3 rounded-xl text-sm font-medium text-slate-700 shadow-sm border border-red-100 flex items-center justify-between">
                            {item} <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                          </li>
                        ))}
                      </ul>
                    ) : <p className="text-green-600 text-sm">Tất cả sản phẩm đều trên mức tối thiểu.</p>}
                  </div>

                  {/* Value Analysis */}
                  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                    <h3 className="font-bold text-lg text-emerald-700 mb-4 flex items-center gap-2"><DollarSign className="bg-emerald-100 p-1 rounded-md" size={28} /> Phân Tích Dòng Vốn</h3>
                    <div className="text-slate-600 text-sm leading-relaxed space-y-2">
                      {healthResult.valueAnalysis.split('\n').map((line, i) => (
                        <p key={i} className="py-1 border-b border-slate-50 last:border-0">{renderFormattedText(line)}</p>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ================= TAB 2: CHATBOT ================= */}
      {activeTab === 'chat' && (
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 flex flex-col h-[600px] overflow-hidden animate-fade-in-up">
          {/* Chat History */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`
                  max-w-[80%] p-4 rounded-2xl text-sm leading-relaxed
                  ${msg.role === 'user' 
                    ? 'bg-emerald-600 text-white rounded-tr-none' 
                    : 'bg-white text-slate-700 shadow-sm border border-slate-200 rounded-tl-none'}
                `}>
                  {msg.content === '...' ? <Loader2 size={16} className="animate-spin"/> : renderFormattedText(msg.content)}
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 bg-white border-t border-slate-200">
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <input 
                type="text" 
                className="flex-1 border border-slate-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                placeholder="Hỏi về tồn kho, doanh thu, lịch sử nhập xuất..."
                value={inputQuestion}
                onChange={e => setInputQuestion(e.target.value)}
              />
              <button 
                type="submit"
                disabled={!inputQuestion.trim() || messages[messages.length-1].content === '...'}
                className="bg-emerald-600 hover:bg-emerald-700 text-white p-3 rounded-xl transition-colors disabled:opacity-50"
              >
                <Send size={24} />
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default AIAssistant;