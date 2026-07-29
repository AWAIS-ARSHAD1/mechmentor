import React from 'react';

export default function NotificationBanner({ dueCount, weakestSubject, onStartDrill, onDismiss }) {
  return (
    <div className="relative z-50 p-4 animate-slide-down pb-0">
      <div className="max-w-4xl mx-auto glass-panel border-blue-500/30 bg-blue-900/40 backdrop-blur-xl p-5 flex flex-col md:flex-row flex-wrap items-center justify-between gap-4 shadow-2xl shadow-blue-900/50">
        
        <div className="flex items-center gap-4 flex-1">
          <div className="bg-blue-500/20 text-blue-400 p-2 rounded-full text-xl animate-bounce flex-shrink-0">
            🔔
          </div>
          <div>
            <h4 className="font-semibold text-white">Time for your daily review!</h4>
            <p className="text-sm text-blue-200">
              You have <strong className="text-white">{dueCount} concepts</strong> due for spaced repetition. 
              {weakestSubject && <span> Let's focus on your weak spot: <strong className="text-rose-300">{weakestSubject}</strong>.</span>}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto flex-shrink-0 justify-end">
          <button 
            onClick={onDismiss}
            className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors flex-1 md:flex-none text-center whitespace-nowrap"
          >
            Remind Later
          </button>
          <button 
            onClick={onStartDrill}
            className="glass-button primary-gradient px-6 py-2 text-sm font-semibold flex-1 md:flex-none shadow-[0_0_15px_rgba(59,130,246,0.4)] whitespace-nowrap"
          >
            Start Quick Drill
          </button>
        </div>

      </div>
    </div>
  );
}
