import React, { useState, useEffect } from 'react';
import FBDCanvas from './FBDCanvas';
import EvaluationResults from './EvaluationResults';

const SUBJECTS = ['Fluid Mechanics', 'Machine Design', 'Solid Mechanics', 'Mechatronics', 'Calculus', 'Manufacturing', 'Plant Floor Troubleshooting'];

export default function ProblemSolver({ activeSubject, setActiveSubject, problemDecks, setProblemDecks }) {
  const [steps, setSteps] = useState([
    { id: 1, label: 'Given', content: '' },
    { id: 2, label: 'Find', content: '' },
    { id: 3, label: 'Solution', content: '' },
    { id: 4, label: 'Answer', content: '' }
  ]);
  const [canvasData, setCanvasData] = useState(null);
  const [fbdMode, setFbdMode] = useState('canvas');
  const [uploadedImage, setUploadedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setUploadedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };
  
  const [fetchingQuestion, setFetchingQuestion] = useState(false);
  const [error, setError] = useState(null);

  const [blacklist, setBlacklist] = useState(() => JSON.parse(localStorage.getItem('syllabus_blacklist') || '[]'));
  const [backlog, setBacklog] = useState(() => JSON.parse(localStorage.getItem('future_syllabus_backlog') || '[]'));
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [showModifyModal, setShowModifyModal] = useState(false);
  const [modifyCommand, setModifyCommand] = useState('');
  const [modifyingQuestion, setModifyingQuestion] = useState(false);

  const [difficulty, setDifficulty] = useState('Medium');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleDifficultyChange = (level) => {
    setDifficulty(level);
    
    setProblemDecks(prev => {
      const newDecks = { ...prev };
      delete newDecks[activeSubject];
      return newDecks;
    });
    
    fetchQuestionsForSubject(activeSubject, true, level);
  };

  const fetchQuestionsForSubject = async (subject, forceNew = false, diff = difficulty) => {
    if (!forceNew && problemDecks[subject] && problemDecks[subject].questions.length > 0) {
      return;
    }
    setFetchingQuestion(true);
    try {
      const promises = [1, 2, 3].map(() => 
        fetch(`${import.meta.env.VITE_API_URL}/api/generate-problem?subject=${encodeURIComponent(subject)}&difficulty=${encodeURIComponent(diff)}`)
          .then(res => {
            if (!res.ok) throw new Error('Failed');
            return res.json();
          })
          .catch(e => null)
      );
      const results = await Promise.all(promises);
      const newQuestions = results.filter(q => q !== null);
      
      if (newQuestions.length > 0) {
        setProblemDecks(prev => ({
          ...prev,
          [subject]: { questions: newQuestions, currentIndex: 0 }
        }));
      }
    } catch (e) {
      console.error('Failed to fetch problems:', e);
    }
    setFetchingQuestion(false);
  };

  useEffect(() => {
    fetchQuestionsForSubject(activeSubject);
  }, [activeSubject]);

  const deck = problemDecks[activeSubject] || { questions: [], currentIndex: 0 };
  const question = deck.questions[deck.currentIndex];

  const goNext = () => {
    if (deck.questions.length > 1) {
      setProblemDecks(prev => ({ ...prev, [activeSubject]: { ...prev[activeSubject], currentIndex: (deck.currentIndex + 1) % deck.questions.length } }));
      setResults(null); setError(null); setImagePreview(''); setUploadedImage(null);
    }
  };

  const goPrev = () => {
    if (deck.questions.length > 1) {
      setProblemDecks(prev => ({ ...prev, [activeSubject]: { ...prev[activeSubject], currentIndex: (deck.currentIndex - 1 + deck.questions.length) % deck.questions.length } }));
      setResults(null); setError(null); setImagePreview(''); setUploadedImage(null);
    }
  };

  const handleNewQuestions = () => {
    setResults(null); setError(null);
    fetchQuestionsForSubject(activeSubject, true);
  };

  const removeCurrentAndAdvance = () => {
    setProblemDecks(prev => {
      const currentDeck = prev[activeSubject];
      const newQuestions = currentDeck.questions.filter((_, idx) => idx !== currentDeck.currentIndex);
      return {
        ...prev,
        [activeSubject]: { questions: newQuestions, currentIndex: 0 }
      };
    });
  };

  const handleOutSyllabus = () => {
    if (!question) return;
    const newBlacklist = [...blacklist, question.id];
    setBlacklist(newBlacklist);
    localStorage.setItem('syllabus_blacklist', JSON.stringify(newBlacklist));
    removeCurrentAndAdvance();
    setShowFilterDropdown(false);
  };

  const handleSaveFuture = () => {
    if (!question) return;
    const newBacklog = [...backlog, question.id];
    setBacklog(newBacklog);
    localStorage.setItem('future_syllabus_backlog', JSON.stringify(newBacklog));
    removeCurrentAndAdvance();
    setShowFilterDropdown(false);
  };

  const handleModifySubmit = async () => {
    setModifyingQuestion(true);
    setError(null);
    try {
      const res = await fetch(import.meta.env.VITE_API_URL + '/api/modify-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ originalQuestion: question, command: modifyCommand })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || data.message || 'Failed to modify');
      } else {
        setProblemDecks(prev => {
          const currentDeck = prev[activeSubject];
          const newQuestions = [...currentDeck.questions];
          newQuestions[currentDeck.currentIndex] = data;
          return { ...prev, [activeSubject]: { ...currentDeck, questions: newQuestions } };
        });
        setShowModifyModal(false);
        setModifyCommand('');
      }
    } catch (e) {
      setError('Could not reach the server.');
    }
    setModifyingQuestion(false);
  };

  const updateStep = (id, content) => {
    setSteps(steps.map(s => s.id === id ? { ...s, content } : s));
  };

  const addStep = () => {
    setSteps(prev => {
      const newSteps = [...prev];
      const answerIndex = newSteps.findIndex(s => s.label.toLowerCase() === 'answer');
      const insertIndex = answerIndex !== -1 ? answerIndex : newSteps.length;
      newSteps.splice(insertIndex, 0, { id: Date.now(), label: `Step ${prev.length}`, content: '' });
      return newSteps;
    });
  };

  const handleSubmit = async () => {
    if (!question) return;
    
    if (fbdMode === 'canvas' && (!canvasData || canvasData.length < 100)) {
      setError('Please draw your FBD on the canvas or switch to upload an image.');
      return;
    }
    if (fbdMode === 'upload' && !imagePreview) {
      setError('Please upload an image for your FBD.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const textExplanation = steps.map(s => `${s.label}: ${s.content}`).join('\n');
      const payload = {
        canvasImage: fbdMode === 'canvas' ? canvasData : imagePreview,
        textExplanation,
        question: question.question
      };
      const res = await fetch(import.meta.env.VITE_API_URL + '/api/fbd-evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      
      if (res.status === 429) {
        setError(data.message || 'Gemini API rate limit exceeded.');
        setLoading(false);
        return;
      }
      
      if (!res.ok || data.error) {
        setError(data.error || `Server returned ${res.status}.`);
        setLoading(false);
        return;
      }
      
      setResults(data);

      const quality = Math.round(((data.confidenceScore || 0) + (data.technicalScore || 0)) / 40);
      await fetch(import.meta.env.VITE_API_URL + '/api/spaced-repetition/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: activeSubject, quality: Math.min(5, Math.max(1, quality)) })
      }).catch(() => {});
      
    } catch(e) {
      setError('Could not reach the server. Make sure the backend is running.');
    }
    setLoading(false);
  };

  if (results) {
    return (
      <div className="animate-fade-in pb-10">
        <h1 className="text-3xl font-bold mb-6">Evaluation Results</h1>
        <EvaluationResults results={results} />
        <div className="flex justify-end gap-4 mt-6">
            <button 
              onClick={() => { setResults(null); setError(null); }}
              className="glass-button px-6 py-3 font-semibold text-lg"
            >
              Retry Problem
            </button>
            <button 
              onClick={goNext}
              className="glass-button primary-gradient px-8 py-3 font-semibold text-lg"
            >
              Next Problem
            </button>
          </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 animate-fade-in pb-10 h-full">
      <header>
        <h1 className="text-3xl font-bold mb-2">Problem Solver & FBD Canvas</h1>
        <p className="text-slate-400">Break down complex problems and sketch Free Body Diagrams.</p>
      </header>
      
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {SUBJECTS.map(sub => (
          <button
            key={sub}
            onClick={() => { setActiveSubject(sub); setResults(null); setError(null); }}
            className={`px-4 py-2 min-h-[44px] rounded-full whitespace-nowrap transition-all text-sm flex items-center justify-center ${
              activeSubject === sub ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30' : 'bg-white/5 hover:bg-white/10 text-slate-300'
            }`}
          >
            {sub}
          </button>
        ))}
        <button
          onClick={handleNewQuestions}
          className="glass-button px-4 py-2 min-h-[44px] ml-auto flex items-center justify-center gap-2 text-sm"
        >
          🔀 New Problems
        </button>
      </div>

      {fetchingQuestion || modifyingQuestion ? (
        <div className="glass-panel p-12 flex flex-col items-center justify-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          {modifyingQuestion ? <div className="text-blue-400">Modifying problem scope with AI...</div> : <div className="text-blue-400">Loading problems...</div>}
        </div>
      ) : question ? (
        <div className="glass-panel p-6 relative">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-4">
            <h3 className="font-semibold text-lg flex-1">Current Problem</h3>
            
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-blue-500/20 text-blue-300 px-3 py-1 rounded-full text-xs font-medium border border-blue-500/20">{question.category}</span>
              <span className="bg-amber-500/20 text-amber-300 px-3 py-1 rounded-full text-xs font-medium border border-amber-500/20">
                {'★'.repeat(question.difficulty || 3)}{'☆'.repeat(5 - (question.difficulty || 3))}
              </span>
              
              <div className="relative h-8 flex items-center bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors ml-auto sm:ml-0">
                <select 
                  value={difficulty}
                  onChange={(e) => handleDifficultyChange(e.target.value)}
                  className="px-3 py-1 text-xs font-semibold text-blue-300 appearance-none bg-transparent outline-none h-full pr-8 cursor-pointer"
                  title="Difficulty Selector"
                >
                  <option value="Easy" className="text-slate-900">Easy</option>
                  <option value="Medium" className="text-slate-900">Medium</option>
                  <option value="Hard" className="text-slate-900">Hard</option>
                  <option value="Super Hard" className="text-slate-900">Super Hard</option>
                </select>
                <div className="absolute right-2 pointer-events-none text-blue-300">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </div>
              </div>
              
              {/* Syllabus Filter Wrench Icon */}
              <div className="relative">
                <button 
                  onClick={() => setShowFilterDropdown(!showFilterDropdown)} 
                  className="p-1.5 rounded-full hover:bg-white/10 transition-colors flex items-center justify-center bg-white/5 border border-white/10 min-h-[32px] min-w-[32px]" 
                  title="Syllabus Filter"
                >
                  <span className="text-sm">🔧</span>
                </button>
                {showFilterDropdown && (
                  <div className="absolute right-0 top-full mt-2 w-48 bg-slate-800 border border-white/10 rounded-xl shadow-xl z-20 overflow-hidden flex flex-col text-sm">
                    <button onClick={handleOutSyllabus} className="text-left px-4 py-3 hover:bg-white/5 transition-colors">❌ Out of Syllabus</button>
                    <button onClick={() => { setShowModifyModal(true); setShowFilterDropdown(false); }} className="text-left px-4 py-3 hover:bg-white/5 transition-colors border-y border-white/5">🔧 Modify Scope</button>
                    <button onClick={handleSaveFuture} className="text-left px-4 py-3 hover:bg-white/5 transition-colors">🗓️ Save for Future</button>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between w-full gap-4">
            <button 
              onClick={goPrev} 
              disabled={deck.questions.length <= 1}
              className="p-3 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full bg-white/5 border border-white/10 hover:bg-white/10 disabled:opacity-30 transition-colors flex-shrink-0"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            
            <div className="flex-1 flex flex-col items-center gap-6 min-w-0">
                <p className="text-slate-300 text-center text-base sm:text-lg md:text-xl leading-relaxed">{question.question}</p>
              
              {question.svg_diagram && (
                <div 
                  className="w-full max-w-2xl mx-auto bg-slate-800/80 rounded-xl border border-white/10 p-6 cursor-zoom-in hover:border-blue-500/50 hover:bg-slate-800 transition-all flex justify-center items-center shadow-inner overflow-hidden [&>svg]:w-full [&>svg]:h-auto [&>svg]:max-w-full"
                  onClick={() => setIsModalOpen(true)}
                  title="Click to expand diagram"
                  dangerouslySetInnerHTML={{ __html: question.svg_diagram }}
                />
              )}
            </div>

            <button 
              onClick={goNext}
              disabled={deck.questions.length <= 1}
              className="p-3 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full bg-white/5 border border-white/10 hover:bg-white/10 disabled:opacity-30 transition-colors flex-shrink-0"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7-7" /></svg>
            </button>
          </div>
        </div>
      ) : (
        <div className="glass-panel p-12 text-center text-slate-400">No problems available for this subject.</div>
      )}

      {error && (
        <div className="glass-panel p-6 border-rose-500/30 bg-rose-500/5">
          <div className="flex items-start gap-4">
            <span className="text-2xl">⚠️</span>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-rose-300 mb-1">Error</h3>
              <p className="text-slate-400 text-sm break-words">{error}</p>
            </div>
            <button onClick={() => setError(null)} className="glass-button px-4 py-2 text-sm">Dismiss</button>
          </div>
        </div>
      )}

      {question && !fetchingQuestion && !modifyingQuestion && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-[500px]">
            {/* Left Panel: Steps */}
            <div className="glass-panel p-6 flex flex-col gap-4 overflow-y-auto">
              <h3 className="font-semibold text-lg flex items-center gap-2">📝 Written Steps</h3>
              
              {steps.map((step) => (
                <div key={step.id} className="flex flex-col gap-1">
                  <label className="text-sm text-blue-400 font-medium">Step {steps.indexOf(step) + 1}: {step.label}</label>
                  <textarea
                    className="glass-input h-24 resize-none"
                    value={step.content}
                    onChange={(e) => updateStep(step.id, e.target.value)}
                    placeholder={`Enter your ${step.label.toLowerCase()} here...`}
                  />
                </div>
              ))}
              
              <button onClick={addStep} className="glass-button py-2 text-sm border-dashed text-slate-400 hover:text-white">
                + Add Step
              </button>
            </div>

            {/* Right Panel: Canvas / Upload */}
            <div className="glass-panel p-6 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">🎨 Free Body Diagram</h3>
                <div className="flex bg-black/30 rounded-lg p-1">
                  <button 
                    onClick={() => setFbdMode('canvas')} 
                    className={`px-3 py-1 min-h-[44px] rounded-md text-sm transition-colors ${fbdMode === 'canvas' ? 'bg-blue-500 text-white' : 'text-slate-400 hover:text-white'}`}
                  >
                    ✏️ Draw on Web
                  </button>
                  <button 
                    onClick={() => setFbdMode('upload')} 
                    className={`px-3 py-1 min-h-[44px] rounded-md text-sm transition-colors ${fbdMode === 'upload' ? 'bg-blue-500 text-white' : 'text-slate-400 hover:text-white'}`}
                  >
                    📸 Upload Picture
                  </button>
                </div>
              </div>
              <div className="flex-1 bg-white rounded-xl overflow-hidden border border-white/20 flex flex-col relative">
                {fbdMode === 'canvas' ? (
                  <FBDCanvas onExport={setCanvasData} />
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center p-6 bg-slate-900 border-2 border-dashed border-slate-600 hover:border-blue-500 rounded-xl m-2 cursor-pointer transition-colors relative">
                    <input type="file" accept="image/*" onChange={handleImageChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                    {imagePreview ? (
                      <div className="flex flex-col items-center gap-4">
                        <img src={imagePreview} alt="Preview" className="max-h-64 object-contain rounded-lg border border-white/10" />
                        <span className="text-sm text-blue-400 bg-blue-500/10 px-4 py-2 rounded-full">Tap to change image</span>
                      </div>
                    ) : (
                      <div className="text-slate-400 flex flex-col items-center gap-3 text-center">
                        <span className="text-4xl">📸</span>
                        <span className="font-medium text-white">Upload your sketch</span>
                        <span className="text-sm">Take a photo of your paper FBD or drag and drop here</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end mt-4">
            <button 
              onClick={handleSubmit} 
              disabled={loading}
              className="glass-button primary-gradient px-8 py-3 font-semibold text-lg disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? (
                <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> Evaluating...</>
              ) : 'Submit Solution'}
            </button>
          </div>
        </>
      )}

      {/* Modify Modal */}
      {showModifyModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="glass-panel p-6 w-full max-w-lg relative animate-fade-in bg-slate-900 border border-white/10">
            <h3 className="text-xl font-bold mb-4">🔧 Modify Scope</h3>
            <p className="text-sm text-slate-300 mb-4">How should we adjust this problem?</p>
            <textarea
              className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
              rows={3}
              placeholder="e.g. Change the cross section to an I-beam..."
              value={modifyCommand}
              onChange={e => setModifyCommand(e.target.value)}
              disabled={modifyingQuestion}
            />
            <div className="flex justify-end gap-3 mt-4">
              <button 
                onClick={() => setShowModifyModal(false)}
                className="px-4 py-2 text-slate-300 hover:text-white transition-colors"
                disabled={modifyingQuestion}
              >
                Cancel
              </button>
              <button 
                onClick={handleModifySubmit}
                disabled={!modifyCommand.trim() || modifyingQuestion}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {modifyingQuestion ? (
                  <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> Modifying...</>
                ) : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SVG Modal */}
      {isModalOpen && question?.svg_diagram && (
        <div 
          className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-[60] animate-fade-in cursor-zoom-out"
          onClick={() => setIsModalOpen(false)}
        >
          <div 
            className="w-full max-w-4xl max-h-[90vh] bg-white rounded-2xl p-6 flex justify-center items-center overflow-auto shadow-2xl shadow-blue-500/20 relative cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              className="absolute top-4 right-4 min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-800 hover:text-rose-500 transition-colors p-2 bg-slate-100 hover:bg-slate-200 rounded-full z-10"
              onClick={() => setIsModalOpen(false)}
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <div 
              className="w-full h-full [&>svg]:w-full [&>svg]:h-full [&>svg]:max-h-[80vh] flex justify-center items-center pointer-events-none"
              dangerouslySetInnerHTML={{ __html: question.svg_diagram }} 
            />
          </div>
        </div>
      )}
    </div>
  );
}
