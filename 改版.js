import React, { useState, useEffect, useRef } from 'react';
import { User, Clock, Users, PlusCircle, CheckCircle2, Trophy, Ghost } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- 时间逻辑处理 ---
const START_HOUR = 20;
const END_HOUR = 22;
const STEPS_PER_HOUR = 4; // 每15分钟一个点
const TOTAL_STEPS = (END_HOUR - START_HOUR) * STEPS_PER_HOUR; // 总共8个槽位，9个点

const stepToTime = (step) => {
  const mins = step * 15;
  const h = Math.floor(mins / 60) + START_HOUR;
  const m = mins % 60;
  return `${h}:${m === 0 ? '00' : m}`;
};

const App = () => {
  // 状态：当前滑块的步数 [开始步数, 结束步数]
  const [timeRange, setTimeRange] = useState([0, 2]); // 默认 20:00 - 20:30
  const [nickname, setNickname] = useState('');
  const [reservations, setReservations] = useState([
    { id: 1, nickname: "泡泡超人", time: "20:00–21:15", status: "Waiting", teammate: null },
    { id: 2, nickname: "酷比官方", time: "21:00–22:00", status: "Matched", teammate: "黑妞" },
  ]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!nickname.trim()) return;

    const newEntry = {
      id: Date.now(),
      nickname,
      time: `${stepToTime(timeRange[0])}–${stepToTime(timeRange[1])}`,
      status: "Waiting",
      teammate: null
    };

    setReservations([newEntry, ...reservations]);
    setNickname('');
  };

  const handleJoin = (id) => {
    setReservations(reservations.map(res => 
      res.id === id ? { ...res, status: "Matched", teammate: "你！" } : res
    ));
  };

  return (
    <div className="min-h-screen bg-[#F0F2FF] font-sans text-slate-800 pb-20">
      {/* 顶部彩色背景装饰 */}
      <div className="h-80 w-full bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 absolute top-0 left-0" />

      <div className="relative z-10 max-w-5xl mx-auto px-4 pt-12">
        {/* Header */}
        <header className="text-center mb-10">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-xl px-4 py-1.5 rounded-full border border-white/30 text-white text-sm font-bold mb-6"
          >
            <Trophy size={16} className="text-yellow-300" />
            排位赛开放中：20:00 - 22:00
          </motion.div>
          <h1 className="text-5xl md:text-6xl font-black text-white tracking-tighter drop-shadow-md">
            QQ TANG <span className="text-yellow-300">HUB</span>
          </h1>
        </header>

        {/* 上方：预约面板 (新布局) */}
        <section className="mb-12">
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-white rounded-[40px] p-8 md:p-12 shadow-2xl shadow-indigo-200/50 border border-white"
          >
            <form onSubmit={handleSubmit} className="space-y-10">
              <div className="flex flex-col md:flex-row md:items-center gap-8">
                <div className="flex-1">
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">
                    玩家昵称
                  </label>
                  <input 
                    required
                    type="text"
                    placeholder="输入你的游戏ID..."
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-purple-400 focus:bg-white transition-all outline-none text-xl font-bold"
                  />
                </div>
                
                <div className="md:w-1/3 flex items-end">
                  <button 
                    type="submit"
                    className="w-full h-[64px] bg-slate-900 text-white font-black rounded-2xl shadow-xl hover:bg-purple-600 hover:-translate-y-1 transition-all active:scale-95 flex items-center justify-center gap-2 text-lg"
                  >
                    <PlusCircle size={24} /> 发起预约
                  </button>
                </div>
              </div>

              {/* 时间范围滑动器 */}
              <div className="relative pt-10 pb-6">
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-8 ml-1 text-center">
                  调整滑块选择时间段：<span className="text-purple-600 text-lg">{stepToTime(timeRange[0])} — {stepToTime(timeRange[1])}</span>
                </label>
                
                <div className="relative px-4">
                  {/* 滑动槽背景 */}
                  <div className="h-4 w-full bg-slate-100 rounded-full relative">
                    {/* 激活区域高亮 */}
                    <div 
                      className="absolute h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full shadow-[0_0_15px_rgba(168,85,247,0.4)]"
                      style={{ 
                        left: `${(timeRange[0] / TOTAL_STEPS) * 100}%`, 
                        right: `${100 - (timeRange[1] / TOTAL_STEPS) * 100}%` 
                      }}
                    />
                    
                    {/* 刻度点 */}
                    {[...Array(TOTAL_STEPS + 1)].map((_, i) => (
                      <div 
                        key={i}
                        className={`absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full transition-colors ${
                          i >= timeRange[0] && i <= timeRange[1] ? 'bg-white' : 'bg-slate-300'
                        }`}
                        style={{ left: `${(i / TOTAL_STEPS) * 100}%` }}
                      />
                    ))}

                    {/* 双端拉杆 */}
                    <input
                      type="range"
                      min="0"
                      max={TOTAL_STEPS}
                      value={timeRange[0]}
                      onChange={(e) => setTimeRange([Math.min(parseInt(e.target.value), timeRange[1] - 1), timeRange[1]])}
                      className="absolute w-full h-4 opacity-0 cursor-pointer z-30"
                    />
                    <input
                      type="range"
                      min="0"
                      max={TOTAL_STEPS}
                      value={timeRange[1]}
                      onChange={(e) => setTimeRange([timeRange[0], Math.max(parseInt(e.target.value), timeRange[0] + 1)])}
                      className="absolute w-full h-4 opacity-0 cursor-pointer z-30"
                    />

                    {/* 视觉滑块句柄 */}
                    <div 
                      className="absolute top-1/2 -translate-y-1/2 w-8 h-8 bg-white border-4 border-purple-600 rounded-full shadow-lg z-20 pointer-events-none transition-transform active:scale-125"
                      style={{ left: `calc(${(timeRange[0] / TOTAL_STEPS) * 100}% - 16px)` }}
                    />
                    <div 
                      className="absolute top-1/2 -translate-y-1/2 w-8 h-8 bg-white border-4 border-pink-500 rounded-full shadow-lg z-20 pointer-events-none transition-transform active:scale-125"
                      style={{ left: `calc(${(timeRange[1] / TOTAL_STEPS) * 100}% - 16px)` }}
                    />
                  </div>
                  
                  {/* 时间刻度文字 */}
                  <div className="flex justify-between mt-6 text-[10px] font-black text-slate-400">
                    <span>20:00</span>
                    <span>20:30</span>
                    <span>21:00</span>
                    <span>21:30</span>
                    <span>22:00</span>
                  </div>
                </div>
              </div>
            </form>
          </motion.div>
        </section>

        {/* 下方：玩家列表 */}
        <section>
          <div className="flex items-center justify-between mb-8 px-2">
            <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
              <Users className="text-indigo-600" /> 正在寻找队友的玩家
            </h2>
            <div className="h-px flex-1 mx-6 bg-slate-200 hidden md:block" />
            <span className="text-slate-400 font-bold text-sm bg-slate-100 px-4 py-1 rounded-full">
              {reservations.length} 条预约
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence mode="popLayout">
              {reservations.map((player) => (
                <motion.div
                  key={player.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  whileHover={{ y: -5 }}
                  className={`relative p-6 rounded-[32px] overflow-hidden transition-all border-2 ${
                    player.status === 'Matched' 
                    ? 'bg-slate-100 border-transparent' 
                    : 'bg-white border-white shadow-xl shadow-slate-200/50'
                  }`}
                >
                  {/* 卡片装饰图标 */}
                  <div className="absolute -right-4 -bottom-4 opacity-5 rotate-12">
                     <Ghost size={100} />
                  </div>

                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-white text-xl font-black shadow-lg">
                        {player.nickname.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-bold text-lg text-slate-800">{player.nickname}</h3>
                        <span className="text-[10px] font-black text-purple-500 uppercase tracking-tighter bg-purple-50 px-2 py-0.5 rounded-md">
                          LV.99 糖果大师
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 mb-6">
                    <div className="flex items-center gap-2 text-slate-500 font-medium text-sm">
                      <Clock size={14} className="text-slate-400" />
                      <span>时间段: <span className="text-slate-800 font-bold">{player.time}</span></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${player.status === 'Matched' ? 'bg-green-500' : 'bg-blue-500 animate-pulse'}`} />
                      <span className={`text-xs font-bold ${player.status === 'Matched' ? 'text-green-600' : 'text-blue-600'}`}>
                        {player.status === 'Matched' ? '已达成组队' : '正在苦苦等待队友...'}
                      </span>
                    </div>
                  </div>

                  {player.status === 'Matched' ? (
                    <div className="flex items-center gap-2 bg-green-50 p-3 rounded-2xl border border-green-100">
                      <CheckCircle2 size={16} className="text-green-500" />
                      <p className="text-xs font-bold text-green-700">队友：{player.teammate}</p>
                    </div>
                  ) : (
                    <button 
                      onClick={() => handleJoin(player.id)}
                      className="w-full bg-indigo-50 text-indigo-600 font-black py-3 rounded-2xl hover:bg-indigo-600 hover:text-white transition-all flex items-center justify-center gap-2 group"
                    >
                      点击加入 2v2
                      <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full group-hover:bg-white animate-bounce" />
                    </button>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </section>
      </div>
    </div>
  );
};

export default App;