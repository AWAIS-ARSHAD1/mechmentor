import React, { useState, useEffect, useRef } from 'react';
import VoiceRecorder from './VoiceRecorder';
import EvaluationResults from './EvaluationResults';

const DUMMY_PROMPT = "Tell me about a time you had to balance design constraints with manufacturing feasibility.";

export default function ElevatorPitchMode() {
  const [prompt, setPrompt] = useState(DUMMY_PROMPT);
  const [timeLeft, setTimeLeft] = useState(45);
  const [isActive, setIsActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  
  const timerRef = useRef(null);

  const fetchPrompt = async () => {
    try {
      const res = await fetch(import.meta.env.VITE_API_URL + '/api/elevator-pitches/random');
      if (res.ok) {
        const data = await res.json();
        setPrompt(data.topic ? `${data.scenario}: ${data.topic}` : DUMMY_PROMPT);
      }
    } catch(e) {}
  };

  useEffect(() => {
    fetchPrompt();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (isActive && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isActive) {
      setIsActive(false);
      clearInterval(timerRef.current);
      // Let VoiceRecorder handle submission via timeout or just inform user
    }
    return () => clearInterval(timerRef.current);
  }, [isActive, timeLeft]);

  const startPitch = () => {
    setResults(null);
    setTimeLeft(45);
    setIsActive(true);
    // VoiceRecorder is managed below, we just unhide or enable it
  };

  const handleTranscript = async (transcript) => {
    setIsActive(false);
    clearInterval(timerRef.current);
    setLoading(true);
    
    try {
      const res = await fetch(import.meta.env.VITE_API_URL + '/api/evaluate-speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript, question: prompt, mode: 'elevator', duration: 45 - timeLeft })
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setResults({
          confidenceScore: 0,
          technicalScore: 0,
          overallFeedback: data.error || `API error (${res.status}). Check your Gemini API key and quota.`,
          strengths: [],
          improvements: ['Could not evaluate — API error occurred'],
          idealResponse: null,
          fillerAnalysis: { totalFillers: 0, fillerCounts: {} }
        });
      } else {
        setResults(data);
      }
    } catch (e) {
      setResults({
        confidenceScore: 0,
        technicalScore: 0,
        overallFeedback: 'Could not reach the server. Make sure the backend is running on port 3001.',
        strengths: [],
        improvements: ['Network error — server may be offline'],
        idealResponse: null,
        fillerAnalysis: { totalFillers: 0, fillerCounts: {} }
      });
    }
    setLoading(false);
  };

  // SVG Circle calculation
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (timeLeft / 45) * circumference;
  
  let ringColor = 'stroke-emerald-400';
  if (timeLeft <= 30 && timeLeft > 15) ringColor = 'stroke-amber-400';
  if (timeLeft <= 15) ringColor = 'stroke-rose-400';

  return (
    <div className="flex flex-col gap-6 animate-fade-in pb-10">
      <header>
        <h1 className="text-3xl font-bold mb-2">Elevator Pitch</h1>
        <p className="text-slate-400">Nail your behavioral questions. You have 45 seconds.</p>
      </header>

      {!results ? (
        <div className="glass-panel p-8 flex flex-col items-center">
          <h2 className="text-2xl font-medium mb-12 text-center max-w-2xl">"{prompt}"</h2>
          
          <div className="relative w-40 h-40 mb-8 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 140 140">
              <circle cx="70" cy="70" r={radius} className="stroke-slate-700 fill-none" strokeWidth="8" />
              <circle 
                cx="70" cy="70" r={radius} 
                className={`${ringColor} fill-none transition-all duration-1000 ease-linear`} 
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center flex-col">
              <span className={`text-4xl font-bold font-mono ${timeLeft <= 15 ? 'text-rose-400 animate-pulse' : 'text-white'}`}>
                {timeLeft}
              </span>
              <span className="text-xs text-slate-400">sec</span>
            </div>
          </div>

          {!isActive && timeLeft === 45 ? (
            <button 
              onClick={startPitch}
              className="glass-button primary-gradient px-8 py-3 rounded-full font-bold text-lg shadow-[0_0_20px_rgba(59,130,246,0.5)] animate-bounce"
            >
              Start Pitch
            </button>
          ) : (
            <div className="w-full max-w-2xl">
              <VoiceRecorder 
                onTranscriptComplete={handleTranscript} 
                disabled={loading || (!isActive && timeLeft === 0)} 
                mode="elevator"
              />
            </div>
          )}

          {loading && <div className="mt-4 text-blue-400 animate-pulse">Evaluating pitch...</div>}
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <EvaluationResults results={results} />
          <div className="flex justify-center">
            <button 
              onClick={() => { setResults(null); fetchPrompt(); setTimeLeft(45); }}
              className="glass-button primary-gradient px-8 py-3 font-semibold text-lg"
            >
              Try Another Prompt
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
