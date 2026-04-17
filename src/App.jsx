import React, { useState, useEffect, useRef } from 'react';
import { User, Clock, Users, PlusCircle, CheckCircle2, Trophy, Ghost, Sparkles, Lock, Copy, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from './supabaseClient';

// --- 豆包API配置 ---
const DOUBAO_API_URL = 'https://ark.cn-beijing.volces.com/api/v3/chat/completions';
const DOUBAO_API_KEY = import.meta.env.VITE_DOUBAO_API_KEY;
const DOUBAO_MODEL = 'doubao-seed-2-0-pro-260215';

// 生成队名函数
const generateTeamName = async (nickname1, nickname2) => {
  if (!DOUBAO_API_KEY) {
    console.warn('豆包API Key未配置，使用默认队名');
    return '无敌战队';
  }

  const prompt = `你是擅长抽象梗和无厘头幽默的中文起名助手。

给“${nickname1}”和“${nickname2}”起一个2-8字中文队名：

要求：
- 风格：抽象、搞笑、有梗，像网友随口起的神名
- 可以从名字中获得灵感，但不要求直接包含或拼接名字
- 优先：谐音联想、意境延伸、反差感、脑洞

禁止：
- 直接拼接两个名字
- 生硬包含完整昵称
- 如输出包含两个完整昵称或明显拼接，则视为错误
输出：
只允许输出一个队名，禁止其他解释或思考，`;

  try {
    console.log('开始调用豆包API...');
    console.log('API URL:', DOUBAO_API_URL);
    console.log('Model:', DOUBAO_MODEL);

    const response = await fetch(DOUBAO_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DOUBAO_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: DOUBAO_MODEL,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 75,
        temperature: 0.8,
        thinking: { type: 'disabled' },
      }),
    });

    console.log('HTTP状态码:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API错误响应:', errorText);
      return '无敌战队';
    }

    const data = await response.json();
    console.log('API响应:', data);
    const teamName = data.choices?.[0]?.message?.content?.trim() || '无敌战队';
    return teamName;
  } catch (error) {
    if (error.name === 'AbortError') {
      console.error('API请求超时（30秒）');
    } else {
      console.error('生成队名失败:', error);
    }
    return '无敌战队';
  }
};

// --- 时间逻辑配置 ---
const START_HOUR = 20;
const END_HOUR = 22;
const STEPS_PER_HOUR = 4; // 每15分钟一个点
const TOTAL_STEPS = (END_HOUR - START_HOUR) * STEPS_PER_HOUR; // 总共8个时间段9个点

// --- 等级配置 ---
const LEVELS = [
  { level: 1, title: 'QQ堂平民' },
  { level: 2, title: '糖果爱好者' },
  { level: 3, title: '采购学徒' },
  { level: 4, title: '熬糖工人' },
  { level: 5, title: '拌糖熟练工' },
  { level: 6, title: '甜味技术员' },
  { level: 7, title: '捏形师傅' },
  { level: 8, title: '品糖高手' },
  { level: 9, title: '造型专家' },
  { level: 10, title: 'QQ糖大师' },
  { level: 11, title: '糖果志愿者' },
  { level: 12, title: '奶酪预备兵' },
  { level: 13, title: 'QQ糖战士' },
  { level: 14, title: '刨冰骑兵' },
  { level: 15, title: '棒棒糖游侠' },
  { level: 16, title: '饼干队长' },
  { level: 17, title: '果冻骑士' },
  { level: 18, title: '巧克力将军' },
  { level: 19, title: '冰淇淋勇者' },
  { level: 20, title: 'QQT英雄' },
  { level: 21, title: '糖果镇长' },
  { level: 22, title: '中华城主' },
  { level: 23, title: '梦幻岛主' },
  { level: 24, title: '星星公爵' },
  { level: 25, title: '月亮王子/公主' },
  { level: 26, title: '太阳国王/女王' },
  { level: 27, title: '紫钻皇帝/女皇' },
  { level: 28, title: '酷比大天使' },
  { level: 29, title: '创世之神' },
  { level: 30, title: '???' },
];

