import React, { useState, useRef } from 'react';

export default function NoteScanner({ onStartQuiz }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (selectedFile) => {
    if (!selectedFile) return;
    
    // Validate file size (100MB limit)
    const MAX_FILE_SIZE = 100 * 1024 * 1024;
    if (selectedFile.size > MAX_FILE_SIZE) {
      setError(`File too large. Maximum allowed size is 100MB.`);
      setFile(null);
      setPreview(null);
      return;
    }

    setFile(selectedFile);
    setError(null);
    setResults(null);
    
    if (selectedFile.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target.result);
      reader.readAsDataURL(selectedFile);
    } else {
      setPreview(null);
    }
  };

  const uploadFile = async () => {
    if (!file) return;
    
    setLoading(true);
    setError(null);
    setResults(null);
    setProgress(5);
    
    // Smooth progress bar increment
    const interval = setInterval(() => {
      setProgress(p => (p >= 92 ? 92 : p + (p < 50 ? 8 : 4)));
    }, 400);

    const formData = new FormData();
    formData.append('notes', file);

    try {
      const apiUrl = import.meta.env.VITE_API_URL || '';
      const res = await fetch(apiUrl + '/api/scan-notes', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      clearInterval(interval);

      if (!res.ok || data.error) {
        const errorMsg = data.error || `Server returned status ${res.status}: Failed to scan document.`;
        setError(errorMsg);
        setResults(null);
        setProgress(0);
        setLoading(false);
        return;
      }

      // Check extracted questions
      const questions = data.generatedQuestions || data.questions || [];
      if (!Array.isArray(questions) || questions.length === 0) {
        setError('No quiz questions could be extracted from this document. Please ensure the file contains readable notes or text.');
        setResults(null);
        setProgress(0);
        setLoading(false);
        return;
      }

      setProgress(100);
      setTimeout(() => {
        setResults(data);
        setLoading(false);
      }, 400);

    } catch (e) {
      clearInterval(interval);
      console.error('Note Scanner Upload Error:', e);
      setError(e.message || 'Network error occurred while uploading. Please check backend connection.');
      setResults(null);
      setProgress(0);
      setLoading(false);
    }
  };

  // Extract normalized question data
  const questions = results?.generatedQuestions || results?.questions || [];
  const detectedSubjects = results?.detectedSubjects || results?.subjects || [];
  const extractedTopics = results?.extractedTopics || results?.topics || [];
  const hasQuestions = Array.isArray(questions) && questions.length > 0;

  const handleStartQuizClick = () => {
    if (!hasQuestions) return;
    const primarySubject = detectedSubjects[0] || 'Scanned Notes';
    
    // Convert strings to question objects if necessary
    const formattedQuestions = questions.map((q, idx) => {
      if (typeof q === 'string') {
        return {
          id: `SCAN-${idx + 1}`,
          type: 'concept',
          question: q,
          category: primarySubject,
          difficulty: 3,
          idealResponse: 'Focus on core principles extracted from class notes.'
        };
      }
      return {
        id: q.id || `SCAN-${idx + 1}`,
        type: q.type?.toLowerCase() || 'concept',
        question: q.question || 'Scanned Question',
        category: primarySubject,
        difficulty: q.difficulty || 3,
        idealResponse: q.idealResponse || 'Focus on core principles extracted from class notes.'
      };
    });

    const conceptQuestions = formattedQuestions.filter(q => q.type !== 'problem-solver' && q.type !== 'problem');
    const problemQuestions = formattedQuestions.filter(q => q.type === 'problem-solver' || q.type === 'problem');

    if (onStartQuiz) {
      onStartQuiz(conceptQuestions, problemQuestions, primarySubject);
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in pb-10 max-w-4xl mx-auto">
      <header className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Note Scanner</h1>
        <p className="text-slate-400">Upload your class notes to generate custom interview questions.</p>
      </header>

      {/* Error Message Banner */}
      {error && (
        <div className="glass-panel p-6 border-rose-500/40 bg-rose-500/10 rounded-2xl flex items-start gap-4 animate-shake">
          <span className="text-3xl">⚠️</span>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-rose-300 mb-1">Scanning Error</h3>
            <p className="text-slate-200 text-sm break-words">{error}</p>
          </div>
          <button 
            onClick={() => setError(null)}
            className="glass-button px-3 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-500/20"
          >
            Dismiss
          </button>
        </div>
      )}

      {!results ? (
        <div className="glass-panel p-8">
          <div 
            className={`border-2 border-dashed border-blue-500/30 rounded-2xl p-6 md:p-12 text-center transition-all cursor-pointer hover:bg-white/5 ${file ? 'bg-white/5' : ''}`}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*,application/pdf"
              capture="environment"
              onChange={(e) => handleFileSelect(e.target.files[0])}
            />
            
            {preview ? (
              <img src={preview} alt="Preview" className="max-h-48 mx-auto rounded-lg shadow-lg mb-4" />
            ) : (
              <div className="text-6xl mb-4">📄</div>
            )}
            
            <h3 className="text-xl font-semibold mb-2">
              {file ? file.name : 'Drag & Drop your notes here'}
            </h3>
            <p className="text-slate-400 text-sm">
              Supports PDF, JPG, PNG, TXT, DOC, DOCX (Up to 100MB)
            </p>
            {file && (
              <span className="text-xs text-blue-400 font-mono mt-2 inline-block">
                {(file.size / (1024 * 1024)).toFixed(2)} MB
              </span>
            )}
          </div>

          {file && (
            <div className="mt-8 flex flex-col items-center">
              {loading ? (
                <div className="w-full max-w-md bg-slate-900/60 p-6 rounded-2xl border border-white/10 flex flex-col items-center">
                  <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                  <div className="flex justify-between w-full text-sm mb-2 text-slate-300 font-medium">
                    <span>Scanning document & extracting concepts...</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-700 rounded-full overflow-hidden mb-3">
                    <div 
                      className="h-full bg-gradient-to-r from-blue-500 to-violet-500 transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-400 text-center animate-pulse">
                    Processing file... This may take up to a minute for larger documents (up to 100MB). Please wait.
                  </p>
                </div>
              ) : (
                <button 
                  onClick={uploadFile}
                  className="glass-button primary-gradient px-8 py-3 rounded-full font-bold text-lg hover:scale-105 transition-transform"
                >
                  Scan & Generate Questions ⚡
                </button>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="glass-panel p-8 animate-slide-down">
          <div className="flex items-center gap-4 mb-8 pb-6 border-b border-white/10">
            <div className="bg-emerald-500/20 text-emerald-400 p-3 rounded-xl text-2xl">✨</div>
            <div>
              <h2 className="text-2xl font-bold">Analysis Complete!</h2>
              <p className="text-slate-400">We extracted these key concepts from your notes.</p>
            </div>
            <button 
              onClick={() => { setResults(null); setFile(null); setPreview(null); }}
              className="ml-auto glass-button px-4 py-2 text-sm"
            >
              Scan Another File 📁
            </button>
          </div>

          <div className="mb-8">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Detected Subjects</h3>
            <div className="flex flex-wrap gap-2">
              {detectedSubjects.length > 0 ? (
                detectedSubjects.map((s, i) => (
                  <span key={i} className="bg-blue-500/20 text-blue-300 border border-blue-500/20 px-3 py-1 rounded-full text-sm font-medium">
                    {s}
                  </span>
                ))
              ) : (
                <span className="text-slate-500 text-sm italic">General Mechanical Engineering</span>
              )}
            </div>
          </div>

          <div className="mb-8">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Key Topics</h3>
            <div className="flex flex-wrap gap-2">
              {extractedTopics.length > 0 ? (
                extractedTopics.map((t, i) => (
                  <span key={i} className="bg-white/10 border border-white/10 px-3 py-1 rounded-full text-sm">
                    {t}
                  </span>
                ))
              ) : (
                <span className="text-slate-500 text-sm italic">Engineering Concepts</span>
              )}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Generated Practice Questions</h3>
            <div className="flex flex-col gap-3">
              {questions.map((q, i) => (
                <div key={i} className="bg-black/20 p-4 rounded-xl border border-white/5 flex gap-4 items-start">
                  <div className="bg-blue-500/20 text-blue-400 w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-xs">
                    {i + 1}
                  </div>
                  <p className="text-slate-200">{typeof q === 'string' ? q : q.question}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-10 flex justify-end">
            <button 
              disabled={!hasQuestions}
              onClick={handleStartQuizClick}
              className={`glass-button primary-gradient px-8 py-3 font-semibold text-lg flex items-center gap-2 ${
                !hasQuestions ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 transition-transform'
              }`}
            >
              Start Quiz with These Questions 🚀
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
