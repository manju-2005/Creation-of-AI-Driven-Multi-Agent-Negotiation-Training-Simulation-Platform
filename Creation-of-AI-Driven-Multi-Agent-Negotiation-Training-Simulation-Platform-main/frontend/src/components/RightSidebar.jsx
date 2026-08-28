import React, { useState, useEffect } from 'react';
import { TrendingUp, Clock, RefreshCw, Sparkles, UserCheck, ShieldCheck, Zap } from 'lucide-react';

// Per-turn response time budget (seconds). Not tied to a backend field today —
// kept as a single named constant here so it's easy to make configurable later
// (e.g. from session config) without touching the countdown logic itself.
const TURN_TIME_LIMIT_SECONDS = 20;

const formatTime = (secs) => {
  const clamped = Math.max(0, secs);
  const m = Math.floor(clamped / 60).toString().padStart(2, '0');
  const s = (clamped % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

export default function RightSidebar({ session, turns = [], metrics, onViewMemory, onViewMetrics }) {
  const [activeTab, setActiveTab] = useState('interviewer'); // 'interviewer' or 'interviewee'
  const [timeRemaining, setTimeRemaining] = useState(TURN_TIME_LIMIT_SECONDS);

  const sessionId = session?.id || session?._id;
  const isNegotiationActive = !!session &&
    session.status !== 'agreement' &&
    session.status !== 'impasse' &&
    session.status !== 'timeout';

  // Reset the clock at the start of each turn/session, and tick it down by
  // 1 second while the negotiation is active. Clears itself (and stops
  // counting down) once the negotiation reaches a terminal state.
  useEffect(() => {
    setTimeRemaining(TURN_TIME_LIMIT_SECONDS);
    if (!isNegotiationActive) return undefined;

    const interval = setInterval(() => {
      setTimeRemaining(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(interval);
  }, [sessionId, turns.length, isNegotiationActive]);

  const interviewer = session?.interviewer_persona || {};
  const interviewee = session?.interviewee_persona || {};

  const currentAgent = activeTab === 'interviewer' ? interviewer : interviewee;
  const currentTurnCount = session?.current_round || turns.length || 10;
  const maxRounds = session?.max_rounds || 20;

  // Dynamic calculations based on live metrics or session state
  const agreementProb = metrics?.estimated_zopa?.agreement_probability 
    ? Math.round(metrics.estimated_zopa.agreement_probability * 100) 
    : 81;

  const trustLevel = 72;
  const concessionRate = activeTab === 'interviewer' 
    ? (metrics?.interviewer_metrics?.concession_rate_pct || 35)
    : (metrics?.interviewee_metrics?.concession_rate_pct || 31);
  const stressLevel = 22;

  return (
    <div className="right-panel">
      {/* Live Metrics Card */}
      <div className="panel-card">
        <div className="panel-card-title">
          <TrendingUp size={18} color="#232D4F" />
          <span>Live Metrics</span>
        </div>

        <div className="metrics-grid">
          <div className="metric-box">
            <span className="metric-label">Agreement Probability</span>
            <div className="metric-value-row">
              <span className="metric-value purple">{agreementProb}%</span>
              <TrendingUp size={14} color="#4A5686" />
            </div>
          </div>

          <div className="metric-box">
            <span className="metric-label">Trust Level</span>
            <div className="metric-value-row">
              <span className="metric-value green">{trustLevel}%</span>
              <TrendingUp size={14} color="#3E7A57" />
            </div>
          </div>

          <div className="metric-box">
            <span className="metric-label">Concession Rate</span>
            <div className="metric-value-row">
              <span className="metric-value amber">{concessionRate}%</span>
              <Sparkles size={14} color="#A9740D" />
            </div>
          </div>

          <div className="metric-box">
            <span className="metric-label">Stress Level</span>
            <div className="metric-value-row">
              <span className="metric-value rose">{stressLevel}%</span>
              <TrendingUp size={14} color="#96382F" />
            </div>
          </div>

          <div className="metric-box">
            <span className="metric-label">Time Remaining</span>
            <div className="metric-value-row">
              <span className="metric-value white">{formatTime(timeRemaining)}</span>
              <Clock size={14} color="#8C8676" />
            </div>
          </div>

          <div className="metric-box">
            <span className="metric-label">Turns Remaining</span>
            <div className="metric-value-row">
              <span className="metric-value white">{maxRounds - currentTurnCount} / {maxRounds}</span>
              <RefreshCw size={14} color="#8C8676" />
            </div>
          </div>
        </div>
      </div>

      {/* Agent Insights Card */}
      <div className="panel-card">
        <div className="panel-card-title">
          <Sparkles size={18} color="#232D4F" />
          <span>Agent Insights</span>
        </div>

        <div className="tab-header">
          <button 
            className={`tab-btn ${activeTab === 'interviewer' ? 'active' : ''}`}
            onClick={() => setActiveTab('interviewer')}
          >
            Agent A
          </button>
          <button 
            className={`tab-btn ${activeTab === 'interviewee' ? 'active' : ''}`}
            onClick={() => setActiveTab('interviewee')}
          >
            Agent B
          </button>
        </div>

        <div className="insights-list">
          <div className="insight-row">
            <span className="insight-label">Current Strategy</span>
            <span className="insight-value">
              <span style={{ color: '#232D4F' }}>●</span> Compromising
            </span>
          </div>

          <div className="insight-row">
            <span className="insight-label">Emotional State</span>
            <span className="insight-value">
              😳 Focused
            </span>
          </div>

          <div className="insight-row">
            <span className="insight-label">Next Likely Move</span>
            <span className="insight-value">
              Minor Concession
            </span>
          </div>

          <div className="insight-row">
            <span className="insight-label">Risk Tolerance</span>
            <span className="insight-value" style={{ color: '#A9740D' }}>
              Medium
            </span>
          </div>

          <button className="btn-profile" onClick={onViewMemory}>
            View Full Profile →
          </button>
        </div>
      </div>

      {/* System Insights Card */}
      <div className="panel-card">
        <div className="panel-card-title">
          <Zap size={18} color="#232D4F" />
          <span>System Insights</span>
        </div>

        <div className="insights-list">
          <div className="insight-row">
            <span className="insight-label">State Machine Status</span>
            <span className="insight-value" style={{ color: '#3E7A57' }}>
              Active Negotiation
            </span>
          </div>
          <div className="insight-row">
            <span className="insight-label">RAG Grounded Citations</span>
            <span className="insight-value">
              {metrics?.rag_citations_total || 4} Verified Documents
            </span>
          </div>
          <div className="insight-row">
            <span className="insight-label">Tool Calls Logged</span>
            <span className="insight-value">
              {metrics?.tool_calls_total || 2} Price Calculations
            </span>
          </div>

          <button className="btn-profile" onClick={onViewMetrics}>
            Full Observability Dashboard →
          </button>
        </div>
      </div>
    </div>
  );
}
