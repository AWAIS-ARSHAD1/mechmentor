import re

with open('C:/Users/User/.gemini/antigravity/scratch/mechmentor/client/src/components/Sidebar.jsx', 'r') as f:
    content = f.read()

replacement = '''const AnimatedConceptIcon = () => (
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
      <path d="M3 3v18h18" />
      {bars.map((h, i) => (
        <motion.path
          key={i}
          d={\M\ 21v-\\}
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
];'''

new_content = re.sub(
    r'const AnimatedConceptIcon = \(\) => \(.*?const navItems = \[.*?\];',
    replacement,
    content,
    flags=re.DOTALL
)

with open('C:/Users/User/.gemini/antigravity/scratch/mechmentor/client/src/components/Sidebar.jsx', 'w') as f:
    f.write(new_content)
