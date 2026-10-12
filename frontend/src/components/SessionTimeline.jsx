import React from 'react';
import { Eye, MousePointerClick, Clock, Compass } from 'lucide-react';

export default function SessionTimeline({ sessionId, events = [], loading = false }) {
  if (!sessionId) {
    return (
      <div className="card timeline-empty">
        <Compass size={36} className="text-slate-300 mx-auto mb-2" />
        <h3 className="text-sm font-semibold text-slate-700">No Session Selected</h3>
        <p className="text-xs text-slate-400 mt-1">Click "Inspect" on any session on the left to see the step-by-step user journey.</p>
      </div>
    );
  }

  function formatTime(isoStr) {
    try {
      return new Date(isoStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return '';
    }
  }

  return (
    <div className="card">
      <div className="card-header border-b pb-3">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">User Journey Inspector</span>
          <h3 className="font-mono text-sm font-bold text-slate-900 truncate mt-0.5" title={sessionId}>
            {sessionId}
          </h3>
        </div>
        <span className="badge badge-indigo">{events.length} Events</span>
      </div>

      <div className="timeline-container">
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-sm animate-pulse">
            Fetching chronological events...
          </div>
        ) : events.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            No events found for this session ID.
          </div>
        ) : (
          <div className="timeline-list">
            {events.map((evt, idx) => {
              const isClick = evt.eventType === 'click';
              const isLast = idx === events.length - 1;

              return (
                <div key={evt.id || idx} className="timeline-item">
                  {/* Step node */}
                  <div className={`timeline-node ${isClick ? 'node-click' : 'node-pv'}`}>
                    {isClick ? <MousePointerClick size={14} /> : <Eye size={14} />}
                  </div>

                  {!isLast && <div className="timeline-connector"></div>}

                  {/* Content card */}
                  <div className="timeline-content">
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs font-bold uppercase tracking-wider ${isClick ? 'text-amber-600' : 'text-blue-600'}`}>
                        {isClick ? 'User Click' : 'Page View'}
                      </span>
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Clock size={11} /> {formatTime(evt.timestamp)}
                      </span>
                    </div>

                    <div className="text-xs text-slate-700 font-medium truncate mb-1.5" title={evt.pageUrl}>
                      {evt.pageUrl}
                    </div>

                    {isClick && evt.clickCoordinates && (
                      <div className="click-details">
                        <span className="coord-badge">
                          Coords: X: {evt.clickCoordinates.x}, Y: {evt.clickCoordinates.y}
                        </span>
                        {evt.targetText && (
                          <span className="element-badge" title={evt.targetText}>
                            "{evt.targetText.length > 25 ? evt.targetText.substring(0, 22) + '...' : evt.targetText}"
                          </span>
                        )}
                        {evt.targetTag && (
                          <span className="tag-badge">&lt;{evt.targetTag}&gt;</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
