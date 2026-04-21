import React, { useState, useEffect, useRef } from 'react';
import { User, Clock, Users, PlusCircle, CheckCircle2, Trophy, Ghost, Sparkles, Lock, Copy, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase, ensureAnonymousAuth } from './supabaseClient';

// --- 豆包API配置 ---
const DOUBAO_API_URL = 'https://ark.cn-beijing.volces.com/api/v3/chat/completions';
const DOUBAO_API_KEY = import.meta.env.VITE_DOUBAO_API_KEY;
const DOUBAO_MODEL = 'doubao1-seed-2-0-pro-260215';

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

// --- 游戏模式配置 ---
const GAME_MODES = [
  { id: 'football', label: '足球', icon: '⚽' },
  { id: 'newyear', label: '新年', icon: '🧧' },
  { id: 'baozi', label: '包子', icon: '🥟' },
  { id: 'hero', label: '英雄', icon: '⚔️' },
];

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

// 生成最近5天的日期选项
const generateDateOptions = () => {
  const options = [];
  const today = new Date();
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

  for (let i = 0; i < 5; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    let label;
    if (i === 0) {
      label = '今天';
    } else if (i === 1) {
      label = '明天';
    } else {
      label = weekdays[date.getDay()];
    }

    options.push({
      date: dateStr,
      label,
      isToday: i === 0,
      displayDate: `${month}/${day}`
    });
  }
  return options;
};

const stepToTime = (step) => {
  const mins = step * 15;
  const h = Math.floor(mins / 60) + START_HOUR;
  const m = mins % 60;
  return `${h}:${m === 0 ? '00' : m}`;
};

