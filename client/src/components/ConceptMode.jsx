import React, { useState, useEffect } from 'react';
import VoiceRecorder from './VoiceRecorder';
import EvaluationResults from './EvaluationResults';

const SUBJECTS = ['Fluid Mechanics', 'Machine Design', 'Solid Mechanics', 'Mechatronics', 'Calculus', 'Manufacturing', 'Plant Floor Troubleshooting'];

export default function ConceptMode({ activeSubject, setActiveSubject, questionDecks, setQuestionDecks }) {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [fetchingQuestion, setFetchingQuestion] = useState(false);
  const [error, setError] = useState(null);

  const [blacklist, setBlacklist] = useState(() => JSON.parse(localStorage.getItem('syllabus_blacklist') || '[]'));
  const [backlog, setBacklog] = useState(() => JSON.parse(localStorage.getItem('future_syllabus_backlog') || '[]'));
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [showModifyModal, setShowModifyModal] = useState(false);
  const [modifyCommand, setModifyCommand] = useState('');
  const [modifyingQuestion, setModifyingQuestion] = useState(false);

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const clearImage = () => {
    setImageFile(null);
    setImagePreview('');
  };

  const fetchQuestionsForSubject = async (subject, forceNew = false) => {
    if (!forceNew && questionDecks[subject] && questionDecks[subject].questions.length > 0) {
      return;
    }
    setFetchingQuestion(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/questions?subject=${encodeURIComponent(subject)}`);
      if (res.ok) {
        let allQuestions = await res.json();
        const allFiltered = allQuestions.filter(q => !blacklist.includes(q.id) && !backlog.includes(q.id));
        // Shuffle and pick 2
        for (let i = allFiltered.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [allFiltered[i], allFiltered[j]] = [allFiltered[j], allFiltered[i]];
        }
        setQuestionDecks(prev => ({
          ...prev,
          [subject]: { questions: allFiltered.slice(0, 2), currentIndex: 0 }
        }));
        setError(null);
      } else {
        setError('Failed to fetch questions from server.');
      }
    } catch (e) {
      console.error('Failed to fetch questions:', e);
      setError('Failed to fetch questions. Please check server.');
    }
    setFetchingQuestion(false);
  };

  useEffect(() => {
    fetchQuestionsForSubject(activeSubject);
  }, [activeSubject]);

  const deck = questionDecks[activeSubject] || { questions: [], currentIndex: 0 };
  const question = deck.questions[deck.currentIndex];

  useEffect(() => {
    clearImage();
  }, [question?.id]);

  const goNext = () => {
    if (deck.questions.length > 1) {
      setQuestionDecks(prev => ({ ...prev, [activeSubject]: { ...prev[activeSubject], currentIndex: (deck.currentIndex + 1) % deck.questions.length } }));
      setResults(null); setError(null);
    }
  };

  const goPrev = () => {
    if (deck.questions.length > 1) {
      setQuestionDecks(prev => ({ ...prev, [activeSubject]: { ...prev[activeSubject], currentIndex: (deck.currentIndex - 1 + deck.questions.length) % deck.questions.length } }));
      setResults(null); setError(null);
    }
  };

  const handleNewQuestions = () => {
    setResults(null); setError(null);
    fetchQuestionsForSubject(activeSubject, true);
  };

  const removeCurrentAndAdvance = () => {
    setQuestionDecks(prev => {
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
        setQuestionDecks(prev => {
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

  const handleTranscript = async (transcript) => {
    setLoading(true);
    setError(null);
    try {
      const payload = {
        transcript,
        question: question?.question || '',
        subject: activeSubject,
        mode: 'concept'
      };
      if (imagePreview) {
        payload.image = imagePreview;
      }
      const res = await fetch(import.meta.env.VITE_API_URL + '/api/evaluate-speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (res.status === 429) {
        setError(data.message || 'Gemini API rate limit exceeded. Please wait and try again.');
        setLoading(false);
        return;
      }

      if (!res.ok || data.error) {
        setError(data.error || `Server returned ${res.status}. Please check your Gemini API key and quota.`);
        setLoading(false);
        return;
      }

      setResults(data);

      const quality = Math.round(((data.confidenceScore || 0) + (data.technicalScore || 0)) / 40);
      await fetch(import.meta.env.VITE_API_URL + '/api/spaced-repetition/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: activeSubject, quality: Math.min(5, quality) })
      }).catch(() => {}); // don't block on SR update failure
    } catch (e) {
      console.error(e);
      setError('Could not reach the server. Make sure the backend is running on port 3001.');
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in pb-10">
      <header>
        <h1 className="text-3xl font-bold mb-2">Concept & Plant Floor Training</h1>
        <p className="text-slate-400">Master fundamental engineering concepts and real-world scenarios.</p>
      </header>

      {/* Subject Selector */}
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
          🔀 New Questions
        </button>
      </div>

      {!results ? (
        <>
          {/* Question Card */}
          {fetchingQuestion || modifyingQuestion ? (
            <div className="glass-panel p-12 flex flex-col items-center justify-center">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
              {modifyingQuestion && <div className="text-blue-400">Modifying question scope with AI...</div>}
            </div>
          ) : question ? (
            <div className="glass-panel p-8 relative overflow-visible">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-4">
                <h3 className="font-semibold text-lg flex-1">Current Concept</h3>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="bg-blue-500/20 text-blue-300 px-3 py-1 rounded-full text-xs font-medium border border-blue-500/20">{question.category}</span>
                  <span className="bg-amber-500/20 text-amber-300 px-3 py-1 rounded-full text-xs font-medium border border-amber-500/20">
                    {'★'.repeat(question.difficulty || 3)}{'☆'.repeat(5 - (question.difficulty || 3))}
                  </span>
                  
                  {/* Syllabus Filter Wrench Icon */}
                  <div className="relative ml-auto sm:ml-0">
                    <button 
                      onClick={() => setShowFilterDropdown(!showFilterDropdown)} 
                      className="p-1.5 min-h-[32px] min-w-[32px] flex items-center justify-center rounded-full hover:bg-white/10 transition-colors bg-white/5 border border-white/10" 
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
              
              <div className="flex items-center gap-4 mt-4 mb-8">
                <button 
                  onClick={goPrev} 
                  disabled={deck.questions.length <= 1}
                  className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full hover:bg-white/10 disabled:opacity-30 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <h2 className="text-base sm:text-lg md:text-xl leading-relaxed font-semibold flex-1 text-center">{question.question}</h2>
                <button 
                  onClick={goNext}
                  disabled={deck.questions.length <= 1}
                  className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full hover:bg-white/10 disabled:opacity-30 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
              
              <div className="mt-6 border-t border-white/10 pt-6">
                <div className="flex flex-col md:flex-row items-center gap-6 justify-center">
                  <div className="flex-1 w-full max-w-sm">
                    <VoiceRecorder onTranscriptComplete={handleTranscript} disabled={loading} />
                  </div>
                  <div className="flex-1 w-full max-w-sm">
                    <label className="block text-sm font-medium text-slate-300 mb-2 text-center">
                      (Optional) Attach a sketch
                    </label>
                    <div className="border-2 border-dashed border-slate-600 hover:border-blue-500 rounded-xl p-4 text-center cursor-pointer transition-colors relative flex items-center justify-center min-h-[100px]">
                      <input type="file" accept="image/*" onChange={handleImageChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" disabled={loading} />
                      {imagePreview ? (
                        <div className="flex flex-col items-center gap-2">
                          <img src={imagePreview} alt="Preview" className="h-16 object-contain rounded" />
                          <span className="text-xs text-blue-400">Change image</span>
                        </div>
                      ) : (
                        <div className="text-slate-400 flex flex-col items-center gap-2">
                          <span className="text-2xl">📸</span>
                          <span className="text-sm">Click or drag to upload</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="glass-panel p-12 text-center text-slate-400">No questions available for this subject.</div>
          )}

          {loading && (
            <div className="flex flex-col items-center justify-center p-12 text-blue-400 animate-pulse">
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
              Evaluating response with AI...
            </div>
          )}

          {error && (
            <div className="glass-panel p-6 border-rose-500/30 bg-rose-500/5">
              <div className="flex items-start gap-4">
                <span className="text-2xl">⚠️</span>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-rose-300 mb-1">Error</h3>
                  <p className="text-slate-400 text-sm break-words">{error}</p>
                </div>
                <button
                  onClick={() => setError(null)}
                  className="glass-button px-4 py-2 text-sm"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col gap-6">
          <EvaluationResults results={results} />
          <div className="flex justify-end gap-4">
            <button 
              onClick={() => { setResults(null); setError(null); }}
              className="glass-button px-6 py-3 font-semibold text-lg"
            >
              Retry Question
            </button>
            <button 
              onClick={goNext}
              className="glass-button primary-gradient px-8 py-3 font-semibold text-lg"
            >
              Next Question
            </button>
          </div>
        </div>
      )}

      {/* Modify Modal */}
      {showModifyModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="glass-panel p-6 w-full max-w-lg relative animate-fade-in bg-slate-900 border border-white/10">
            <h3 className="text-xl font-bold mb-4">🔧 Modify Scope</h3>
            <p className="text-sm text-slate-300 mb-4">How should we adjust this question?</p>
            <textarea
              className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
              rows={3}
              placeholder="e.g. Remove the thermodynamics part, focus only on solid mechanics..."
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
    </div>
  );
}
