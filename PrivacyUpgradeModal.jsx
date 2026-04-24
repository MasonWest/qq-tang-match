import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, UserMinus, Lock, Phone, ShieldCheck, DatabaseZap, RefreshCcw, Ghost, Trophy } from 'lucide-react';

const PrivacyUpgradeModal = ({ isOpen, onClose }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 md:p-8"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 20, opacity: 0 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="bg-white rounded-[40px] shadow-2xl shadow-indigo-200/50 border border-white max-w-4xl w-full max-h-[90vh] overflow-y-auto relative"
            onClick={(e) => e.stopPropagation()} // 阻止点击模态窗口内部关闭
          >
            {/* 顶部彩色装饰条 */}
            <div className="h-2 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />

            {/* Header */}
            <header className="flex items-center justify-between p-8 md:p-12 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-white text-xl font-black shadow-lg">
                  <ShieldCheck size={28} />
                </div>
                <div>
                  <h2 className="text-3xl font-black text-slate-800 flex items-center gap-3">
                    隐私保护升级
                  </h2>
                  <p className="text-sm font-bold text-slate-400">更安全的开黑体验，更轻负担的队友寻找</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="w-12 h-12 bg-slate-100 text-slate-500 rounded-2xl hover:bg-slate-200 hover:text-slate-800 transition-all flex items-center justify-center"
              >
                <X size={24} />
              </button>
            </header>

            {/* 主体内容 */}
            <main className="p-8 md:p-12 space-y-12">
              <div className="text-center space-y-4">
                <h3 className="text-2xl md:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-500">
                  🆕 隐私保护机制已完成重要升级！
                </h3>
                <p className="text-slate-600 max-w-2xl mx-auto">
                   为了让你专注于享受游戏的乐趣，我们全面升级了隐私保护。以下是此次升级的核心变化：
                </p>
              </div>

              {/* 升级细节列表 */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <UpgradeDetailCard
                  icon={UserMinus}
                  iconColor="text-blue-500"
                  iconBg="bg-blue-50"
                  title="无需注册"
                  description="只需输入昵称即可发布或加入队伍，完全无需任何账号注册登录。"
                />
                <UpgradeDetailCard
                  icon={Ghost}
                  iconColor="text-indigo-500"
                  iconBg="bg-indigo-50"
                  title="匿名身份"
                  description="系统会自动为每个玩家生成一个唯一的匿名身份标识 (User ID)，保护你的真实身份。"
                />
                <UpgradeDetailCard
                  icon={Lock}
                  iconColor="text-purple-500"
                  iconBg="bg-purple-50"
                  title="匹配加密"
                  description="只有当队伍匹配成功后，你的联系方式（如 Discord 或 QQ 号）才仅队友可见。"
                />
                <UpgradeDetailCard
                  icon={ShieldCheck}
                  iconColor="text-green-500"
                  iconBg="bg-green-50"
                  title="隐私安全"
                  description="已匹配的队伍信息对外部网络不可见，确保你的匹配活动不被追踪。"
                />
                <UpgradeDetailCard
                  icon={DatabaseZap}
                  iconColor="text-pink-500"
                  iconBg="bg-pink-50"
                  title="不存储敏感信息"
                  description="核心数据库绝不收集、不存储任何个人敏感信息，你的隐私，我们共同守护。"
                />
                <UpgradeDetailCard
                  icon={RefreshCcw}
                  iconColor="text-orange-500"
                  iconBg="bg-orange-50"
                  title="身份重置"
                  description="只需在设置中清除浏览器数据，即可重置你的身份标识，彻底告别过去。"
                />
              </div>

              {/* 总结卡片 */}
              <div className="bg-green-50 rounded-[32px] p-8 md:p-10 flex flex-col md:flex-row items-center gap-6 border border-green-100 relative overflow-hidden">
                {/* 装饰图标 */}
                <div className="absolute -right-10 -bottom-10 opacity-5 rotate-12">
                   <ShieldCheck size={200} />
                </div>
                <div className="w-20 h-20 bg-green-100 rounded-3xl flex items-center justify-center text-green-600 shadow-inner">
                  <ShieldCheck size={48} />
                </div>
                <div className="flex-1 space-y-3">
                  <h4 className="text-2xl font-black text-green-900">我们始终坚守，不收集、不存储任何敏感信息！</h4>
                  <p className="text-sm font-medium text-green-700">
                    无论你的游戏水平如何，无论你寻找怎样的队友，你的隐私在这里都是安全的。放心去匹配，安心去战斗！
                  </p>
                </div>
              </div>

              {/* 确认按钮 */}
              <div className="flex justify-center pt-8">
                 <button 
                  onClick={onClose}
                  className="px-12 py-5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-black rounded-2xl shadow-xl shadow-purple-200/50 hover:shadow-purple-300 hover:-translate-y-1 transition-all active:scale-95 text-lg flex items-center gap-2 group"
                >
                  <Trophy size={20} className="group-hover:scale-125 transition-transform" />
                  我了解了，继续寻找队友
                </button>
              </div>
            </main>

            {/* Footer */}
            <footer className="p-8 md:p-12 border-t border-slate-100 text-center text-slate-400 text-sm font-medium">
              &copy; 2026 QQ Tang Fan Matchmaker. 始终致力于为玩家提供最优质的开黑体验。
            </footer>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// --- 子组件：升级细节卡片 ---
const UpgradeDetailCard = ({ icon: Icon, iconColor, iconBg, title, description }) => {
  return (
    <motion.div
      whileHover={{ y: -5 }}
      className="p-6 bg-white rounded-3xl transition-all border-2 border-slate-50 shadow-lg shadow-slate-100"
    >
      <div className="flex items-center gap-4 mb-4">
        <div className={`w-14 h-14 ${iconBg} rounded-2xl flex items-center justify-center ${iconColor} shadow-inner`}>
          <Icon size={32} />
        </div>
        <div>
          <h4 className="font-bold text-xl text-slate-800">{title}</h4>
          <span className={`text-[10px] font-black uppercase tracking-tighter ${iconBg} ${iconColor} px-2 py-0.5 rounded-md`}>
            {Icon.name}
          </span>
        </div>
      </div>
      <p className="text-sm font-medium text-slate-600 leading-relaxed">{description}</p>
    </motion.div>
  );
};

export default PrivacyUpgradeModal;