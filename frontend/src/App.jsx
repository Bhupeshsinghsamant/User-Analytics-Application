import React, { useState, useEffect, useCallback } from 'react';
import { api } from './services/api';
import MetricCards from './components/MetricCards';
import SessionsTable from './components/SessionsTable';
import SessionTimeline from './components/SessionTimeline';
import ClickHeatmap from './components/ClickHeatmap';
import {
  Activity,
  Flame,
  LayoutDashboard,
  RotateCcw,
  ExternalLink,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('sessions'); // 'sessions' or 'heatmap'
  const [stats, setStats] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [sessionEvents, setSessionEvents] = useState([]);
  const [pages, setPages] = useState([]);
  const [selectedPage, setSelectedPage] = useState('');
  const [clickEvents, setClickEvents] = useState([]);
  const [healthStatus, setHealthStatus] = useState({ status: 'checking', message: '' });
  const [autoRefresh, setAutoRefresh] = useState(true);

  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [loadingTimeline, setLoadingTimeline] = useState(false);
  const [loadingClicks, setLoadingClicks] = useState(false);

  // Check backend & DB health
  const checkHealth = useCallback(async () => {
    try {
      const res = await api.getHealth();
      setHealthStatus({
        status: res.database === 'connected' ? 'connected' : 'degraded',
        message: res.message || 'Operational'
      });
    } catch (err) {
      setHealthStatus({
        status: 'disconnected',
        message: err.message || 'Cannot reach Flask backend'
      });
    }
  }, []);

  // Fetch overview metrics & sessions list
  const loadDashboardData = useCallback(async () => {
    setLoadingStats(true);
    setLoadingSessions(true);

    try {
      const [statsRes, sessionsRes] = await Promise.all([
        api.getOverviewStats().catch(() => ({})),
        api.getSessions(100, 0).catch(() => ({ sessions: [] }))
      ]);

      setStats(statsRes);
      if (statsRes.uniquePages) {
        setPages(statsRes.uniquePages);
      }

      const sessionList = sessionsRes.sessions || [];
      setSessions(sessionList);

      // Auto-select first session if none selected
      if (!selectedSessionId && sessionList.length > 0) {
        setSelectedSessionId(sessionList[0].sessionId);
      }
    } catch (e) {
      console.error('Error loading dashboard data:', e);
    } finally {
      setLoadingStats(false);
      setLoadingSessions(false);
    }
  }, [selectedSessionId]);

  // Fetch events for selected session
  const loadSessionEvents = useCallback(async (sessId) => {
    if (!sessId) return;
    setLoadingTimeline(true);
    try {
      const res = await api.getSessionEvents(sessId);
      setSessionEvents(res.events || []);
    } catch (err) {
      console.error('Failed to load session timeline:', err);
      setSessionEvents([]);
    } finally {
      setLoadingTimeline(false);
    }
  }, []);

  // Fetch click events for heatmap
  const loadClickEvents = useCallback(async (pageUrl) => {
    setLoadingClicks(true);
    try {
      const res = await api.getClickEvents(pageUrl);
      setClickEvents(res.clicks || []);
    } catch (err) {
      console.error('Failed to load clicks for heatmap:', err);
    } finally {
      setLoadingClicks(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    checkHealth();
    loadDashboardData();
  }, [checkHealth, loadDashboardData]);

  // Load timeline when session selection changes
  useEffect(() => {
    if (selectedSessionId) {
      loadSessionEvents(selectedSessionId);
    }
  }, [selectedSessionId, loadSessionEvents]);

  // Load clicks when page selection or tab changes
  useEffect(() => {
    if (activeTab === 'heatmap') {
      loadClickEvents(selectedPage);
    }
  }, [activeTab, selectedPage, loadClickEvents]);

  // Auto-refresh interval (10s)
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      loadDashboardData();
      if (selectedSessionId) loadSessionEvents(selectedSessionId);
      if (activeTab === 'heatmap') loadClickEvents(selectedPage);
    }, 10000);
    return () => clearInterval(interval);
  }, [autoRefresh, loadDashboardData, selectedSessionId, loadSessionEvents, activeTab, selectedPage, loadClickEvents]);

  return (
    <div className="app-container">
      {/* Top Navbar */}
      <header className="navbar">
        <div className="flex items-center gap-3">
          <div className="logo-badge">
            <Activity size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold text-slate-900 tracking-tight">
              CausalFunnel Analytics
            </h1>
            <p className="text-[11px] text-slate-500 font-medium">
              Full Stack User Analytics Platform · MongoDB Atlas Live
            </p>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          {/* Health Pill */}
          <div className={`health-pill ${healthStatus.status}`}>
            {healthStatus.status === 'connected' ? (
              <>
                <span className="pulse-dot"></span>
                <span>Atlas Connected</span>
              </>
            ) : (
              <>
                <AlertCircle size={12} />
                <span>Backend Check: {healthStatus.status}</span>
              </>
            )}
          </div>

          {/* Auto Refresh Toggle */}
          <button
            className={`btn-auto-refresh ${autoRefresh ? 'active' : ''}`}
            onClick={() => setAutoRefresh(!autoRefresh)}
            title="Toggle live 10s auto-refresh"
          >
            <RotateCcw size={13} className={autoRefresh ? 'animate-spin' : ''} />
            <span className="text-xs">{autoRefresh ? 'Live (10s)' : 'Paused'}</span>
          </button>

          {/* Manual Refresh */}
          <button
            className="btn btn-secondary text-xs flex items-center gap-1.5"
            onClick={() => {
              loadDashboardData();
              if (selectedSessionId) loadSessionEvents(selectedSessionId);
              if (activeTab === 'heatmap') loadClickEvents(selectedPage);
            }}
          >
            <RotateCcw size={13} /> Refresh
          </button>

          {/* Launch Demo Site */}
          <a
            href="http://127.0.0.1:5000/demo-site/index.html"
            target="_blank"
            rel="noreferrer"
            className="btn btn-primary text-xs flex items-center gap-1.5"
            title="Open interactive Home page to test real clicks"
          >
            <span>Demo Home</span>
            <ExternalLink size={13} />
          </a>

          <a
            href="http://127.0.0.1:5000/demo-site/pricing.html"
            target="_blank"
            rel="noreferrer"
            className="btn btn-secondary text-xs flex items-center gap-1.5"
            title="Open interactive Pricing page to test conversions"
          >
            <span>Demo Pricing</span>
            <ExternalLink size={13} />
          </a>
        </div>
      </header>

      {/* Main Body */}
      <main className="main-content">
        {/* Overview Metric Cards */}
        <MetricCards stats={stats} loading={loadingStats} />

        {/* Navigation Tabs */}
        <div className="tab-bar mb-6">
          <button
            className={`tab-btn ${activeTab === 'sessions' ? 'active' : ''}`}
            onClick={() => setActiveTab('sessions')}
          >
            <LayoutDashboard size={16} />
            <span>Sessions & User Journeys</span>
            <span className="tab-count">{sessions.length}</span>
          </button>
          <button
            className={`tab-btn ${activeTab === 'heatmap' ? 'active' : ''}`}
            onClick={() => setActiveTab('heatmap')}
          >
            <Flame size={16} />
            <span>Real Click Heatmap</span>
            <span className="tab-count">{stats?.totalClicks || clickEvents.length}</span>
          </button>
        </div>

        {/* Tab 1: Sessions & User Journey Inspector */}
        {activeTab === 'sessions' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7">
              <SessionsTable
                sessions={sessions}
                selectedSessionId={selectedSessionId}
                onSelectSession={(id) => setSelectedSessionId(id)}
                loading={loadingSessions}
              />
            </div>
            <div className="lg:col-span-5">
              <SessionTimeline
                sessionId={selectedSessionId}
                events={sessionEvents}
                loading={loadingTimeline}
              />
            </div>
          </div>
        )}

        {/* Tab 2: Click Heatmap Visualizer */}
        {activeTab === 'heatmap' && (
          <div className="w-full">
            <ClickHeatmap
              pages={pages}
              clicks={clickEvents}
              selectedPage={selectedPage}
              onSelectPage={(p) => setSelectedPage(p)}
              loading={loadingClicks}
              onRefresh={() => loadClickEvents(selectedPage)}
            />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="footer">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-1">
            <ShieldCheck size={14} className="text-emerald-500" />
            CausalFunnel Full Stack Engineer Intern Assignment · Built with Flask, React, MongoDB Atlas
          </span>
          <span>Zero Fake Data · 100% Real Ingested Events</span>
        </div>
      </footer>
    </div>
  );
}
