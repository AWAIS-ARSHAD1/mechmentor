import React, { useRef, useState, useEffect } from 'react';

export default function FBDCanvas({ onExport }) {
  const canvasRef = useRef(null);
  const [ctx, setCtx] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState('pen'); // pen, line, arrow, eraser
  const [color, setColor] = useState('#000000');
  const [lineWidth, setLineWidth] = useState(2);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [history, setHistory] = useState([]);
  const [historyStep, setHistoryStep] = useState(-1);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Set internal resolution
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    
    const context = canvas.getContext('2d');
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    setCtx(context);
    
    saveState(canvas);
  }, []);

  const saveState = (canvas = canvasRef.current) => {
    if (!canvas) return;
    const dataUrl = canvas.toDataURL();
    const newHistory = history.slice(0, historyStep + 1);
    newHistory.push(dataUrl);
    setHistory(newHistory);
    setHistoryStep(newHistory.length - 1);
    
    if (onExport) onExport(dataUrl);
  };

  const getPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const startDraw = (e) => {
    const pos = getPos(e);
    setStartPos(pos);
    setIsDrawing(true);
    
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
      ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : color;
      ctx.lineWidth = tool === 'eraser' ? lineWidth * 4 : lineWidth;
    }
  };

  const draw = (e) => {
    if (!isDrawing || !ctx) return;
    const pos = getPos(e);
    
    if (tool === 'pen' || tool === 'eraser') {
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    } else {
      // For line/arrow, we need to redraw the previous state and draw preview
      const img = new Image();
      img.src = history[historyStep];
      img.onload = () => {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        ctx.drawImage(img, 0, 0);
        
        ctx.beginPath();
        ctx.moveTo(startPos.x, startPos.y);
        ctx.lineTo(pos.x, pos.y);
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.stroke();
        
        if (tool === 'arrow') {
          // Draw arrowhead
          const angle = Math.atan2(pos.y - startPos.y, pos.x - startPos.x);
          const headlen = 10 * (lineWidth/2);
          ctx.beginPath();
          ctx.moveTo(pos.x, pos.y);
          ctx.lineTo(pos.x - headlen * Math.cos(angle - Math.PI / 6), pos.y - headlen * Math.sin(angle - Math.PI / 6));
          ctx.moveTo(pos.x, pos.y);
          ctx.lineTo(pos.x - headlen * Math.cos(angle + Math.PI / 6), pos.y - headlen * Math.sin(angle + Math.PI / 6));
          ctx.stroke();
        }
      };
    }
  };

  const endDraw = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (ctx) ctx.closePath();
    saveState();
  };

  const undo = () => {
    if (historyStep > 0) {
      const step = historyStep - 1;
      setHistoryStep(step);
      const img = new Image();
      img.src = history[step];
      img.onload = () => {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        ctx.drawImage(img, 0, 0);
        if (onExport) onExport(history[step]);
      };
    }
  };

  const redo = () => {
    if (historyStep < history.length - 1) {
      const step = historyStep + 1;
      setHistoryStep(step);
      const img = new Image();
      img.src = history[step];
      img.onload = () => {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        ctx.drawImage(img, 0, 0);
        if (onExport) onExport(history[step]);
      };
    }
  };

  const clearCanvas = () => {
    if (window.confirm("Clear entire canvas?")) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      saveState();
    }
  };

  const colors = ['#000000', '#ef4444', '#3b82f6', '#10b981'];

  return (
    <div className="flex flex-col h-full w-full bg-slate-100 rounded-xl">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 p-2 bg-slate-800 border-b border-slate-700 text-slate-200">
        <button onClick={() => setTool('pen')} className={`p-2 rounded ${tool === 'pen' ? 'bg-blue-500' : 'hover:bg-slate-700'}`}>✏️</button>
        <button onClick={() => setTool('line')} className={`p-2 rounded ${tool === 'line' ? 'bg-blue-500' : 'hover:bg-slate-700'}`}>➖</button>
        <button onClick={() => setTool('arrow')} className={`p-2 rounded ${tool === 'arrow' ? 'bg-blue-500' : 'hover:bg-slate-700'}`}>↗️</button>
        <button onClick={() => setTool('eraser')} className={`p-2 rounded ${tool === 'eraser' ? 'bg-blue-500' : 'hover:bg-slate-700'}`}>🧹</button>
        
        <div className="w-px h-6 bg-slate-600 mx-1"></div>
        
        <div className="flex gap-1">
          {colors.map(c => (
            <button 
              key={c} 
              onClick={() => setColor(c)} 
              className={`w-6 h-6 rounded-full border-2 ${color === c ? 'border-white' : 'border-transparent'}`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>

        <div className="w-px h-6 bg-slate-600 mx-1"></div>
        
        <select 
          value={lineWidth} 
          onChange={(e) => setLineWidth(Number(e.target.value))}
          className="bg-slate-700 border-none rounded p-1 text-sm outline-none"
        >
          <option value="1">Thin</option>
          <option value="2">Medium</option>
          <option value="4">Thick</option>
        </select>

        <div className="w-px h-6 bg-slate-600 mx-1"></div>

        <button onClick={undo} disabled={historyStep <= 0} className="p-1 disabled:opacity-30">↩️</button>
        <button onClick={redo} disabled={historyStep >= history.length - 1} className="p-1 disabled:opacity-30">↪️</button>
        
        <button onClick={clearCanvas} className="ml-auto text-xs text-rose-400 hover:text-rose-300 px-2">Clear All</button>
      </div>

      {/* Canvas Area */}
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-crosshair touch-none"
        onMouseDown={startDraw}
        onMouseMove={draw}
        onMouseUp={endDraw}
        onMouseOut={endDraw}
        onTouchStart={startDraw}
        onTouchMove={draw}
        onTouchEnd={endDraw}
      />
    </div>
  );
}
