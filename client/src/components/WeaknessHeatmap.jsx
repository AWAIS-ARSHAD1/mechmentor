import React, { useState, useEffect } from 'react';

export default function WeaknessHeatmap() {
  const [data, setData] = useState(null);

  useEffect(() => {
    // Fetch data, fallback to dummy
    fetch(import.meta.env.VITE_API_URL + '/api/spaced-repetition/heatmap')
      .then(res => res.json())
      .then(setData)
      .catch(() => setData({
        subjects: {
          'Thermodynamics': 85,
          'Fluid Mechanics': 42,
          'Materials': 90,
          'Statics': 75,
          'Dynamics': 30,
          'Manufacturing': 65
        },
        weakTopics: ['Bernoulli Equation', 'Coriolis Acceleration', 'Pump Cavitation'],
        weakest: 'Dynamics'
      }));
  }, []);

  if (!data) return <div className="animate-pulse p-8 text-center">Loading analytics...</div>;

  const subjects = Object.entries(data.subjects).map(([name, score]) => ({ name, score }));
  
  const getColor = (score) => {
    if (score < 50) return 'from-rose-500 to-rose-400';
    if (score < 75) return 'from-amber-500 to-amber-400';
    return 'from-emerald-500 to-emerald-400';
  };

  // Simple Radar chart using SVG
  const renderRadar = () => {
    const size = 400;
    const center = size / 2;
    const radius = 120;
    const numPoints = subjects.length;
    const angleStep = (Math.PI * 2) / numPoints;
    
    let polygonPoints = "";
    
    return (
      <svg width="100%" height="auto" viewBox={`0 0 ${size} ${size}`} className="overflow-visible max-w-sm">
        {/* Background Grids */}
        {[0.2, 0.4, 0.6, 0.8, 1].map((scale, i) => {
          let pts = "";
          for (let j = 0; j < numPoints; j++) {
            const angle = j * angleStep - Math.PI / 2;
            pts += `${center + radius * scale * Math.cos(angle)},${center + radius * scale * Math.sin(angle)} `;
          }
          return <polygon key={i} points={pts} className="stroke-white/10 fill-none" />;
        })}
        
        {/* Axes and Labels */}
        {subjects.map((sub, i) => {
          const angle = i * angleStep - Math.PI / 2;
          const x = center + radius * Math.cos(angle);
          const y = center + radius * Math.sin(angle);
          
          // Calculate polygon points for data
          const dataRadius = radius * (sub.score / 100);
          polygonPoints += `${center + dataRadius * Math.cos(angle)},${center + dataRadius * Math.sin(angle)} `;
          
          // Label pos
          const labelX = center + (radius + 40) * Math.cos(angle);
          const labelY = center + (radius + 40) * Math.sin(angle);
          
          return (
            <g key={i}>
              <line x1={center} y1={center} x2={x} y2={y} className="stroke-white/10" />
              <text x={labelX} y={labelY} textAnchor="middle" dominantBaseline="middle" className="fill-slate-400 text-xs font-medium" >
                {sub.name}
              </text>
            </g>
          );
        })}
        
        {/* Data Polygon */}
        <polygon points={polygonPoints} className="fill-blue-500/30 stroke-blue-400 stroke-2" />
        {/* Data Points */}
        {subjects.map((sub, i) => {
          const angle = i * angleStep - Math.PI / 2;
          const dataRadius = radius * (sub.score / 100);
          const cx = center + dataRadius * Math.cos(angle);
          const cy = center + dataRadius * Math.sin(angle);
          return <circle key={i} cx={cx} cy={cy} r="4" className="fill-blue-400" />;
        })}
      </svg>
    );
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in pb-10">
      <header>
        <h1 className="text-3xl font-bold mb-2">Performance Analytics</h1>
        <p className="text-slate-400">Track your mastery across core engineering disciplines.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-panel p-6 flex flex-col justify-center items-center text-center">
          <div className="text-sm text-slate-400 mb-1 uppercase tracking-widest">Overall Mastery</div>
          <div className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-blue-500">
            {Math.round(subjects.reduce((sum, s) => sum + s.score, 0) / subjects.length)}%
          </div>
        </div>
        <div className="glass-panel p-6 flex flex-col justify-center items-center text-center">
          <div className="text-sm text-slate-400 mb-1 uppercase tracking-widest">Questions Answered</div>
          <div className="text-4xl font-bold text-white">128</div>
        </div>
        <div className="glass-panel p-6 flex flex-col justify-center items-center text-center">
          <div className="text-sm text-slate-400 mb-1 uppercase tracking-widest">Current Streak</div>
          <div className="text-4xl font-bold text-amber-400">🔥 5</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart Area */}
        <div className="glass-panel p-8">
          <h2 className="text-xl font-semibold mb-6">Subject Breakdown</h2>
          <div className="flex flex-col gap-5">
            {subjects.map(sub => (
              <div key={sub.name}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium">{sub.name}</span>
                  <span className="text-slate-400">{sub.score}%</span>
                </div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className={`h-full bg-gradient-to-r ${getColor(sub.score)} transition-all duration-1000 ease-out`}
                    style={{ width: `${sub.score}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Radar Chart */}
        <div className="glass-panel p-8 flex flex-col items-center">
          <h2 className="text-xl font-semibold mb-2 w-full">Skill Radar</h2>
          <div className="flex-1 w-full flex items-center justify-center py-8">
            {renderRadar()}
          </div>
        </div>
      </div>

      {/* Weak Topics to Review */}
      <div className="glass-panel p-8 border-rose-500/20 bg-gradient-to-br from-rose-500/5 to-transparent">
        <h2 className="text-xl font-semibold mb-4 text-rose-200">Recommended Review Targets</h2>
        <div className="flex flex-wrap gap-3">
          {data.weakTopics.map(topic => (
            <div key={topic} className="bg-black/30 border border-rose-500/20 rounded-xl p-4 flex items-center justify-between gap-6">
              <span className="font-medium text-slate-200">{topic}</span>
              <button className="text-xs bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 px-3 py-1.5 rounded-lg transition-colors">
                Practice Now
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
