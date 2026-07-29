import React, { useState } from 'react';
import { motion } from 'framer-motion';

const AnimatedConceptIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400">
    <motion.circle 
      cx="12" cy="12" r="10" 
      initial={{ scale: 1 }}
      animate={{ scale: [1, 1.15, 1] }}
      transition={{ delay: 0.45, duration: 0.45, type: "spring", stiffness: 300, damping: 12 }}
    />
    <motion.circle cx="12" cy="12" r="6" />
    <motion.circle cx="12" cy="12" r="2" />
    <motion.path 
      d="M24 0L14 10" 
      initial={{ x: 20, y: -20, opacity: 0 }}
      animate={{ x: 0, y: 0, opacity: 1 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
    />
    <motion.path 
      d="M20 0H24V4" 
      initial={{ x: 20, y: -20, opacity: 0 }}
      animate={{ x: 0, y: 0, opacity: 1 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
    />
  </svg>
);

const AnimatedProblemIcon = () => (
  <motion.svg 
    width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400"
    initial={{ rotate: 0 }}
    animate={{ rotate: [-15, 15, -15, 15, 0] }}
    transition={{ duration: 0.6, ease: "easeInOut" }}
  >
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    <motion.path 
      d="M2 12l5 5 15-15"
      stroke="#10b981"
      initial={{ pathLength: 0, opacity: 0 }}
      animate={{ pathLength: 1, opacity: [0, 1, 0] }}
      transition={{ delay: 0.6, duration: 0.35, type: "spring", stiffness: 300, damping: 12 }}
    />
  </motion.svg>
);

const AnimatedAnalyticsIcon = () => {
  const bars = [14, 18, 10, 20];
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400">
      <path d="M2 3v18h18" />
      {bars.map((h, i) => (
        <motion.path
          key={i}
          d={`M${6 + i * 4} 21v-${h}`}
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ delay: i * 0.12, duration: 0.4, type: "spring", stiffness: 300, damping: 12 }}
        />
      ))}
    </svg>
  );
};

const AnimatedElevatorIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400">
    <motion.circle 
      cx="12" cy="13" r="8"
      initial={{ scale: 1, opacity: 0 }}
      animate={{ scale: [1, 1.4], opacity: [0, 0.4, 0] }}
      transition={{ delay: 0.7, duration: 0.4 }}
    />
    <circle cx="12" cy="13" r="8" />
    <path d="M12 9v4l2 2" />
    <path d="M10 2h4" />
    <motion.path 
      d="M12 13L12 6"
      style={{ transformOrigin: "12px 13px" }}
      initial={{ rotate: 0 }}
      animate={{ rotate: 360 }}
      transition={{ duration: 0.7, ease: "easeInOut" }}
    />
  </svg>
);

const AnimatedScannerIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6" />
    <path d="M16 13H8" />
    <path d="M16 17H8" />
    <path d="M10 9H8" />
    
    <motion.line 
      x1="4" y1="4" x2="20" y2="4"
      stroke="#10b981"
      initial={{ y: 0, opacity: 1 }}
      animate={{ y: 16, opacity: [1, 1, 0] }}
      transition={{ duration: 0.7, ease: "linear" }}
    />
    
    <motion.path 
      d="M9 19l2 2 4-4"
      stroke="#10b981"
      initial={{ pathLength: 0, opacity: 0 }}
      animate={{ pathLength: 1, opacity: [0, 1, 0] }}
      transition={{ delay: 0.7, duration: 0.35, type: "spring", stiffness: 300, damping: 12 }}
    />
  </svg>
);

const navItems = [
  { id: 'concept', label: 'Concept', icon: AnimatedConceptIcon },
  { id: 'elevator', label: 'Elevator Pitch', icon: AnimatedElevatorIcon },
  { id: 'problem', label: 'Problem Solver', icon: AnimatedProblemIcon },
  { id: 'scanner', label: 'Note Scanner', icon: AnimatedScannerIcon },
  { id: 'heatmap', label: 'Analytics', icon: AnimatedAnalyticsIcon },
];

export default function Sidebar({ activeMode, onModeChange }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [triggers, setTriggers] = useState({
    concept: 0,
    elevator: 0,
    problem: 0,
    scanner: 0,
    heatmap: 0
  });

  const handleNavClick = (id) => {
    setTriggers(prev => ({ ...prev, [id]: prev[id] + 1 }));
    onModeChange(id);
  };

  return (
    <div className={`glass-panel rounded-none border-x-0 border-b-0 border-t border-white/10 transition-all duration-300 flex z-50 bg-[#0f172a]
      fixed bottom-0 left-0 w-full flex-row justify-around items-center pt-2 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]
      md:relative md:bottom-auto md:left-auto md:h-full md:flex-col md:justify-start md:border-t-0 md:border-r md:pt-0 md:px-0 md:pb-0
      ${isCollapsed ? 'md:w-20' : 'md:w-64'}`}>
      
      {/* Header - Hidden on mobile */}
      <div className="hidden md:flex p-4 items-center justify-between border-b border-white/10 w-full">
        {!isCollapsed && (
          <div className="flex items-center gap-2 font-bold text-xl bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-violet-400">
            <span className="text-blue-400 inline-block animate-spin-slow">⚙️</span> MechMentor
          </div>
        )}
        {isCollapsed && <span className="text-xl mx-auto inline-block animate-spin-slow">⚙️</span>}
        
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="text-slate-400 hover:text-white transition-colors"
        >
          {isCollapsed ? '►' : '◄'}
        </button>
      </div>

      <nav className="flex-1 w-full flex flex-row justify-around md:flex-col md:gap-2 md:px-3 md:py-6">
        {navItems.map(item => {
          const IconComponent = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={`flex flex-col md:flex-row items-center md:gap-3 p-2 md:p-3 rounded-xl transition-all duration-300 relative min-w-[44px] min-h-[44px] justify-center ${
                isCollapsed ? 'md:justify-center' : 'md:justify-start'
              } ${
                activeMode === item.id 
                  ? 'text-white md:bg-blue-500/10' 
                  : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
              }`}
            >
              {activeMode === item.id && (
                <>
                  {/* Desktop active indicator */}
                  <div className="hidden md:block absolute left-0 top-1/4 bottom-1/4 w-1 bg-blue-500 rounded-r-full shadow-[0_0_10px_rgba(59,130,246,0.8)]" />
                  {/* Mobile active indicator (glow behind icon) */}
                  <div className="md:hidden absolute inset-0 bg-blue-500/10 rounded-xl" />
                </>
              )}
              <span key={triggers[item.id]} className="text-xl flex-shrink-0 flex items-center justify-center w-6 h-6 mb-1 md:mb-0 z-10">
                <IconComponent />
              </span>
              {!isCollapsed && (
                <span className="font-medium whitespace-nowrap text-[10px] md:text-base z-10 landscape:[@media(max-height:500px)]:hidden md:landscape:block">
                  {item.label}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer / Streak - Hidden on mobile */}
      <div className="hidden md:block p-4 border-t border-white/10 w-full">
        {!isCollapsed ? (
          <div className="bg-black/20 rounded-xl p-3 border border-white/5">
            <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Streak</div>
            <div className="flex items-center gap-2 text-white font-bold">
              🔥 5 Days
            </div>
            <div className="mt-3 text-xs text-slate-400 mb-1">Mastery</div>
            <div className="h-1.5 w-full bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-emerald-400 to-blue-500 w-[65%]"></div>
            </div>
          </div>
        ) : (
          <div className="text-center font-bold text-xl">🔥5</div>
        )}
      </div>
    </div>
  );
}
