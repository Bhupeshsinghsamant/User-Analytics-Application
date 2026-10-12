import React, { useState, useEffect, useRef } from 'react';
import { Flame, MousePointer, Info, RotateCcw } from 'lucide-react';

export default function ClickHeatmap({ pages = [], clicks = [], selectedPage, onSelectPage, loading = false, onRefresh }) {
  const [viewMode, setViewMode] = useState('heatmap'); // 'heatmap' or 'points'
  const [hoveredClick, setHoveredClick] = useState(null);
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  // Redraw canvas whenever clicks, viewMode, or container size changes
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    const width = container.clientWidth || 800;
    const height = Math.max(container.clientHeight || 520, 520);

    // Set canvas dimensions
    canvas.width = width;
    canvas.height = height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    if (clicks.length === 0) return;

    if (viewMode === 'heatmap') {
      // Draw smooth radial gradient heat spots
      clicks.forEach(c => {
        let x, y;
        if (c.normalizedCoordinates) {
          x = c.normalizedCoordinates.x * width;
          y = c.normalizedCoordinates.y * height;
        } else if (c.clickCoordinates) {
          const vw = c.viewport?.width || 1200;
          const vh = c.viewport?.height || 800;
          x = (c.clickCoordinates.x / vw) * width;
          y = (c.clickCoordinates.y / vh) * height;
        } else {
          return;
        }

        // Radial glow
        const radius = 35;
        const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
        grad.addColorStop(0, 'rgba(239, 68, 68, 0.7)');    // Bright Red center
        grad.addColorStop(0.3, 'rgba(249, 115, 22, 0.5)'); // Warm Orange
        grad.addColorStop(0.7, 'rgba(234, 179, 8, 0.25)'); // Yellow halo
        grad.addColorStop(1, 'rgba(234, 179, 8, 0)');     // Transparent edge

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
      });
    } else {
      // Draw precision pinpoints
      clicks.forEach(c => {
        let x, y;
        if (c.normalizedCoordinates) {
          x = c.normalizedCoordinates.x * width;
          y = c.normalizedCoordinates.y * height;
        } else if (c.clickCoordinates) {
          const vw = c.viewport?.width || 1200;
          const vh = c.viewport?.height || 800;
          x = (c.clickCoordinates.x / vw) * width;
          y = (c.clickCoordinates.y / vh) * height;
        } else {
          return;
        }

        // Outer pulse circle
        ctx.strokeStyle = 'rgba(79, 70, 229, 0.6)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, 8, 0, Math.PI * 2);
        ctx.stroke();

        // Inner solid dot
        ctx.fillStyle = '#4f46e5';
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
      });
    }
  }, [clicks, viewMode]);

  // Handle hover detection for tooltip
  function handleMouseMove(e) {
    const canvas = canvasRef.current;
    if (!canvas || clicks.length === 0) {
      setHoveredClick(null);
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const width = canvas.width;
    const height = canvas.height;

    // Find closest click within threshold
    let closest = null;
    let minDistance = 25; // 25px hit radius

    clicks.forEach(c => {
      let x, y;
      if (c.normalizedCoordinates) {
        x = c.normalizedCoordinates.x * width;
        y = c.normalizedCoordinates.y * height;
      } else if (c.clickCoordinates) {
        const vw = c.viewport?.width || 1200;
        const vh = c.viewport?.height || 800;
        x = (c.clickCoordinates.x / vw) * width;
        y = (c.clickCoordinates.y / vh) * height;
      } else {
        return;
      }

      const dist = Math.hypot(mouseX - x, mouseY - y);
      if (dist < minDistance) {
        minDistance = dist;
        closest = { ...c, screenX: mouseX, screenY: mouseY };
      }
    });

    setHoveredClick(closest);
  }

  return (
    <div className="card">
      <div className="card-header flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
            <Flame size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Real Click Heatmap</h2>
            <p className="text-xs text-slate-500">Visual click coordinate density mapped to viewport</p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Page Selector */}
          <select
            className="select-input"
            value={selectedPage}
            onChange={(e) => onSelectPage(e.target.value)}
          >
            <option value="">All Tracked Pages ({pages.length})</option>
            {pages.map((p, idx) => (
              <option key={idx} value={p}>{p}</option>
            ))}
          </select>

          {/* Mode Switcher */}
          <div className="btn-group-toggle">
            <button
              className={`btn-toggle ${viewMode === 'heatmap' ? 'active' : ''}`}
              onClick={() => setViewMode('heatmap')}
              title="Show continuous thermal intensity"
            >
              <Flame size={14} /> Density
            </button>
            <button
              className={`btn-toggle ${viewMode === 'points' ? 'active' : ''}`}
              onClick={() => setViewMode('points')}
              title="Show individual click coordinates"
            >
              <MousePointer size={14} /> Pinpoints
            </button>
          </div>

          <button className="btn-icon" onClick={onRefresh} title="Refresh click data">
            <RotateCcw size={14} />
          </button>
        </div>
      </div>

      {/* Heatmap Preview Container */}
      <div className="heatmap-viewport-wrapper" ref={containerRef}>
        {loading && (
          <div className="heatmap-loading-overlay">
            <span className="animate-spin text-2xl mr-2">⟳</span> Loading real click coordinates...
          </div>
        )}

        <canvas
          ref={canvasRef}
          className="heatmap-canvas"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoveredClick(null)}
        />

        {/* Mock/Reference browser background layout */}
        <div className="heatmap-backdrop">
          <div className="mock-nav">
            <div className="mock-logo">Demo Header / Navbar</div>
            <div className="mock-links">Home · Pricing · Docs</div>
          </div>
          <div className="mock-hero">
            <div className="mock-title">Main Content Area</div>
            <div className="mock-btn-box">
              <div className="mock-btn primary">CTA Button Area</div>
              <div className="mock-btn secondary">Secondary Link</div>
            </div>
          </div>
          <div className="mock-grid">
            <div className="mock-box">Feature Card 1</div>
            <div className="mock-box">Feature Card 2</div>
            <div className="mock-box">Feature Card 3</div>
          </div>
        </div>

        {/* Hover Tooltip */}
        {hoveredClick && (
          <div
            className="heatmap-tooltip"
            style={{
              left: `${hoveredClick.screenX + 15}px`,
              top: `${hoveredClick.screenY - 15}px`
            }}
          >
            <div className="font-bold text-xs text-slate-100 mb-0.5">
              Click: ({hoveredClick.clickCoordinates?.x}, {hoveredClick.clickCoordinates?.y})
            </div>
            {hoveredClick.targetText && (
              <div className="text-xs text-indigo-200 truncate">
                Target: "{hoveredClick.targetText}"
              </div>
            )}
            <div className="text-[10px] text-slate-400 mt-1">
              Session: {hoveredClick.sessionId?.substring(0, 12)}...
            </div>
          </div>
        )}
      </div>

      {/* Footer info / legend */}
      <div className="card-footer flex justify-between items-center text-xs text-slate-500 pt-3 border-t">
        <span className="flex items-center gap-1.5">
          <Info size={14} className="text-slate-400" />
          Showing <strong>{clicks.length}</strong> recorded clicks. Density increases with overlapping click coordinates.
        </span>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-[11px]">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block"></span> High Density
          </span>
          <span className="flex items-center gap-1 text-[11px]">
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 inline-block"></span> Moderate
          </span>
          <span className="flex items-center gap-1 text-[11px]">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block"></span> Individual
          </span>
        </div>
      </div>
    </div>
  );
}