const stepToTime = (step) => {
  const mins = step * 15;
  const h = Math.floor(mins / 60) + START_HOUR;
  const m = mins % 60;
  return `${h}:${m === 0 ? '00' : m}`;
};

const App = () => {
  // 状态：当前选择的步数 [开始步数, 结束步数]
  const [timeRange, setTimeRange] = useState([0, 2]); // 默认 20:00 - 20:30
  const [nickname, setNickname] = useState('');
  const [selectedLevel, setSelectedLevel] = useState(1); // 默认等级1
  const [acceptStrangers, setAcceptStrangers] = useState(false); // 是否接受陌生人组队
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);

  // QQ弹窗相关状态
  const [showQQModal, setShowQQModal] = useState(false);
  const [qqNumber, setQQNumber] = useState('');
  const [pendingSubmit, setPendingSubmit] = useState(false);

  // 查看联系方式弹窗
  const [showContactModal, setShowContactModal] = useState(false);
  const [contactInfo, setContactInfo] = useState(null);

  // 加入时输入昵称弹窗
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinNickname, setJoinNickname] = useState('');
  const [joiningPlayer, setJoiningPlayer] = useState(null);

  // 拖拽相关
  const trackRef = useRef(null);
  const [dragging, setDragging] = useState(null); // 'start' or 'end'

  // 获取预约列表
  const fetchReservations = async () => {
    const { data } = await supabase
      .from('reservations')
      .select('*')
      .order('created_at', { ascending: false });
    // 前端排序：Waiting 在前，Matched 在后，同状态下新的在前
    const sortedData = (data || []).sort((a, b) => {
      // Waiting 状态排在前面
      if (a.status === 'Waiting' && b.status === 'Matched') return -1;
      if (a.status === 'Matched' && b.status === 'Waiting') return 1;
      // 同状态下按时间倒序（新的在前）
      return new Date(b.created_at) - new Date(a.created_at);
    });
    setReservations(sortedData);
    setLoading(false);
  };

  // 初始化加载 + 实时订阅
  useEffect(() => {
    fetchReservations();

    const channel = supabase
      .channel('schema-db-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'reservations' }, 
        () => fetchReservations()
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  const handleMouseDown = (type) => (e) => {
    e.preventDefault();
    setDragging(type);
  };

  useEffect(() => {
    if (!dragging) return;

    const handleMove = (clientX) => {
      if (!trackRef.current) return;
      const rect = trackRef.current.getBoundingClientRect();
      const x = clientX - rect.left;
      const percentage = Math.max(0, Math.min(1, x / rect.width));
      const step = Math.round(percentage * TOTAL_STEPS);

      if (dragging === 'start') {
        setTimeRange(prev => [Math.min(step, prev[1] - 1), prev[1]]);
      } else {
        setTimeRange(prev => [prev[0], Math.max(step, prev[0] + 1)]);
      }
    };

    const handleMouseMove = (e) => handleMove(e.clientX);
    const handleTouchMove = (e) => {
      e.preventDefault();
      handleMove(e.touches[0].clientX);
    };

    const handleEnd = () => setDragging(null);

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleEnd);
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleEnd);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [dragging]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nickname.trim()) return;

    // 频率限制：10秒内只能提交一次
    const lastSubmit = localStorage.getItem('lastSubmitTime');
    const COOLDOWN = 10000; // 10秒
    if (lastSubmit && Date.now() - parseInt(lastSubmit) < COOLDOWN) {
      const remaining = Math.ceil((COOLDOWN - (Date.now() - parseInt(lastSubmit))) / 1000);
      alert(`操作太频繁，请 ${remaining} 秒后再试`);
      return;
    }

    // 检查该昵称是否已有任何预约记录（无论是否匹配成功，当天只能有一个队友）
    const existingReservation = reservations.find(
      r => r.nickname === nickname.trim()
    );
    if (existingReservation) {
      alert('您今天已经创建过预约了，排位每天只能固定一个队友');
      return;
    }

    // 弹出QQ输入框
    setShowQQModal(true);
    setPendingSubmit(true);
  };

  // 确认提交（带QQ）
  const confirmSubmit = async () => {
    // 如果接受陌生人，QQ是必填的
    if (acceptStrangers && !qqNumber.trim()) {
      alert('接受陌生人组队时，QQ号码是必填项');
      return;
    }

    const { error } = await supabase
      .from('reservations')
      .insert([{
        nickname: nickname,
        start_time: stepToTime(timeRange[0]),
        end_time: stepToTime(timeRange[1]),
        level: selectedLevel,
        accept_strangers: acceptStrangers,
        qq_number: qqNumber.trim() || null
      }]);

    if (!error) {
      localStorage.setItem('lastSubmitTime', Date.now().toString());
      setNickname('');
      setSelectedLevel(1);
      setAcceptStrangers(false);
      setQQNumber('');
      setShowQQModal(false);
      setPendingSubmit(false);
    } else {
      alert('发布失败：' + error.message);
    }
  };

  // 取消提交
  const cancelSubmit = () => {
    setShowQQModal(false);
    setPendingSubmit(false);
    setQQNumber('');
  };

  const handleJoin = async (player) => {
    // 频率限制：10秒内只能操作一次
    const lastJoin = localStorage.getItem('lastJoinTime');
    const COOLDOWN = 10000;
    if (lastJoin && Date.now() - parseInt(lastJoin) < COOLDOWN) {
      const remaining = Math.ceil((COOLDOWN - (Date.now() - parseInt(lastJoin))) / 1000);
      alert(`操作太频繁，请 ${remaining} 秒后再试`);
      return;
    }

    // 打开加入弹窗
    setJoiningPlayer(player);
    setShowJoinModal(true);
  };

  // 确认加入
  const confirmJoin = async () => {
    if (!joinNickname.trim()) {
      alert('请输入您的昵称');
      return;
    }

    if (!joiningPlayer) return;

    // 检查该昵称是否已作为发布者存在（当天只能有一个队友）
    const existingAsPublisher = reservations.find(
      r => r.nickname === joinNickname.trim()
    );
    if (existingAsPublisher) {
      alert('您今天已经创建过预约了，排位每天只能固定一个队友');
      return;
    }

    // 检查该昵称是否已作为队友加入过其他队伍
    const existingAsTeammate = reservations.find(
      r => r.teammate === joinNickname.trim()
    );
    if (existingAsTeammate) {
      alert('您今天已经加入过队伍了，排位每天只能固定一个队友');
      return;
    }

    // 先更新数据库，立即加入
    try {
      const { error } = await supabase
        .from('reservations')
        .update({
          status: 'Matched',
          teammate: joinNickname.trim()
        })
        .eq('id', joiningPlayer.id);

      if (error) {
        console.error('数据库更新失败:', error);
        alert('加入失败：' + error.message);
        return;
      }

      console.log('加入成功');
      localStorage.setItem('lastJoinTime', Date.now().toString());

      // 关闭加入弹窗
      setShowJoinModal(false);
      setJoinNickname('');

      // 如果发布者留下了QQ，显示查看联系方式弹窗
      if (joiningPlayer.qq_number) {
        setContactInfo({
          qq: joiningPlayer.qq_number,
          nickname: joiningPlayer.nickname
        });
        setShowContactModal(true);
      }

      // 异步生成队名（不阻塞）
      generateTeamName(joiningPlayer.nickname, joinNickname.trim()).then(async (teamName) => {
        console.log('生成的队名:', teamName);
        // 更新队名到数据库
        await supabase
          .from('reservations')
          .update({ team_name: teamName })
          .eq('id', joiningPlayer.id);
      }).catch(err => {
        console.error('生成队名失败:', err);
      });

      setJoiningPlayer(null);
    } catch (err) {
      console.error('数据库操作异常:', err);
      alert('加入失败，请检查网络');
    }
  };

  // 取消加入
  const cancelJoin = () => {
    setShowJoinModal(false);
    setJoinNickname('');
    setJoiningPlayer(null);
  };

  // 复制QQ到剪贴板
  const copyQQ = async (qq) => {
    try {
      await navigator.clipboard.writeText(qq);
      alert('QQ号码已复制到剪贴板');
    } catch (err) {
      alert('复制失败，请手动复制：' + qq);
    }
  };

  return (
    <div className="min-h-screen bg-[#F0F2FF] font-sans text-slate-800 pb-20">
      {/* 顶部渐变色装饰层 */}
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
            排位窗口开放中：20:00 - 22:00
          </motion.div>
          <h1 className="text-5xl md:text-6xl font-black text-white tracking-tighter drop-shadow-md">
            QQ TANG <span className="text-yellow-300">HUB</span>
          </h1>
        </header>

        {/* 上方游戏预约卡片 */}
        <section className="mb-12">
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-white rounded-[40px] p-8 md:p-12 shadow-2xl shadow-indigo-200/50 border border-white"
          >
            <form onSubmit={handleSubmit} className="space-y-10">
              <div className="flex flex-col md:flex-row md:items-end gap-8">
                <div className="flex-1 space-y-4">
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">
                      你的昵称
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
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">
                      选择等级
                    </label>
                    <select
                      value={selectedLevel}
                      onChange={(e) => setSelectedLevel(parseInt(e.target.value))}
                      className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-purple-400 focus:bg-white transition-all outline-none text-base font-bold appearance-none cursor-pointer"
                      style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1.5rem' }}
                    >
                      {LEVELS.map((item) => (
                        <option key={item.level} value={item.level}>
                          LV.{item.level} {item.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 是否接受陌生人组队 */}
                  <div className="flex items-center gap-3 px-2">
                    <button
                      type="button"
                      onClick={() => setAcceptStrangers(!acceptStrangers)}
                      className={`relative w-12 h-6 rounded-full transition-colors duration-200 focus:outline-none ${
                        acceptStrangers ? 'bg-purple-500' : 'bg-slate-300'
                      }`}
                    >
                      <span
                        className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${
                          acceptStrangers ? 'translate-x-6' : 'translate-x-0'
                        }`}
                      />
                    </button>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-700">
                        接受陌生人组队
                      </span>
                      <span className="text-xs text-slate-400">
                        {acceptStrangers ? '陌生人可以直接加入' : '仅限熟人加入'}
                      </span>
                    </div>
                  </div>
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

              {/* 时间范围选择器 */}
              <div className="relative pt-10 pb-6">
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-8 ml-1 text-center">
                  请拖动滑块选择时间段：<span className="text-purple-600 text-lg">{stepToTime(timeRange[0])} 到 {stepToTime(timeRange[1])}</span>
                </label>
                
                <div className="relative px-4">
                  {/* 滑动条本体 */}
                  <div ref={trackRef} className="h-4 w-full bg-slate-100 rounded-full relative cursor-pointer">
                    {/* 选中范围高亮 */}
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

                    {/* 左侧滑块手柄 */}
                    <div 
                      onMouseDown={handleMouseDown('start')}
                      onTouchStart={handleMouseDown('start')}
                      className={`absolute top-1/2 -translate-y-1/2 w-8 h-8 bg-white border-4 border-purple-600 rounded-full shadow-lg z-20 cursor-grab active:cursor-grabbing transition-transform ${dragging === 'start' ? 'scale-125' : 'hover:scale-110'}`}
                      style={{ left: `calc(${(timeRange[0] / TOTAL_STEPS) * 100}% - 16px)` }}
                    />
                    {/* 右侧滑块手柄 */}
                    <div 
                      onMouseDown={handleMouseDown('end')}
                      onTouchStart={handleMouseDown('end')}
                      className={`absolute top-1/2 -translate-y-1/2 w-8 h-8 bg-white border-4 border-pink-500 rounded-full shadow-lg z-20 cursor-grab active:cursor-grabbing transition-transform ${dragging === 'end' ? 'scale-125' : 'hover:scale-110'}`}
                      style={{ left: `calc(${(timeRange[1] / TOTAL_STEPS) * 100}% - 16px)` }}
                    />
                  </div>
                  
                  {/* 时间刻度标签 */}
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

        {/* 下方玩家列表 */}
        <section>
          <div className="flex items-center justify-between mb-8 px-2">
            <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
              <Users className="text-indigo-600" /> 正在寻找队友的玩家
            </h2>
            <div className="h-px flex-1 mx-6 bg-slate-200 hidden md:block" />
            <span className="text-slate-400 font-bold text-sm bg-slate-100 px-4 py-1 rounded-full">
              {reservations.length} 个预约
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loading ? (
              <div className="col-span-full text-center py-20">
                <div className="inline-block w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-slate-400 mt-4 font-medium">加载中...</p>
              </div>
            ) : reservations.length === 0 ? (
              <div className="col-span-full text-center py-20 bg-white/50 rounded-3xl border-2 border-dashed border-slate-200">
                <p className="text-slate-400 font-medium">还没有人在寻找队友，做第一个发起预约的人吧！</p>
              </div>
            ) : (
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
                            LV.{player.level || 1}<span className="ml-2"></span>{LEVELS.find(l => l.level === (player.level || 1))?.title}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3 mb-6">
                      <div className="flex items-center gap-2 text-slate-500 font-medium text-sm">
                        <Clock size={14} className="text-slate-400" />
                        <span>时间段: <span className="text-slate-800 font-bold">{player.start_time}–{player.end_time}</span></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${player.status === 'Matched' ? 'bg-green-500' : 'bg-blue-500 animate-pulse'}`} />
                        <span className={`text-xs font-bold ${player.status === 'Matched' ? 'text-green-600' : 'text-blue-600'}`}>
                          {player.status === 'Matched' ? '已完成匹配' : '正在空等待加入...'}
                        </span>
                      </div>
                      {/* 显示是否接受陌生人 */}
                      {player.accept_strangers ? (
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-purple-400" />
                          <span className="text-xs font-bold text-purple-600">
                            接受陌生人组队
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Lock size={10} className="text-orange-500" />
                          <span className="text-xs font-bold text-orange-600">
                            仅限熟人加入
                          </span>
                        </div>
                      )}
                    </div>

                    {player.status === 'Matched' ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 bg-green-50 p-3 rounded-2xl border border-green-100">
                          <CheckCircle2 size={16} className="text-green-500" />
                          <p className="text-xs font-bold text-green-700">队友：{player.teammate}</p>
                        </div>
                        {player.team_name ? (
                          <div className="flex items-center gap-1.5 px-3 py-1.5">
                            <Sparkles size={12} className="text-purple-400" />
                            <p className="text-[10px] font-medium text-slate-400">
                              队名：<span className="text-purple-500 font-bold">{player.team_name}</span>
                            </p>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 px-3 py-1.5">
                            <div className="w-3 h-3 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                            <p className="text-[10px] font-medium text-purple-400">正在生成队名...</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <button 
                        onClick={() => handleJoin(player)}
                        className="w-full bg-indigo-50 text-indigo-600 font-black py-3 rounded-2xl hover:bg-indigo-600 hover:text-white transition-all flex items-center justify-center gap-2 group"
                      >
                        加入对战 2v2
                        <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full group-hover:bg-white animate-bounce" />
                      </button>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </section>
      </div>

      {/* QQ输入弹窗 */}
      <AnimatePresence>
        {showQQModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={cancelSubmit}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <User size={32} className="text-purple-600" />
                </div>
                <h3 className="text-xl font-black text-slate-800 mb-2">
                  请留下您的联系方式
                </h3>
                <p className="text-sm text-slate-500">
                  方便队友加入后联系您
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    QQ号码 {acceptStrangers ? (
                      <span className="text-red-500">*</span>
                    ) : (
                      <span className="text-slate-400 font-normal">(可选)</span>
                    )}
                  </label>
                  <input
                    type="text"
                    placeholder="输入您的QQ号..."
                    value={qqNumber}
                    onChange={(e) => setQQNumber(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-purple-500 focus:bg-white transition-all outline-none text-lg font-bold"
                  />
                  {acceptStrangers && (
                    <p className="text-xs text-purple-600 mt-2">
                      您选择了接受陌生人组队，QQ号码是必填项
                    </p>
                  )}
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={cancelSubmit}
                    className="flex-1 py-3 px-4 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-all"
                  >
                    取消
                  </button>
                  <button
                    onClick={confirmSubmit}
                    className="flex-1 py-3 px-4 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 transition-all"
                  >
                    确认发布
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 加入时输入昵称弹窗 */}
      <AnimatePresence>
        {showJoinModal && joiningPlayer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={cancelJoin}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users size={32} className="text-indigo-600" />
                </div>
                <h3 className="text-xl font-black text-slate-800 mb-2">
                  加入队伍
                </h3>
                <p className="text-sm text-slate-500">
                  您即将加入 <span className="font-bold text-indigo-600">{joiningPlayer.nickname}</span> 的队伍
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    您的昵称 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="输入您的游戏ID..."
                    value={joinNickname}
                    onChange={(e) => setJoinNickname(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-indigo-500 focus:bg-white transition-all outline-none text-lg font-bold"
                    autoFocus
                  />
                </div>

                <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Clock size={14} className="text-slate-400" />
                    <span>时间段: <span className="font-bold text-slate-800">{joiningPlayer.start_time} - {joiningPlayer.end_time}</span></span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Trophy size={14} className="text-slate-400" />
                    <span>等级: <span className="font-bold text-slate-800">LV.{joiningPlayer.level || 1}</span></span>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={cancelJoin}
                    className="flex-1 py-3 px-4 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-all"
                  >
                    取消
                  </button>
                  <button
                    onClick={confirmJoin}
                    className="flex-1 py-3 px-4 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all"
                  >
                    确认加入
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 查看联系方式弹窗 */}
      <AnimatePresence>
        {showContactModal && contactInfo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowContactModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-start mb-6">
                <div className="text-center flex-1">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 size={32} className="text-green-600" />
                  </div>
                  <h3 className="text-xl font-black text-slate-800 mb-2">
                    组队成功！
                  </h3>
                  <p className="text-sm text-slate-500">
                    您已成功加入 {contactInfo.nickname} 的队伍
                  </p>
                </div>
                <button
                  onClick={() => setShowContactModal(false)}
                  className="p-2 hover:bg-slate-100 rounded-full transition-all"
                >
                  <X size={20} className="text-slate-400" />
                </button>
              </div>

              <div className="bg-purple-50 rounded-2xl p-6 mb-6">
                <p className="text-sm text-slate-600 mb-2 text-center">队友的联系方式</p>
                <div className="flex items-center justify-center gap-3">
                  <span className="text-2xl font-black text-purple-700">{contactInfo.qq}</span>
                  <button
                    onClick={() => copyQQ(contactInfo.qq)}
                    className="p-2 bg-white rounded-xl shadow-sm hover:shadow-md transition-all text-purple-600"
                    title="复制QQ"
                  >
                    <Copy size={18} />
                  </button>
                </div>
              </div>

              <button
                onClick={() => setShowContactModal(false)}
                className="w-full py-3 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 transition-all"
              >
                知道了
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;