import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import ConceptMode from './components/ConceptMode';
import ElevatorPitchMode from './components/ElevatorPitchMode';
import ProblemSolver from './components/ProblemSolver';
import NoteScanner from './components/NoteScanner';
import WeaknessHeatmap from './components/WeaknessHeatmap';
import NotificationBanner from './components/NotificationBanner';

function App() {
  const [activeMode, setActiveMode] = useState('concept');
  const [dueCount, setDueCount] = useState(0);
  const [weakestSubject, setWeakestSubject] = useState('');
  const [showNotification, setShowNotification] = useState(false);
  const [isWakingServer, setIsWakingServer] = useState(false);
  const [activeSubject, setActiveSubject] = useState('Fluid Mechanics');
  const [questionDecks, setQuestionDecks] = useState({});
  const [problemDecks, setProblemDecks] = useState({});

  useEffect(() => {
    // Fetch user progress and due drills
    const fetchProgress = async () => {
      const wakeTimeout = setTimeout(() => {
        setIsWakingServer(true);
      }, 3000);

      try {
        const heatmapRes = await fetch(import.meta.env.VITE_API_URL + '/api/spaced-repetition/heatmap');
        if (heatmapRes.ok) {
          const data = await heatmapRes.json();
          if (data && data.weakest) setWeakestSubject(data.weakest);
        }
        
        const dueRes = await fetch(import.meta.env.VITE_API_URL + '/api/spaced-repetition/due');
        if (dueRes.ok) {
          const data = await dueRes.json();
          if (data && data.length > 0) {
            setDueCount(data.length);
            setShowNotification(true);
          }
        }
      } catch (err) {
        console.error('Failed to fetch progress', err);
      } finally {
        clearTimeout(wakeTimeout);
        setIsWakingServer(false);
      }
    };
    fetchProgress();
  }, []);

  const handleStartQuizFromScanner = (conceptQuestions, problemQuestions, subject) => {
    const targetSubject = subject || activeSubject || 'Fluid Mechanics';
    setActiveSubject(targetSubject);
    
    const hasConcept = conceptQuestions && conceptQuestions.length > 0;
    const hasProblem = problemQuestions && problemQuestions.length > 0;

    if (hasConcept) {
      setQuestionDecks(prev => ({
        ...prev,
        [targetSubject]: { questions: conceptQuestions, currentIndex: 0 }
      }));
    }
    
    if (hasProblem) {
      setProblemDecks(prev => ({
        ...prev,
        [targetSubject]: { questions: problemQuestions, currentIndex: 0 }
      }));
    }

    if (hasConcept) {
      setActiveMode('concept');
    } else if (hasProblem) {
      setActiveMode('problem');
    } else {
      setActiveMode('concept');
    }
  };

  const renderContent = () => {
    switch (activeMode) {
      case 'concept': return <ConceptMode activeSubject={activeSubject} setActiveSubject={setActiveSubject} questionDecks={questionDecks} setQuestionDecks={setQuestionDecks} />;
      case 'elevator': return <ElevatorPitchMode />;
      case 'problem': return <ProblemSolver activeSubject={activeSubject} setActiveSubject={setActiveSubject} problemDecks={problemDecks} setProblemDecks={setProblemDecks} />;
      case 'scanner': return <NoteScanner onStartQuiz={handleStartQuizFromScanner} />;
      case 'heatmap': return <WeaknessHeatmap />;
      default: return <ConceptMode activeSubject={activeSubject} setActiveSubject={setActiveSubject} questionDecks={questionDecks} setQuestionDecks={setQuestionDecks} />;
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-dvh overflow-hidden bg-[#0f172a] text-slate-200">
      <Sidebar activeMode={activeMode} onModeChange={setActiveMode} />
      
      <main className="flex-1 relative overflow-y-auto overflow-x-hidden min-w-0 pb-28 md:pb-0">
        {isWakingServer && (
          <div className="bg-blue-500/20 border-b border-blue-500/30 text-blue-200 px-6 py-3 flex items-center justify-center gap-3 animate-fade-in z-50">
            <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
            <span className="font-medium text-sm text-center">Waking up the server, this may take up to a minute...</span>
          </div>
        )}
        
        {showNotification && (
          <NotificationBanner 
            dueCount={dueCount} 
            weakestSubject={weakestSubject}
            onStartDrill={() => { setShowNotification(false); setActiveMode('concept'); }}
            onDismiss={() => setShowNotification(false)}
          />
        )}
        
        <div className="p-8 max-w-7xl mx-auto min-h-full flex flex-col">
          <div className="flex-1">
            {renderContent()}
          </div>
          <footer className="w-full text-center py-6 mt-8 text-slate-500 text-sm border-t border-white/10 opacity-70 hover:opacity-100 transition-opacity">
            Created by Awais Arshad
          </footer>
        </div>
      </main>
    </div>
  );
}

export default App;
