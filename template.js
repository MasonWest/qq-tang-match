import React, { useState, useEffect } from 'react';
import { User, Clock, Users, PlusCircle, CheckCircle2, Search, Trophy } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- Types/Mock Data Logic ---
const TIME_SLOTS = [
  "20:00每20:30",
  "20:30每21:00",
  "21:00每21:30",
  "21:30每22:00"
];

const App = () => {
  const [reservations, setReservations] = useState([
    { id: 1, nickname: "BubblePop88", timeSlot: "20:00每20:30", status: "Waiting", teammate: null },
    { id: 2, nickname: "IceKing", timeSlot: "21:00每21:30", status: "Matched", teammate: "FireQueen" },
  ]);

  const [formData, setFormData] = useState({ nickname: '', timeSlot: TIME_SLOTS[0] });

  // Handle Form Submission
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.nickname.trim()) return;

    const newEntry = {
      id: Date.now(),
      nickname: formData.nickname,
      timeSlot: formData.timeSlot,
      status: "Waiting",
      teammate: null
    };

    setReservations([newEntry, ...reservations]);
    setFormData({ ...formData, nickname: '' });
  };

  // Handle Joining a Match
  const handleJoin = (id, joinerName) => {
    setReservations(reservations.map(res => 
      res.id === id ? { ...res, status: "Matched", teammate: "You!" } : res
    ));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 font-sans text-slate-800 p-4 md:p-8">
      
      {/* Header Section */}
      <header className="max-w-6xl mx-auto text-center mb-12">
        <motion.div 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="inline-block bg-white/20 backdrop-blur-md px-6 py-2 rounded-full border border-white/30 mb-4"
        >
          <span className="text-white font-bold flex items-center gap-2">
            <Trophy size={18} className="text-yellow-300" /> Ranked Window: 20:00 - 22:00
          </span>
        </motion.div>
        <h1 className="text-5xl md:text-7xl font-black text-white drop-shadow-lg tracking-tight">
          QQ TANG <span className="text-yellow-300 underline decoration-wavy">MATCH</span>
        </h1>
        <p className="text-white/90 mt-4 text-lg font-medium">Find your perfect 2v2 teammate in seconds.</p>
      </header>

      <main className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left: Reservation Form */}
        <section className="lg:col-span-4">
          <motion.div 
            whileHover={{ scale: 1.01 }}
            className="bg-white rounded-3xl p-8 shadow-2xl border border-white/50 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-yellow-100 rounded-full -mr-12 -mt-12 blur-2xl opacity-50" />
            
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <PlusCircle className="text-purple-600" /> Create Reservation
            </h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-slate-500 mb-2 ml-1">Your Nickname</label>
                <input 
                  required
                  type="text"
                  placeholder="e.g. MasterBomber"
                  value={formData.nickname}
                  onChange={(e) => setFormData({...formData, nickname: e.target.value})}
                  className="w-full px-5 py-4 bg-slate-100 border-none rounded-2xl focus:ring-4 focus:ring-purple-200 transition-all outline-none text-lg font-semibold"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-500 mb-2 ml-1">Select Time Slot</label>
                <div className="grid grid-cols-1 gap-2">
                  {TIME_SLOTS.map(slot => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setFormData({...formData, timeSlot: slot})}
                      className={`py-3 px-4 rounded-xl text-sm font-bold transition-all border-2 ${
                        formData.timeSlot === slot 
                        ? 'border-purple-600 bg-purple-50 text-purple-700' 
                        : 'border-slate-100 bg-slate-50 text-slate-400 hover:border-slate-200'
                      }`}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              </div>

              <button 
                type="submit"
                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-black py-4 rounded-2xl shadow-lg shadow-purple-200 hover:shadow-purple-400 hover:-translate-y-1 transition-all active:scale-95"
              >
                FIND TEAMMATE
              </button>
            </form>
          </motion.div>
        </section>

        {/* Right: Player List */}
        <section className="lg:col-span-8">
          <div className="flex items-center justify-between mb-6 px-2">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <Users size={28} /> Active Lobby
            </h2>
            <div className="flex gap-2">
               <span className="bg-white/20 text-white text-xs px-3 py-1 rounded-full backdrop-blur-sm">
                 {reservations.length} Players Online
               </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AnimatePresence mode="popLayout">
              {reservations.map((player) => (
                <motion.div
                  key={player.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className={`p-6 rounded-3xl shadow-xl border-2 transition-all ${
                    player.status === 'Matched' 
                    ? 'bg-slate-50/90 border-transparent opacity-80' 
                    : 'bg-white border-white'
                  }`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-tr from-yellow-400 to-orange-400 rounded-2xl flex items-center justify-center text-white font-bold shadow-inner">
                        {player.nickname.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-bold text-lg text-slate-800 leading-tight">{player.nickname}</h3>
                        <div className="flex items-center gap-1 text-slate-400 text-xs font-bold uppercase tracking-wider">
                          <Clock size={12} /> {player.timeSlot}
                        </div>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                      player.status === 'Matched' 
                      ? 'bg-green-100 text-green-600 border-green-200' 
                      : 'bg-blue-100 text-blue-600 border-blue-200 animate-pulse'
                    }`}>
                      {player.status}
                    </span>
                  </div>

                  {player.status === 'Matched' ? (
                    <div className="bg-green-50 rounded-2xl p-3 flex items-center gap-2 border border-green-100">
                      <CheckCircle2 size={18} className="text-green-500" />
                      <p className="text-sm font-bold text-green-700">Team matched with {player.teammate}!</p>
                    </div>
                  ) : (
                    <button 
                      onClick={() => handleJoin(player.id)}
                      className="w-full group mt-2 bg-slate-900 text-white font-bold py-3 rounded-xl hover:bg-purple-600 transition-colors flex items-center justify-center gap-2"
                    >
                      JOIN MATCH <Search size={16} className="group-hover:scale-125 transition-transform" />
                    </button>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          
          {reservations.length === 0 && (
            <div className="text-center py-20 bg-white/10 rounded-3xl border-2 border-dashed border-white/20">
              <p className="text-white font-medium">No one is looking for a team yet. Be the first!</p>
            </div>
          )}
        </section>
      </main>

      <footer className="max-w-6xl mx-auto mt-20 text-center text-white/60 text-sm font-medium">
        &copy; 2026 QQ Tang Fan Matchmaker. This is a community project.
      </footer>
    </div>
  );
};

export default App;