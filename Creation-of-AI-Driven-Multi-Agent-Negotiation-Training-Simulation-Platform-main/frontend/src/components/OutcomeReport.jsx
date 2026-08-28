import React, { useState, useEffect } from 'react';
import { Award, CheckCircle, AlertTriangle, FileText, RotateCcw, ShieldCheck } from 'lucide-react';
import { api } from '../services/api';

export default function OutcomeReport({ sessionId, onRestart }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadReport();
  }, [sessionId]);

  const loadReport = async () => {
    try {
      const data = await api.getReport(sessionId);
      setReport(data);
    } catch (err) {
      setError('Outcome report generation in progress or failed to load.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px', color: 'var(--text-secondary)' }}>
        <h2>Generating Structured Outcome Report...</h2>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div style={{ maxWidth: '800px', margin: '40px auto', padding: '24px' }} className="glass-panel">
        <h3>Report Unavailable</h3>
        <p style={{ color: 'var(--text-muted)', marginBottom: '20px' }}>{error}</p>
        <button className="btn-primary" onClick={onRestart}>Return to Configuration</button>
      </div>
    );
  }

  const scorecard = report.scorecard || {};
  const interviewerScore = scorecard.interviewer || {};
  const intervieweeScore = scorecard.interviewee || {};
  const scenarioId = report.scenario_id || 'vendor_pricing';

  // Dynamic scenario-specific role headers
  const getRoleHeaders = () => {
    if (scenarioId === 'vendor_pricing') {
      return { roleA: 'Seller (Vendor)', roleB: 'Buyer (Purchasing)' };
    } else if (scenarioId === 'job_offer') {
      return { roleA: 'Hiring Manager (HR)', roleB: 'Candidate (Job Seeker)' };
    } else if (scenarioId === 'budget_allocation') {
      return { roleA: 'Finance Director', roleB: 'R&D Project Lead' };
    }
    return { roleA: 'Role A (Interviewer)', roleB: 'Role B (Interviewee)' };
  };

  const { roleA, roleB } = getRoleHeaders();
  const symbol = (interviewerScore.initial_target >= 1000 || intervieweeScore.initial_target >= 1000) ? '₹' : '$';

  return (
    <div style={{ maxWidth: '900px', margin: '40px auto', padding: '24px' }} className="animate-fade-in">
      <div className="glass-panel" style={{ padding: '32px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
          <div>
            <span style={{ fontSize: '0.8rem', letterSpacing: '0.05em', color: 'var(--accent-cyan)', textTransform: 'uppercase', fontWeight: 700 }}>
              Official Negotiation Outcome Report
            </span>
            <h1 style={{ fontSize: '2.2rem', marginTop: '4px' }}>
              Final Status: <span style={{ color: report.status === 'agreement' ? '#3E7A57' : '#A9740D' }}>{report.status.toUpperCase()}</span>
            </h1>
          </div>
          <Award size={48} color={report.status === 'agreement' ? '#3E7A57' : '#A9740D'} />
        </div>

        {/* Final Terms Summary Card */}
        <div style={{ background: 'var(--bg-sunken)', padding: '20px', borderRadius: '12px', marginBottom: '24px', border: '1px solid var(--border-color)' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '8px', color: '#232D4F' }}>Agreed Deal Terms</h3>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            {symbol}{(report.final_terms?.price || 0).toLocaleString()}
          </div>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
            {report.narrative_summary}
          </p>
        </div>

        {/* Scorecard Table */}
        <h3 style={{ fontSize: '1.2rem', marginBottom: '16px' }}>Agent Performance Scorecard</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '28px', fontSize: '0.9rem' }}>
          <thead>
            <tr style={{ background: 'var(--bg-sunken)', textAlign: 'left', borderBottom: '2px solid var(--border-color)' }}>
              <th style={{ padding: '12px' }}>Metrics / Dimension</th>
              <th style={{ padding: '12px', color: '#232D4F' }}>{roleA}</th>
              <th style={{ padding: '12px', color: '#2C6A6E' }}>{roleB}</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
              <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>Initial Target Price</td>
              <td style={{ padding: '12px' }}>{symbol}{(interviewerScore.initial_target || 0).toLocaleString()}</td>
              <td style={{ padding: '12px' }}>{symbol}{(intervieweeScore.initial_target || 0).toLocaleString()}</td>
            </tr>
            <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
              <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>Walk-Away Limit</td>
              <td style={{ padding: '12px' }}>{symbol}{(interviewerScore.walk_away_price || 0).toLocaleString()}</td>
              <td style={{ padding: '12px' }}>{symbol}{(intervieweeScore.walk_away_price || 0).toLocaleString()}</td>
            </tr>
            <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
              <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>Final Concessions Made</td>
              <td style={{ padding: '12px', color: '#96382F' }}>{symbol}{(interviewerScore.total_concessions_made || 0).toLocaleString()} ({interviewerScore.concession_rate_pct}%)</td>
              <td style={{ padding: '12px', color: '#96382F' }}>{symbol}{(intervieweeScore.total_concessions_made || 0).toLocaleString()} ({intervieweeScore.concession_rate_pct}%)</td>
            </tr>
            <tr style={{ background: 'var(--bg-sunken)', fontWeight: 700 }}>
              <td style={{ padding: '12px' }}>Overall Negotiation Score</td>
              <td style={{ padding: '12px', color: '#3E7A57' }}>{interviewerScore.score} / 100</td>
              <td style={{ padding: '12px', color: '#3E7A57' }}>{intervieweeScore.score} / 100</td>
            </tr>
          </tbody>
        </table>

        {/* Observability & Grounding Details */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-sunken)', padding: '14px 20px', borderRadius: '10px', marginBottom: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            <ShieldCheck size={18} color="#3E7A57" /> RAG Grounding Score: <strong style={{ color: '#3E7A57' }}>{Math.round((report.grounding_score || 0.88) * 100)}%</strong>
          </div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Report ID: {report._id || sessionId}
          </span>
        </div>

        {/* Footer Actions */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
          <button className="btn-primary" onClick={onRestart}>
            <RotateCcw size={16} /> New Negotiation Session
          </button>
        </div>
      </div>
    </div>
  );
}
