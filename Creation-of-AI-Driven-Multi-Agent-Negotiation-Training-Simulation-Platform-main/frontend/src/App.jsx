import React, { useState, useEffect } from 'react';
import ConfigurationScreen from './components/ConfigurationScreen';
import NegotiationArena from './components/NegotiationArena';
import RightSidebar from './components/RightSidebar';
import OutcomeReport from './components/OutcomeReport';
import HistoryScreen from './components/HistoryScreen';
import SettingsScreen from './components/SettingsScreen';
import MetricsDashboard from './components/MetricsDashboard';
import AgentMemoryViewer from './components/AgentMemoryViewer';
import { api } from './services/api';
import { 
  Home, 
  Layers, 
  Clock, 
  FileText, 
  Settings, 
  Pause, 
  Play, 
  Square, 
  Sparkles,
  Bot
} from 'lucide-react';

export default function App() {
  // Always land on Home page by default
  const [activeNav, setActiveNav] = useState('home'); // 'home', 'simulation', 'practice', 'history', 'reports', 'settings'

  // Source of truth: each mode ('simulation' / 'practice') tracks its OWN active
  // session/turns/metrics independently, so starting or viewing one mode never
  // overwrites or masks the other mode's currently running negotiation.
  const [sessions, setSessions] = useState({ simulation: null, practice: null });
  const [turnsByMode, setTurnsByMode] = useState({ simulation: [], practice: [] });
  const [metricsByMode, setMetricsByMode] = useState({ simulation: null, practice: null });
  // Remembers which mode's session should still be shown once the user leaves the
  // arena view (Reports / Metrics / Memory / header), since activeNav alone no
  // longer identifies a mode once we're on those screens.
  const [lastActiveMode, setLastActiveMode] = useState(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [loadingStep, setLoadingStep] = useState(false);

  const modeKey = (m) => (m === 'practice' ? 'practice' : 'simulation');

  // Derived, not stored: whichever mode's negotiation is currently the "active" one.
  const activeMode = (activeNav === 'simulation' || activeNav === 'practice') ? activeNav : null;
  const focusMode = activeMode || lastActiveMode;
  const currentSession = focusMode ? sessions[focusMode] : null;
  const turns = activeMode ? turnsByMode[activeMode] : [];
  const sessionMetrics = activeMode ? metricsByMode[activeMode] : null;

  // AI Auto-Step Simulation Loop
  useEffect(() => {
    let stepInterval = null;
    if (
      isPlaying && 
      (activeNav === 'simulation' || activeNav === 'practice') && 
      currentSession && 
      currentSession.status !== 'agreement' && 
      currentSession.status !== 'impasse' && 
      currentSession.status !== 'timeout'
    ) {
      stepInterval = setInterval(() => {
        handleStepTurn();
      }, 3000);
    }
    return () => clearInterval(stepInterval);
  }, [isPlaying, activeNav, currentSession, loadingStep]);

  const refreshSessionData = async (sid, modeHint) => {
    try {
      const updatedSession = await api.getSession(sid);
      const mode = modeKey(updatedSession.mode || modeHint);
      setSessions(prev => ({ ...prev, [mode]: updatedSession }));

      const turnData = await api.getTurns(sid);
      setTurnsByMode(prev => ({ ...prev, [mode]: turnData }));

      const metricsData = await api.getMetrics(sid);
      setMetricsByMode(prev => ({ ...prev, [mode]: metricsData }));

      // Automatically open report page when negotiation reaches terminal state
      if (
        updatedSession.status === 'agreement' || 
        updatedSession.status === 'impasse' || 
        updatedSession.status === 'timeout'
      ) {
        setIsPlaying(false);
        setLastActiveMode(mode);
        setActiveNav('reports');
      }
    } catch (err) {
      console.error('Error refreshing session data:', err);
    }
  };

  const handleStepTurn = async () => {
    if (!currentSession || loadingStep) return;
    const sid = currentSession.id || currentSession._id;
    const mode = modeKey(currentSession.mode);
    if (currentSession.status === 'agreement' || currentSession.status === 'impasse' || currentSession.status === 'timeout') {
      setIsPlaying(false);
      setLastActiveMode(mode);
      setActiveNav('reports');
      return;
    }

    setLoadingStep(true);
    try {
      const res = await api.submitTurn(sid);
      if (res.turn) {
        setTurnsByMode(prev => ({ ...prev, [mode]: [...(prev[mode] || []), res.turn] }));
        await refreshSessionData(sid, mode);
      }
      if (res.is_terminal) {
        setIsPlaying(false);
        setLastActiveMode(mode);
        setActiveNav('reports');
      }
    } catch (err) {
      console.error('Error stepping turn:', err);
      setIsPlaying(false);
    } finally {
      setLoadingStep(false);
    }
  };

  const handleHumanTurnSubmit = async (userMessage, userPrice) => {
    if (!currentSession || loadingStep) return;
    const sid = currentSession.id || currentSession._id;
    const mode = modeKey(currentSession.mode);
    setLoadingStep(true);

    const targetVal = currentSession.user_role === 'interviewer' 
      ? currentSession.interviewer_persona?.target_price 
      : currentSession.interviewee_persona?.target_price;
    const priceVal = userPrice ? parseFloat(userPrice) : (targetVal || 5000);

    const turnPayload = {
      message: userMessage,
      offer: {
        price: priceVal,
        quantity: 1,
        warranty_months: 12,
        payment_terms: "Net 30"
      }
    };

    try {
      // 1. Submit Human Turn
      const res1 = await api.submitTurn(sid, turnPayload);
      if (res1.turn) {
        setTurnsByMode(prev => ({ ...prev, [mode]: [...(prev[mode] || []), res1.turn] }));
        await refreshSessionData(sid, mode);
      }

      if (res1.is_terminal) {
        setIsPlaying(false);
        setLastActiveMode(mode);
        setActiveNav('reports');
        setLoadingStep(false);
        return;
      }

      // 2. Trigger AI Counterpart Turn after short delay
      setTimeout(async () => {
        try {
          const res2 = await api.submitTurn(sid);
          if (res2.turn) {
            setTurnsByMode(prev => ({ ...prev, [mode]: [...(prev[mode] || []), res2.turn] }));
            await refreshSessionData(sid, mode);
          }
          if (res2.is_terminal) {
            setIsPlaying(false);
            setLastActiveMode(mode);
            setActiveNav('reports');
          }
        } catch (e) {
          console.error('Error executing AI counterpart turn:', e);
        } finally {
          setLoadingStep(false);
        }
      }, 1000);
    } catch (err) {
      console.error('Error submitting human turn:', err);
      setLoadingStep(false);
    }
  };

  const handleSessionCreated = async (session) => {
    const mode = modeKey(session.mode);
    setSessions(prev => ({ ...prev, [mode]: session }));
    setTurnsByMode(prev => ({ ...prev, [mode]: [] }));
    setLastActiveMode(mode);
    setIsPlaying(mode === 'simulation');
    setActiveNav(mode);
    await refreshSessionData(session.id || session._id, mode);
  };

  const handleSelectSessionFromHistory = async (session) => {
    const mode = modeKey(session.mode);
    setSessions(prev => ({ ...prev, [mode]: session }));
    setIsPlaying(false);
    setLastActiveMode(mode);
    await refreshSessionData(session.id || session._id, mode);
    if (session.status === 'agreement' || session.status === 'impasse' || session.status === 'timeout') {
      setActiveNav('reports');
    } else {
      setActiveNav(mode);
    }
  };

  const scenarioTitle = currentSession?.scenario_id === 'vendor_pricing' ? 'Vendor Pricing Negotiation'
    : currentSession?.scenario_id === 'job_offer' ? 'Job Offer Negotiation'
    : currentSession?.scenario_id === 'budget_allocation' ? 'Project Budget Allocation'
    : 'Select Scenario on Home Page';

  const statusText = currentSession?.status === 'agreement' ? '● Deal Reached / Agreement'
    : currentSession?.status === 'impasse' ? '● Impasse / Deadlock'
    : currentSession?.status === 'timeout' ? '● Max Rounds Reached'
    : currentSession ? '● Negotiation In Progress' : '● Ready';

  const statusColor = currentSession?.status === 'agreement' ? '#3E7A57'
    : currentSession?.status === 'impasse' ? '#96382F'
    : '#232D4F';

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-icon-box">
            <Sparkles color="white" size={20} />
          </div>
          <div className="logo-title">
            Multi-Agent<br />Negotiation Simulator
          </div>
        </div>

        <nav className="nav-menu">
          <div 
            className={`nav-item ${activeNav === 'home' ? 'active' : ''}`}
            onClick={() => setActiveNav('home')}
          >
            <Home size={18} />
            <span>Home</span>
          </div>

          <div 
            className={`nav-item ${activeNav === 'simulation' ? 'active' : ''}`}
            onClick={() => {
              if (sessions.simulation) {
                setLastActiveMode('simulation');
                setActiveNav('simulation');
              } else {
                setActiveNav('home');
              }
            }}
          >
            <Layers size={18} />
            <span>Simulation Mode</span>
          </div>

          <div 
            className={`nav-item ${activeNav === 'practice' ? 'active' : ''}`}
            onClick={() => {
              if (sessions.practice) {
                setLastActiveMode('practice');
                setActiveNav('practice');
              } else {
                setActiveNav('home');
              }
            }}
          >
            <Bot size={18} />
            <span>Practice Mode</span>
          </div>

          <div 
            className={`nav-item ${activeNav === 'history' ? 'active' : ''}`}
            onClick={() => setActiveNav('history')}
          >
            <Clock size={18} />
            <span>History</span>
          </div>

          <div 
            className={`nav-item ${activeNav === 'reports' ? 'active' : ''}`}
            onClick={() => setActiveNav('reports')}
          >
            <FileText size={18} />
            <span>Reports</span>
          </div>

          <div 
            className={`nav-item ${activeNav === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveNav('settings')}
          >
            <Settings size={18} />
            <span>Settings</span>
          </div>
        </nav>
      </aside>

      {/* Main Workspace View */}
      <main className="main-content">
        {/* Header Bar */}
        <header className="top-bar">
          <div className="scenario-info">
            <div className="scenario-title-box">
              <span className="scenario-subtitle">Active Scenario</span>
              <h2>{scenarioTitle}</h2>
            </div>
            <div className="status-badge" style={{ color: statusColor, borderColor: `${statusColor}44`, background: `${statusColor}15` }}>
              <span>{statusText}</span>
            </div>
          </div>

          {currentSession && (activeNav === 'simulation' || activeNav === 'practice') && (
            <div className="top-controls">
              <div className="info-pill">
                Turn <strong style={{ color: 'var(--text-primary)', marginLeft: '4px', fontFamily: 'var(--font-mono)' }}>{turns.length} / {currentSession?.max_rounds || 10}</strong>
              </div>

              {currentSession.mode === 'simulation' && (
                <button 
                  className="btn-control"
                  onClick={() => setIsPlaying(!isPlaying)}
                >
                  {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                  {isPlaying ? 'Pause' : 'Auto Play'}
                </button>
              )}

              <button 
                className="btn-control btn-end"
                onClick={() => {
                  setIsPlaying(false);
                  setLastActiveMode(activeMode);
                  setActiveNav('reports');
                }}
              >
                <Square size={12} fill="currentColor" /> End Simulation
              </button>
            </div>
          )}
        </header>

        {/* View Navigation Router */}
        {activeNav === 'home' && (
          <ConfigurationScreen onSessionCreated={handleSessionCreated} />
        )}

        {(activeNav === 'simulation' || activeNav === 'practice') && currentSession && (
          <div className="dashboard-grid">
            <NegotiationArena 
              session={currentSession}
              turns={turns}
              isPlaying={isPlaying}
              onTogglePlay={() => setIsPlaying(!isPlaying)}
              onStepTurn={handleStepTurn}
              onHumanSubmit={handleHumanTurnSubmit}
              loadingStep={loadingStep}
              onFinishSession={() => {
                setIsPlaying(false);
                setLastActiveMode(activeMode);
                setActiveNav('reports');
              }}
              onViewMemory={() => { setLastActiveMode(activeMode); setActiveNav('memory'); }}
              onViewMetrics={() => { setLastActiveMode(activeMode); setActiveNav('metrics'); }}
            />
            <RightSidebar 
              session={currentSession}
              turns={turns}
              metrics={sessionMetrics}
              onViewMemory={() => { setLastActiveMode(activeMode); setActiveNav('memory'); }}
              onViewMetrics={() => { setLastActiveMode(activeMode); setActiveNav('metrics'); }}
            />
          </div>
        )}

        {activeNav === 'history' && (
          <HistoryScreen 
            onSelectSession={handleSelectSessionFromHistory}
            onOpenReport={() => setActiveNav('reports')}
          />
        )}

        {activeNav === 'reports' && currentSession && (
          <OutcomeReport 
            sessionId={currentSession.id || currentSession._id}
            onRestart={() => setActiveNav('home')}
          />
        )}

        {activeNav === 'reports' && !currentSession && (
          <div style={{ maxWidth: '800px', margin: '60px auto', textAlign: 'center', padding: '40px' }} className="glass-panel">
            <FileText size={48} color="#232D4F" style={{ marginBottom: '16px' }} />
            <h2>No Session Selected</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
              Please select a scenario from the Home page or choose a session from History to view outcome reports.
            </p>
            <button className="btn-primary" onClick={() => setActiveNav('home')}>Go to Home</button>
          </div>
        )}

        {activeNav === 'metrics' && currentSession && (
          <MetricsDashboard 
            sessionId={currentSession.id || currentSession._id}
            onBack={() => setActiveNav(lastActiveMode || 'simulation')}
          />
        )}

        {activeNav === 'memory' && currentSession && (
          <AgentMemoryViewer 
            sessionId={currentSession.id || currentSession._id}
            onBack={() => setActiveNav(lastActiveMode || 'simulation')}
          />
        )}

        {activeNav === 'settings' && (
          <SettingsScreen />
        )}
      </main>
    </div>
  );
}
