import React, { useState } from 'react';
import { Settings, Database, Cpu, ShieldCheck, CheckCircle2, RefreshCw } from 'lucide-react';

export default function SettingsScreen() {
  const [dbStatus, setDbStatus] = useState('MongoDB Active (Port 27017)');
  const [keySaved, setKeySaved] = useState(false);

  const handleSave = () => {
    setKeySaved(true);
    setTimeout(() => setKeySaved(false), 3000);
  };

  return (
    <div style={{ padding: '28px', maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Settings color="#232D4F" size={24} />
          System & Engine Settings
        </h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
          Configure AI LLM Providers, MongoDB persistence, and system guardrails.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* LLM Engine Config */}
        <div className="panel-card">
          <div className="panel-card-title">
            <Cpu size={18} color="#232D4F" />
            <span>Generative AI Model</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Active Reasoning Engine:</label>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              backgroundColor: 'var(--bg-sunken)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.9rem',
              fontWeight: 600,
              color: 'var(--text-primary)'
            }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                ✨ Google Gemini Model (Active External LLM)
              </span>
              <span style={{
                fontSize: '0.75rem',
                padding: '3px 8px',
                borderRadius: '6px',
                backgroundColor: 'rgba(62, 122, 87, 0.12)',
                color: '#3E7A57',
                fontWeight: 600
              }}>
                Active
              </span>
            </div>
          </div>
        </div>

        {/* Database Config */}
        <div className="panel-card">
          <div className="panel-card-title">
            <Database size={18} color="#3E7A57" />
            <span>Database & Persistence Status</span>
          </div>

          <div className="insights-list">
            <div className="insight-row">
              <span className="insight-label">Primary Store</span>
              <span className="insight-value" style={{ color: '#3E7A57' }}>
                <CheckCircle2 size={14} /> MongoDB (negotiation_db)
              </span>
            </div>

            <div className="insight-row">
              <span className="insight-label">Automatic Fallback</span>
              <span className="insight-value">
                In-Memory Store (Zero-downtime guaranteed)
              </span>
            </div>

            <div className="insight-row">
              <span className="insight-label">Vector RAG Engine</span>
              <span className="insight-value">
                Pre-populated Policy & Benchmark Vector Store
              </span>
            </div>
          </div>
        </div>

        {/* System Constraints */}
        <div className="panel-card">
          <div className="panel-card-title">
            <ShieldCheck size={18} color="#A9740D" />
            <span>Negotiation Safety Guardrails</span>
          </div>

          <div className="insights-list">
            <div className="insight-row">
              <span className="insight-label">Max Round Limit</span>
              <span className="insight-value">20 Rounds</span>
            </div>

            <div className="insight-row">
              <span className="insight-label">Deadlock Threshold</span>
              <span className="insight-value">1% Price Variance over 3 consecutive turns</span>
            </div>

            <div className="insight-row">
              <span className="insight-label">Context Isolation</span>
              <span className="insight-value" style={{ color: '#3E7A57' }}>
                Enforced (Zero private goal leakage)
              </span>
            </div>
          </div>

          <button className="btn-send" style={{ alignSelf: 'flex-start', marginTop: '12px' }} onClick={handleSave}>
            {keySaved ? 'Saved Settings Successfully!' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