const App = () => {
  // 日期选择（全局唯一）
  const dateOptions = generateDateOptions();
  const [selectedDate, setSelectedDate] = useState(dateOptions[0].date); // 默认今天

  // 状态：当前选择的步数 [开始步数, 结束步数]
  const [timeRange, setTimeRange] = useState([0, TOTAL_STEPS]); // 默认 20:00 - 22:00 占满
  const [nickname, setNickname] = useState('');
  const [selectedLevel, setSelectedLevel] = useState(1); // 默认等级1
  const [acceptStrangers, setAcceptStrangers] = useState(false); // 是否接受陌生人组队
  const [selectedModes, setSelectedModes] = useState(['football']); // 默认勾选足球
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState(null); // 当前用户ID

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
  const [joinQQNumber, setJoinQQNumber] = useState(''); // 加入者QQ号码
  const [joiningPlayer, setJoiningPlayer] = useState(null);

  // 查看队友弹窗
  const [showTeammatesModal, setShowTeammatesModal] = useState(false);
  const [teammatesInfo, setTeammatesInfo] = useState(null);

  // 拖拽相关
  const trackRef = useRef(null);
  const [dragging, setDragging] = useState(null); // 'start' or 'end'

  // 获取预约列表（按选中日期过滤，不过滤 status，前端自行判断显示）
  const fetchReservations = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('teams')
      .select('*')
      .eq('date', selectedDate)
      .order('created_at', { ascending: false });
    setReservations(data || []);
    setLoading(false);
  };

  // 初始化加载（移除实时订阅，通过刷新获取更新）
  useEffect(() => {
    ensureAnonymousAuth().then(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
      }
      fetchReservations();
    });
  }, [selectedDate]);

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

    let userId = currentUserId;
    if (!userId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        userId = user.id;
        setCurrentUserId(user.id);
      } else {
        alert('无法确认用户身份，请刷新页面重试');
        return;
      }
    }

    // 检查当前用户是否已在当天发布过队伍
    const { data: existingMember, error: checkError } = await supabase
      .from('team_members')
      .select('team_id, teams!inner(date)')
      .eq('user_id', userId)
      .eq('is_owner', true)
      .eq('teams.date', selectedDate)
      .limit(1);

    if (checkError) {
      console.error('检查重复发布失败:', checkError);
      alert('检查发布状态失败，请重试');
      return;
    }

    if (existingMember && existingMember.length > 0) {
      alert('您今天已经创建过预约了，排位每天只能固定一个队友');
      return;
    }

    // 弹出QQ输入框
    setShowQQModal(true);
    setPendingSubmit(true);
  };

  // 确认提交（带QQ）
  const confirmSubmit = async () => {
    // 防止重复提交
    if (!pendingSubmit) return;
    setPendingSubmit(false);

    // 验证至少选择一个游戏模式
    if (selectedModes.length === 0) {
      alert('请至少选择一个游戏模式');
      return;
    }

    // 如果接受陌生人，QQ是必填的
    if (acceptStrangers && !qqNumber.trim()) {
      alert('接受陌生人组队时，QQ号码是必填项');
      return;
    }

    const { data: teamData, error: teamError } = await supabase
      .from('teams')
      .insert([{
        date: selectedDate,
        start_time: stepToTime(timeRange[0]),
        end_time: stepToTime(timeRange[1]),
        level: selectedLevel,
        game_modes: selectedModes,
        accept_strangers: acceptStrangers,
        status: 'open',
        creator_nickname: nickname.trim(),
        creator_qq: qqNumber.trim() || null
      }])
      .select();

    if (teamError) {
      alert('发布失败：' + teamError.message);
      return;
    }

    const teamId = teamData[0].id;
    const { data: { user } } = await supabase.auth.getUser();

    const { error: memberError } = await supabase
      .from('team_members')
      .insert([{
        team_id: teamId,
        user_id: user.id,
        nickname: nickname.trim(),
        qq_number: qqNumber.trim() || null,
        is_owner: true
      }]);

    if (memberError) {
      alert('发布失败：' + memberError.message);
      return;
    }

    localStorage.setItem('lastSubmitTime', Date.now().toString());

    // 构造新预约数据，本地立即显示
    const newReservation = {
      id: teamId,
      date: selectedDate,
      start_time: stepToTime(timeRange[0]),
      end_time: stepToTime(timeRange[1]),
      level: selectedLevel,
      game_modes: selectedModes,
      accept_strangers: acceptStrangers,
      status: 'open',
      team_name: null,
      creator_nickname: nickname.trim(),
      creator_qq: qqNumber.trim() || null,
      created_at: new Date().toISOString(),
      team_members: [{
        user_id: user.id,
        nickname: nickname.trim(),
        qq_number: qqNumber.trim() || null,
        is_owner: true
      }]
    };

    // 本地立即添加到列表
    setReservations(prev => [newReservation, ...prev]);

    // 记录用户创建/加入的队伍 ID
    const userTeams = JSON.parse(localStorage.getItem('userTeams') || '[]');
    if (!userTeams.includes(teamId)) {
      userTeams.push(teamId);
      localStorage.setItem('userTeams', JSON.stringify(userTeams));
    }

    // 重置表单
    setNickname('');
    setSelectedLevel(1);
    setAcceptStrangers(false);
    setSelectedModes(['football']);
    setQQNumber('');
    setShowQQModal(false);
    setPendingSubmit(false);
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

    if (joiningPlayer.accept_strangers && !joinQQNumber.trim()) {
      alert('该队伍接受陌生人组队，QQ号码是必填项');
      return;
    }

    if (!joiningPlayer) return;

    const trimmedJoinNickname = joinNickname.trim();
    const trimmedJoinQQNumber = joinQQNumber.trim();

    let userId = currentUserId;
    if (!userId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        userId = user.id;
        setCurrentUserId(user.id);
      } else {
        alert('无法确认用户身份，请刷新页面重试');
        return;
      }
    }

    // 检查当前用户是否已在当天发布或加入过队伍
    const { data: existingMember, error: checkError } = await supabase
      .from('team_members')
      .select('team_id, teams!inner(date)')
      .eq('user_id', userId)
      .eq('teams.date', selectedDate)
      .limit(1);

    if (checkError) {
      console.error('检查重复加入失败:', checkError);
      alert('检查加入状态失败，请重试');
      return;
    }

    if (existingMember && existingMember.length > 0) {
      alert('您今天已经发布或加入过队伍了，排位每天只能固定一个队友');
      return;
    }

    // 先插入 team_member（这样才有权限 update teams）
    try {
      const { data: { user: joinUser } } = await supabase.auth.getUser();

      const { error: memberError } = await supabase
        .from('team_members')
        .insert([{
          team_id: joiningPlayer.id,
          user_id: joinUser.id,
          nickname: trimmedJoinNickname,
          qq_number: trimmedJoinQQNumber || null,
          is_owner: false
        }]);

      if (memberError) {
        console.error('队员插入失败:', memberError);
        alert('加入失败：' + memberError.message);
        return;
      }

      // 成为成员后再更新 team 状态和加入者信息
      const { error: teamError } = await supabase
        .from('teams')
        .update({
          status: 'matched',
          joiner_nickname: trimmedJoinNickname,
          joiner_qq_number: trimmedJoinQQNumber || null
        })
        .eq('id', joiningPlayer.id);

      if (teamError) {
        console.error('数据库更新失败:', teamError);
        alert('加入失败：' + teamError.message);
        return;
      }

      console.log('加入成功');
      localStorage.setItem('lastJoinTime', Date.now().toString());

      // 记录用户加入的队伍 ID
      const userTeams = JSON.parse(localStorage.getItem('userTeams') || '[]');
      if (!userTeams.includes(joiningPlayer.id)) {
        userTeams.push(joiningPlayer.id);
        localStorage.setItem('userTeams', JSON.stringify(userTeams));
      }

      // 关闭加入弹窗
      setShowJoinModal(false);
      setJoinNickname('');
      setJoinQQNumber(''); // 清空加入者QQ号码

      // 重新从数据库获取最新数据（只查 teams，不 join team_members）
      const { data: updatedTeam } = await supabase
        .from('teams')
        .select('*')
        .eq('id', joiningPlayer.id)
        .single();

      if (updatedTeam) {
        // 更新本地列表中的该队伍数据
        setReservations(prev =>
          prev.map(p =>
            p.id === joiningPlayer.id ? updatedTeam : p
          )
        );

        const ownerNickname = updatedTeam.creator_nickname;
        const ownerQQ = updatedTeam.creator_qq;

        // 如果发布者留下了QQ，显示查看联系方式弹窗
        if (ownerQQ) {
          setContactInfo({
            qq: ownerQQ,
            nickname: ownerNickname
          });
          setShowContactModal(true);
        }

        // 异步生成队名（不阻塞）
        generateTeamName(ownerNickname, trimmedJoinNickname).then(async (teamName) => {
          console.log('生成的队名:', teamName);
          // 更新队名到数据库
          await supabase
            .from('teams')
            .update({ team_name: teamName })
            .eq('id', joiningPlayer.id);
          // 本地更新队名
          setReservations(prev =>
            prev.map(p =>
              p.id === joiningPlayer.id ? { ...p, team_name: teamName } : p
            )
          );
        }).catch(err => {
          console.error('生成队名失败:', err);
        });
      }

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
    setJoinQQNumber(''); // 清空加入者QQ号码
    setJoiningPlayer(null);
  };

  // 查看队友信息
  const viewTeammates = async (team) => {
    // 从 teams 表获取冗余字段
    const ownerInfo = {
      nickname: team.creator_nickname || '未知',
      qq_number: team.creator_qq,
      is_owner: true
    };

    const joinerInfo = team.joiner_nickname ? {
      nickname: team.joiner_nickname,
      qq_number: team.joiner_qq_number,
      is_owner: false
    } : null;

    setTeammatesInfo({
      owner: ownerInfo,
      joiner: joinerInfo,
      teamName: team.team_name
    });
    setShowTeammatesModal(true);
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

      <div className="relative z-10 max-w-5xl mx-auto px-3 sm:px-4 pt-8 sm:pt-12">
        {/* Header */}
        <header className="text-center mb-6 sm:mb-10">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-xl px-3 sm:px-4 py-1.5 rounded-full border border-white/30 text-white text-xs sm:text-sm font-bold mb-4 sm:mb-6"
          >
            <Trophy size={14} className="text-yellow-300 sm:hidden" />
            <Trophy size={16} className="text-yellow-300 hidden sm:block" />
            排位窗口开放中：20:00 - 22:00
          </motion.div>
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-black text-white tracking-tighter drop-shadow-md">
            QQ TANG <span className="text-yellow-300">HUB</span>
          </h1>
          {currentUserId && (
            <div className="text-xs sm:text-sm text-white/70 mt-2 sm:mt-3 text-right">
              当前身份ID：{currentUserId} (仅用于本次使用)
            </div>
          )}
        </header>

        {/* 上方游戏预约卡片 */}
        <section className="mb-8 sm:mb-12">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-white rounded-[24px] sm:rounded-[40px] p-4 sm:p-8 md:p-12 shadow-2xl shadow-indigo-200/50 border border-white"
          >
            <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-10">
              <div className="flex flex-col md:flex-row md:items-end gap-4 sm:gap-8">
                <div className="flex-1 space-y-3 sm:space-y-4">
                  <div>
                    <label className="block text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest mb-2 sm:mb-3 ml-1">
                      你的昵称
                    </label>
                    <input
                      required
                      type="text"
                      placeholder="输入你的游戏ID..."
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                      className="w-full px-4 sm:px-6 py-3 sm:py-4 bg-slate-50 border-2 border-slate-100 rounded-xl sm:rounded-2xl focus:border-purple-400 focus:bg-white transition-all outline-none text-lg sm:text-xl font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest mb-2 sm:mb-3 ml-1">
                      选择等级
                    </label>
                    <select
                      value={selectedLevel}
                      onChange={(e) => setSelectedLevel(parseInt(e.target.value))}
                      className="w-full px-4 sm:px-6 py-3 sm:py-4 bg-slate-50 border-2 border-slate-100 rounded-xl sm:rounded-2xl focus:border-purple-400 focus:bg-white transition-all outline-none text-sm sm:text-base font-bold appearance-none cursor-pointer"
                      style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1.5rem' }}
                    >
                      {LEVELS.map((item) => (
                        <option key={item.level} value={item.level}>
                          LV.{item.level} {item.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 游戏模式选择 */}
                  <div className="px-0 sm:px-2">
                    <label className="block text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest mb-2 sm:mb-3">
                      游戏模式（至少选一个）
                    </label>
                    <div className="flex flex-wrap gap-2 sm:gap-3">
                      {GAME_MODES.map((mode) => (
                        <button
                          key={mode.id}
                          type="button"
                          onClick={() => {
                            if (selectedModes.includes(mode.id)) {
                              // 至少保留一个选中
                              if (selectedModes.length > 1) {
                                setSelectedModes(selectedModes.filter(m => m !== mode.id));
                              }
                            } else {
                              setSelectedModes([...selectedModes, mode.id]);
                            }
                          }}
                          className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-1.5 sm:gap-2 ${
                            selectedModes.includes(mode.id)
                              ? 'bg-purple-500 text-white shadow-lg shadow-purple-200'
                              : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                          }`}
                        >
                          <span>{mode.icon}</span>
                          <span>{mode.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 是否接受陌生人组队 */}
                  <div className="flex items-center gap-2 sm:gap-3 px-0 sm:px-2">
                    <button
                      type="button"
                      onClick={() => setAcceptStrangers(!acceptStrangers)}
                      className={`relative w-10 sm:w-12 h-5 sm:h-6 rounded-full transition-colors duration-200 focus:outline-none ${
                        acceptStrangers ? 'bg-purple-500' : 'bg-slate-300'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 sm:top-1 left-0.5 sm:left-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${
                          acceptStrangers ? 'translate-x-5 sm:translate-x-6' : 'translate-x-0'
                        }`}
                      />
                    </button>
                    <div className="flex flex-col">
                      <span className="text-xs sm:text-sm font-bold text-slate-700">
                        接受陌生人组队
                      </span>
                      <span className="text-[10px] sm:text-xs text-slate-400">
                        {acceptStrangers ? '陌生人可以直接加入' : '仅限熟人加入'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="md:w-1/3 flex items-end mt-4 md:mt-0">
                  <button
                    type="submit"
                    className="w-full h-12 sm:h-[64px] bg-slate-900 text-white font-black rounded-xl sm:rounded-2xl shadow-xl hover:bg-purple-600 hover:-translate-y-1 transition-all active:scale-95 flex items-center justify-center gap-2 text-base sm:text-lg"
                  >
                    <PlusCircle size={20} className="sm:hidden" />
                    <PlusCircle size={24} className="hidden sm:block" />
                    发起预约
                  </button>
                </div>
              </div>

              {/* 时间范围选择器 */}
              <div className="relative pt-6 sm:pt-10 pb-4 sm:pb-6">
                <label className="block text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest mb-4 sm:mb-8 ml-1 text-center">
                  请拖动滑块选择时间段：<span className="text-purple-600 text-sm sm:text-lg">{stepToTime(timeRange[0])} 到 {stepToTime(timeRange[1])}</span>
                </label>

                <div className="relative px-2 sm:px-4">
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
          {/* 日期选择 Tab */}
          <div className="mb-0">
            <div className="bg-white rounded-t-[24px] sm:rounded-t-[32px] shadow-lg shadow-slate-200/30 p-1.5 sm:p-2">
              <div className="flex gap-1.5 sm:gap-2 overflow-x-auto scrollbar-hide pb-1 -mx-1 px-1">
                {dateOptions.map((option) => (
                  <button
                    key={option.date}
                    onClick={() => setSelectedDate(option.date)}
                    className={`flex-shrink-0 px-3 sm:px-5 py-2 sm:py-3 rounded-xl sm:rounded-2xl font-bold transition-all ${
                      selectedDate === option.date
                        ? 'bg-slate-900 text-white shadow-lg'
                        : 'bg-transparent text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-1 sm:gap-2">
                      {option.isToday && <span className="text-orange-400 text-xs sm:text-base">🔥</span>}
                      <span className="text-xs sm:text-sm">{option.label}</span>
                      <span className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full ${
                        selectedDate === option.date ? 'bg-slate-700 text-slate-300' : 'bg-slate-200 text-slate-500'
                      }`}>
                        {option.displayDate}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-b-[24px] sm:rounded-b-[32px] rounded-t-none shadow-xl shadow-slate-200/50 p-4 sm:p-8 border-t border-slate-100">
            <div className="flex items-center justify-between mb-4 sm:mb-8 px-1 sm:px-2">
              <h2 className="text-lg sm:text-2xl font-black text-slate-800 flex items-center gap-2 sm:gap-3">
                <Users className="text-indigo-600 w-5 h-5 sm:w-6 sm:h-6" />
                <span className="hidden sm:inline">正在寻找队友的玩家</span>
                <span className="sm:hidden">寻找队友</span>
              </h2>
              <div className="h-px flex-1 mx-3 sm:mx-6 bg-slate-200 hidden sm:block" />
              <span className="text-slate-400 font-bold text-xs sm:text-sm bg-slate-100 px-2 sm:px-4 py-1 rounded-full">
                {reservations.length} 个
              </span>
            </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
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
                {reservations
                  .filter((player) => {
                    // open 队伍：所有人可见
                    if (player.status === 'open') return true;
                    // matched 队伍：只有 creator 或成员可见
                    if (player.status === 'matched') {
                      // 判断是否是 creator（通过 creator_nickname 对比不够准确，用 currentUserId 判断成员身份）
                      // 这里需要调用 RPC 或检查 team_members，但 RLS 限制了查询
                      // 简化方案：前端通过 local storage 记录用户创建/加入的队伍 ID
                      const userTeams = JSON.parse(localStorage.getItem('userTeams') || '[]');
                      return userTeams.includes(player.id);
                    }
                    return false;
                  })
                  .map((player) => {
                  const creatorName = player.creator_nickname || '未知';
                  const isMatched = player.status === 'matched';

                  return (
                  <motion.div
                    key={player.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    whileHover={{ y: -3 }}
                    className={`relative p-4 sm:p-6 rounded-[20px] sm:rounded-[32px] overflow-hidden transition-all border-2 ${
                      isMatched
                      ? 'bg-slate-100 border-transparent'
                      : 'bg-white border-white shadow-lg sm:shadow-xl shadow-slate-200/50'
                    }`}
                  >
                    {/* 卡片装饰图标 */}
                    <div className="absolute -right-3 -bottom-3 sm:-right-4 sm:-bottom-4 opacity-5 rotate-12">
                       <Ghost size={60} className="sm:w-[100px] sm:h-[100px]" />
                    </div>

                    <div className="flex items-start justify-between mb-3 sm:mb-6">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl sm:rounded-2xl flex items-center justify-center text-white text-base sm:text-xl font-black shadow-lg">
                          {creatorName.charAt(0)}
                        </div>
                        <div>
                          <h3 className="font-bold text-sm sm:text-lg text-slate-800">{creatorName}</h3>
                          <span className="text-[9px] sm:text-[10px] font-black text-purple-500 uppercase tracking-tighter bg-purple-50 px-1.5 sm:px-2 py-0.5 rounded-md">
                            LV.{player.level || 1}<span className="ml-1 sm:ml-2"></span>{LEVELS.find(l => l.level === (player.level || 1))?.title}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 sm:space-y-3 mb-4 sm:mb-6">
                      <div className="flex items-center gap-1.5 sm:gap-2 text-slate-500 font-medium text-xs sm:text-sm">
                        <Clock size={12} className="text-slate-400 sm:w-3.5 sm:h-3.5" />
                        <span>时间段: <span className="text-slate-800 font-bold">{player.start_time}–{player.end_time}</span></span>
                      </div>
                      {/* 游戏模式 */}
                      {player.game_modes && player.game_modes.length > 0 && (
                        <div className="flex flex-wrap gap-1 sm:gap-1.5">
                          {player.game_modes.map((modeId) => {
                            const mode = GAME_MODES.find(m => m.id === modeId);
                            return mode ? (
                              <span
                                key={modeId}
                                className="inline-flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-0.5 bg-indigo-50 text-indigo-600 text-[9px] sm:text-[10px] font-bold rounded"
                              >
                                <span>{mode.icon}</span>
                                <span>{mode.label}</span>
                              </span>
                            ) : null;
                          })}
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${isMatched ? 'bg-green-500' : 'bg-blue-500 animate-pulse'}`} />
                        <span className={`text-[10px] sm:text-xs font-bold ${isMatched ? 'text-green-600' : 'text-blue-600'}`}>
                          {isMatched ? '已匹配' : '等待加入...'}
                        </span>
                      </div>
                      {/* 显示是否接受陌生人 */}
                      {player.accept_strangers ? (
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-purple-400" />
                          <span className="text-[10px] sm:text-xs font-bold text-purple-600">
                            接受陌生人
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          <Lock size={9} className="text-orange-500 sm:w-2.5 sm:h-2.5" />
                          <span className="text-[10px] sm:text-xs font-bold text-orange-600">
                            仅限熟人
                          </span>
                        </div>
                      )}
                    </div>

                    {isMatched ? (
                      <div className="space-y-1.5 sm:space-y-2">
                        {/* matched 队伍：成员可查看队友信息和队名 */}
                        {player.team_name ? (
                          <div className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5">
                            <Sparkles size={10} className="text-purple-400 sm:w-3 sm:h-3" />
                            <p className="text-[9px] sm:text-[10px] font-medium text-slate-400">
                              队名：<span className="text-purple-500 font-bold">{player.team_name}</span>
                            </p>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5">
                            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                            <p className="text-[9px] sm:text-[10px] font-medium text-purple-400">生成队名...</p>
                          </div>
                        )}
                        {/* 查看队友按钮 */}
                        <button
                          onClick={() => viewTeammates(player)}
                          className="w-full bg-green-100 text-green-700 font-bold py-2 sm:py-3 rounded-xl sm:rounded-2xl hover:bg-green-200 transition-all flex items-center justify-center gap-1.5 sm:gap-2 text-sm sm:text-base"
                        >
                          <CheckCircle2 size={14} />
                          查看队友
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleJoin(player)}
                        className="w-full bg-indigo-50 text-indigo-600 font-black py-2 sm:py-3 rounded-xl sm:rounded-2xl hover:bg-indigo-600 hover:text-white transition-all flex items-center justify-center gap-1.5 sm:gap-2 group text-sm sm:text-base"
                      >
                        加入对战
                        <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 bg-indigo-400 rounded-full group-hover:bg-white animate-bounce" />
                      </button>
                    )}
                  </motion.div>
                )})
                }
              </AnimatePresence>
            )}
          </div>
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
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4"
            onClick={cancelSubmit}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-8 max-w-md w-full shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center mb-4 sm:mb-6">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                  <User size={24} className="text-purple-600 sm:w-8 sm:h-8" />
                </div>
                <h3 className="text-lg sm:text-xl font-black text-slate-800 mb-1 sm:mb-2">
                  请留下您的联系方式
                </h3>
                <p className="text-xs sm:text-sm text-slate-500">
                  方便队友加入后联系您
                </p>
              </div>

              <div className="space-y-3 sm:space-y-4">
                <div>
                  <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-1.5 sm:mb-2">
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
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-slate-50 border-2 border-slate-200 rounded-lg sm:rounded-xl focus:border-purple-500 focus:bg-white transition-all outline-none text-base sm:text-lg font-bold"
                  />
                  {acceptStrangers && (
                    <p className="text-[10px] sm:text-xs text-purple-600 mt-1.5 sm:mt-2">
                      您选择了接受陌生人组队，QQ号码是必填项
                    </p>
                  )}
                </div>

                <p className="text-xs sm:text-sm text-slate-500 font-semibold mb-3 sm:mb-4 text-center">
                  QQ 仅在匹配成功后对队友可见
                </p>
                <div className="flex gap-2 sm:gap-3 pt-3 sm:pt-4">
                  <button
                    onClick={cancelSubmit}
                    className="flex-1 py-2.5 sm:py-3 px-3 sm:px-4 bg-slate-100 text-slate-700 font-bold rounded-lg sm:rounded-xl hover:bg-slate-200 transition-all text-sm sm:text-base"
                  >
                    取消
                  </button>
                  <button
                    onClick={confirmSubmit}
                    className="flex-1 py-2.5 sm:py-3 px-3 sm:px-4 bg-purple-600 text-white font-bold rounded-lg sm:rounded-xl hover:bg-purple-700 transition-all text-sm sm:text-base"
                  >
                    确认发布
                  </button>
                </div>              </div>
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
                  您即将加入 <span className="font-bold text-indigo-600">{joiningPlayer.creator_nickname || '未知'}</span> 的队伍
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

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    您的QQ号码 {joiningPlayer?.accept_strangers ? (<span className="text-red-500">*</span>) : (<span className="text-slate-400 font-normal">(可选)</span>)}
                  </label>
                  <input
                    type="text"
                    placeholder="输入您的QQ号..."
                    value={joinQQNumber}
                    onChange={(e) => setJoinQQNumber(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-indigo-500 focus:bg-white transition-all outline-none text-lg font-bold"
                  />
                  {joiningPlayer?.accept_strangers && (
                    <p className="text-[10px] sm:text-xs text-indigo-600 mt-1.5 sm:mt-2">
                      该队伍接受陌生人组队，QQ号码是必填项
                    </p>
                  )}
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

      {/* 查看队友弹窗 */}
      <AnimatePresence>
        {showTeammatesModal && teammatesInfo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowTeammatesModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users size={32} className="text-green-600" />
                </div>
                <h3 className="text-xl font-black text-slate-800 mb-2">
                  队伍成员
                </h3>
                {teammatesInfo.teamName && (
                  <p className="text-sm text-purple-500 font-bold">
                    队名：{teammatesInfo.teamName}
                  </p>
                )}
              </div>

              <div className="space-y-4">
                {/* 发布人 */}
                <div className="bg-indigo-50 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-slate-500 font-bold mb-1">发布人</p>
                      <p className="text-lg font-black text-slate-800">{teammatesInfo.owner.nickname}</p>
                    </div>
                    {teammatesInfo.owner.qq_number && (
                      <button
                        onClick={() => copyQQ(teammatesInfo.owner.qq_number)}
                        className="p-2 bg-white rounded-xl shadow-sm hover:shadow-md transition-all text-indigo-600"
                        title="复制QQ"
                      >
                        <Copy size={18} />
                      </button>
                    )}
                  </div>
                  {teammatesInfo.owner.qq_number && (
                    <p className="text-sm text-slate-600 mt-2">QQ: {teammatesInfo.owner.qq_number}</p>
                  )}
                </div>

                {/* 加入者 */}
                {teammatesInfo.joiner && (
                  <div className="bg-pink-50 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-slate-500 font-bold mb-1">加入者</p>
                        <p className="text-lg font-black text-slate-800">{teammatesInfo.joiner.nickname}</p>
                      </div>
                      {teammatesInfo.joiner.qq_number && (
                        <button
                          onClick={() => copyQQ(teammatesInfo.joiner.qq_number)}
                          className="p-2 bg-white rounded-xl shadow-sm hover:shadow-md transition-all text-pink-600"
                          title="复制QQ"
                        >
                          <Copy size={18} />
                        </button>
                      )}
                    </div>
                    {teammatesInfo.joiner.qq_number && (
                      <p className="text-sm text-slate-600 mt-2">QQ: {teammatesInfo.joiner.qq_number}</p>
                    )}
                  </div>
                )}
              </div>

              <button
                onClick={() => setShowTeammatesModal(false)}
                className="w-full py-3 mt-6 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-all"
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