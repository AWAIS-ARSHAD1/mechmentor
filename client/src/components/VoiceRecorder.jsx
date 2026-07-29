import React, { useState, useEffect, useRef } from 'react';

export default function VoiceRecorder({ onTranscriptComplete, disabled, mode = "default" }) {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [duration, setDuration] = useState(0);
  const [useText, setUseText] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [isSupported, setIsSupported] = useState(false);
  
  const recognitionRef = useRef(null);
  const timerRef = useRef(null);
  const isRecordingRef = useRef(false);

  // Keep ref in sync with state
  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        setIsSupported(true);
        
        recognitionRef.current.onresult = (event) => {
          let final = '';
          let interim = '';
          
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              final += event.results[i][0].transcript;
            } else {
              interim += event.results[i][0].transcript;
            }
          }
          
          if (final) setTranscript(prev => prev + ' ' + final);
          setInterimTranscript(interim);
        };

        recognitionRef.current.onend = () => {
          if (isRecordingRef.current) {
            // Auto restart if it stopped unexpectedly but we still want to record
            try { recognitionRef.current.start(); } catch(e) {}
          }
        };
      }
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      try { if (recognitionRef.current) recognitionRef.current.stop(); } catch(e) {}
    };
  }, []);

  const toggleRecording = () => {
    if (disabled) return;
    
    if (isRecording) {
      setIsRecording(false);
      if (recognitionRef.current) recognitionRef.current.stop();
      if (timerRef.current) clearInterval(timerRef.current);
    } else {
      setTranscript('');
      setInterimTranscript('');
      setDuration(0);
      setIsRecording(true);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch(e) {}
      }
      timerRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const highlightFillers = (text) => {
    if (!text) return null;
    const fillers = ['um', 'uh', 'like', 'you know', 'basically', 'actually'];
    const regex = new RegExp(`\\b(${fillers.join('|')})\\b`, 'gi');
    
    const parts = text.split(regex);
    return parts.map((part, i) => {
      if (fillers.includes(part.toLowerCase())) {
        return <span key={i} className="bg-rose-500/20 text-rose-400 rounded px-1">{part}</span>;
      }
      return part;
    });
  };

  const handleSubmit = () => {
    if (useText) {
      onTranscriptComplete(textInput);
    } else {
      onTranscriptComplete(transcript + ' ' + interimTranscript);
    }
  };

  if (!isSupported && !useText) {
    return (
      <div className="p-4 border border-rose-500/30 bg-rose-500/10 rounded-xl text-rose-200 text-sm">
        Speech recognition not supported in this browser. Please use text input.
        <button onClick={() => setUseText(true)} className="ml-4 underline text-white min-h-[44px] px-2">Switch to Text</button>
      </div>
    );
  }

  return (
    <div className="glass-panel p-6 flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          {useText ? '✍️ Text Input' : '🎤 Voice Recorder'}
        </h3>
        <button 
          onClick={() => setUseText(!useText)} 
          className="text-xs text-slate-400 hover:text-white transition-colors min-h-[44px] px-2 flex items-center justify-center"
          disabled={isRecording}
        >
          {useText ? 'Use Voice Instead' : 'Use Text Instead'}
        </button>
      </div>

      {useText ? (
        <textarea
          className="glass-input w-full h-32 resize-none"
          placeholder="Type your answer here..."
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
          disabled={disabled}
        />
      ) : (
        <div className="flex flex-col items-center justify-center p-6 bg-black/20 rounded-xl border border-white/5 relative min-h-[150px]">
          <div className="absolute top-4 right-4 font-mono text-slate-400">
            {formatTime(duration)}
          </div>
          
          <button
            onClick={toggleRecording}
            disabled={disabled}
            className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl transition-all ${
              isRecording 
                ? 'bg-rose-500 text-white animate-pulse-ring' 
                : 'bg-white/10 hover:bg-white/20 text-slate-300'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isRecording ? '⏹️' : '🎙️'}
          </button>
          
          <div className="mt-6 w-full text-center text-slate-300 text-sm leading-relaxed max-h-32 overflow-y-auto">
            {!transcript && !interimTranscript && !isRecording && "Click the microphone to start speaking"}
            {highlightFillers(transcript)}
            <span className="text-slate-400 italic"> {interimTranscript}</span>
          </div>
        </div>
      )}

      <div className="flex justify-end mt-2">
        <button
          onClick={handleSubmit}
          disabled={disabled || (useText ? !textInput : (!transcript && !interimTranscript))}
          className="glass-button primary-gradient px-6 py-2 min-h-[44px] font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          Submit Answer
        </button>
      </div>
    </div>
  );
}
