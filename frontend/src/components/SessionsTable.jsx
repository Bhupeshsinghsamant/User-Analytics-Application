import React, { useState } from 'react';
import { Search, ChevronRight, Clock, Globe } from 'lucide-react';

export default function SessionsTable({
  sessions = [],
  selectedSessionId,
  onSelectSession,
  loading = false
}) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredSessions = sessions.filter(s =>
    (s.sessionId || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.firstPageUrl || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  function formatDate(isoStr) {
    if (!isoStr) return 'N/A';
    try {
      const d = new Date(isoStr);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) +
        ' · ' + d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
      return isoStr;
    }
  }

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Recorded Sessions</h2>
          <p className="text-xs text-slate-500">Distinct browser sessions stored in MongoDB Atlas</p>
        </div>
        <div className="search-box">
          <Search size={14} className="text-slate-400" />
          <input
            type="text"
            placeholder="Search session ID or URL..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      <div className="table-container">
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-sm animate-pulse">
            Loading active sessions from database...
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            {searchTerm ? 'No sessions matching search query.' : 'No sessions recorded yet. Open the Demo Site to generate real user activity!'}
          </div>
        ) : (
          <table className="sessions-table">
            <thead>
              <tr>
                <th>Session ID</th>
                <th>Events</th>
                <th>Clicks</th>
                <th>Landing Page</th>
                <th>Last Active</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredSessions.map((s) => {
                const isSelected = s.sessionId === selectedSessionId;
                return (
                  <tr
                    key={s.sessionId}
                    className={`session-row ${isSelected ? 'selected' : ''}`}
                    onClick={() => onSelectSession(s.sessionId)}
                  >
                    <td>
                      <span className="font-mono text-xs font-semibold text-slate-800" title={s.sessionId}>
                        {s.sessionId.length > 18 ? `${s.sessionId.substring(0, 16)}...` : s.sessionId}
                      </span>
                    </td>
                    <td>
                      <span className="badge badge-indigo">
                        {s.eventCount || 0}
                      </span>
                    </td>
                    <td>
                      <span className="badge badge-amber">
                        {s.clickCount || 0}
                      </span>
                    </td>
                    <td className="truncate-cell" title={s.firstPageUrl || ''}>
                      <span className="flex items-center gap-1 text-xs text-slate-600">
                        <Globe size={12} className="text-slate-400 shrink-0" />
                        <span className="truncate">{s.firstPageUrl ? new URL(s.firstPageUrl).pathname : '/'}</span>
                      </span>
                    </td>
                    <td>
                      <span className="flex items-center gap-1 text-xs text-slate-500">
                        <Clock size={12} className="text-slate-400 shrink-0" />
                        {formatDate(s.lastActive)}
                      </span>
                    </td>
                    <td>
                      <button
                        className={`btn-action ${isSelected ? 'active' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectSession(s.sessionId);
                        }}
                      >
                        Inspect <ChevronRight size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
