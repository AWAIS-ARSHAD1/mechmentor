import React, { useEffect, useState } from 'react';

// Animated circular gauge
const ScoreGauge = ({ score: rawScore, label, colorClass }) => {
  const score = typeof rawScore === 'number' && !isNaN(rawScore) ? rawScore : 0;
  const [current, setCurrent] = useState(0);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrent(score);
    }, 100);
    return () => clearTimeout(timer);
  }, [score]);

  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (current / 100) * circumference;

  let strokeColor = 'stroke-emerald-400';
  if (score < 75) strokeColor = 'stroke-amber-400';
  if (score < 50) strokeColor = 'stroke-rose-400';

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-24 h-24 mb-2 flex items-center justify-center">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r={radius} className="stroke-slate-700 fill-none" strokeWidth="8" />
          <circle 
            cx="50" cy="50" r={radius} 
            className={`${strokeColor} fill-none transition-all duration-1000 ease-out`} 
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center flex-col">
          <span className="text-2xl font-bold text-white">{current}</span>
          <span className="text-[10px] text-slate-400 -mt-1">%</span>
        </div>
      </div>
      <span className="text-sm font-medium text-slate-300">{label}</span>
    </div>
  );
};

export default function EvaluationResults({ results }) {
  const [expanded, setExpanded] = useState(false);

  if (!results) return null;

  return (
    <div className="glass-panel p-8 animate-slide-down">
      <h2 className="text-2xl font-bold mb-6 text-white border-b border-white/10 pb-4">Performance Evaluation</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
        <div className="flex justify-center border-r border-white/5">
          <ScoreGauge score={results.diagramScore !== undefined ? results.diagramScore : results.confidenceScore} label={results.diagramScore !== undefined ? "Diagram Accuracy" : "Confidence & Delivery"} />
        </div>
        <div className="flex justify-center lg:border-r border-white/5">
          <ScoreGauge score={results.explanationScore !== undefined ? results.explanationScore : results.technicalScore} label={results.explanationScore !== undefined ? "Explanation Quality" : "Technical Accuracy"} />
        </div>
        <div className="col-span-1 md:col-span-2 flex flex-col justify-center">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Overall Feedback</h3>
          <p className="text-slate-200 text-lg leading-relaxed">
            {results.overallFeedback || results.feedback || results.diagramFeedback || ''}
          </p>
          {results.explanationFeedback && (
            <p className="text-slate-200 text-lg leading-relaxed mt-2">{results.explanationFeedback}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-6">
          <h3 className="text-emerald-400 font-semibold mb-4 flex items-center gap-2">
            <span className="bg-emerald-500/20 p-1 rounded">✅</span> Strengths
          </h3>
          <ul className="space-y-3">
            {(results.strengths || []).map((s, i) => (
              <li key={i} className="flex gap-3 text-slate-300">
                <span className="text-emerald-400 mt-0.5">•</span>
                <span>{s}</span>
              </li>
            ))}
            {!results.strengths && results.diagramScore !== undefined && (
              <li className="flex gap-3 text-slate-300">
                <span className="text-emerald-400 mt-0.5">•</span>
                <span>See overall feedback for strengths</span>
              </li>
            )}
          </ul>
        </div>
        
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-6">
          <h3 className="text-amber-400 font-semibold mb-4 flex items-center gap-2">
            <span className="bg-amber-500/20 p-1 rounded">🎯</span> Areas to Improve
          </h3>
          <ul className="space-y-3">
            {(results.improvements || results.missingElements || []).map((s, i) => (
              <li key={i} className="flex gap-3 text-slate-300">
                <span className="text-amber-400 mt-0.5">•</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {results.fillerAnalysis && results.fillerAnalysis.totalFillers > 0 && (
        <div className="mb-8">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Filler Words Detected ({results.fillerAnalysis.totalFillers} total)
          </h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(results.fillerAnalysis.fillerCounts).map(([word, count]) => (
              <span key={word} className="bg-rose-500/20 text-rose-300 border border-rose-500/30 px-3 py-1 rounded-full text-sm">
                "{word}" × {count}
              </span>
            ))}
          </div>
        </div>
      )}

      {(results.idealResponse || results.idealApproach) && (
        <div className="border border-white/10 rounded-2xl overflow-hidden bg-black/20">
          <button 
            onClick={() => setExpanded(!expanded)}
            className="w-full p-4 flex justify-between items-center hover:bg-white/5 transition-colors text-left"
          >
            <span className="font-medium flex items-center gap-2">
              💡 View Ideal Response
            </span>
            <span className="text-slate-400">{expanded ? '▲' : '▼'}</span>
          </button>
          
          {expanded && (
            <div className="p-6 border-t border-white/10 text-slate-300 leading-relaxed italic bg-blue-900/10">
              "{results.idealResponse || results.idealApproach}"
            </div>
          )}
        </div>
      )}
    </div>
  );
}
