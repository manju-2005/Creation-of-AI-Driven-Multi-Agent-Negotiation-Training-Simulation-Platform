import React, { useState, useEffect } from 'react';
import { Play, Users, Bot, Settings, ShieldCheck, Zap } from 'lucide-react';
import { api } from '../services/api';

const STRATEGIES_LIST = ["Anchoring", "Concession", "BATNA-driven", "Walk-away", "Hard Bargaining", "Good Cop", "Tit-for-Tat"];

export default function ConfigurationScreen({ onSessionCreated }) {
  const [scenarios, setScenarios] = useState([]);
  const [selectedScenarioId, setSelectedScenarioId] = useState('vendor_pricing');
  const [mode, setMode] = useState('simulation'); // simulation or practice
  const [userRole, setUserRole] = useState('interviewee');
  const [maxRounds, setMaxRounds] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Persona configurations
  const [interviewer, setInterviewer] = useState({
    role: 'interviewer',
    name: 'Agent A · Vendor',
    personality: 'Assertive',
    strategies: ['Anchoring', 'Hard Bargaining'],
    target_price: 8000,
    walk_away_price: 5500,
    private_goals: { goal_description: 'Maximize Profit' },
    private_constraints: ['Initial target ₹8,000 asking price, baseline minimum ₹5,500', 'Net 30 payment minimum']
  });

  const [interviewee, setInterviewee] = useState({
    role: 'interviewee',
    name: 'Agent B · Buyer',
    personality: 'Analytical',
    strategies: ['BATNA-driven', 'Concession'],
    target_price: 5000,
    walk_away_price: 8000,
    private_goals: { goal_description: 'Minimize Cost' },
    private_constraints: ['Target offer ₹5,000 per unit, walk-away budget limit ₹8,000']
  });

  useEffect(() => {
    loadScenarios();
  }, []);

  const loadScenarios = async () => {
    try {
      const data = await api.getScenarios();
      setScenarios(data);
      if (data.length > 0) {
        applyScenarioDefaults(data[0]);
      }
    } catch (err) {
      setError('Failed to fetch scenario templates from backend.');
    }
  };

  const applyScenarioDefaults = (sc) => {
    setSelectedScenarioId(sc.id);
    setInterviewer(sc.default_interviewer);
    setInterviewee(sc.default_interviewee);
  };

  const handleScenarioChange = (id) => {
    const sc = scenarios.find(s => s.id === id);
    if (sc) {
      applyScenarioDefaults(sc);
    }
  };

  const toggleStrategy = (agentType, strat) => {
    if (agentType === 'interviewer') {
      const current = interviewer.strategies;
      const updated = current.includes(strat) ? current.filter(s => s !== strat) : [...current, strat];
      setInterviewer({ ...interviewer, strategies: updated });
    } else {
      const current = interviewee.strategies;
      const updated = current.includes(strat) ? current.filter(s => s !== strat) : [...current, strat];
      setInterviewee({ ...interviewee, strategies: updated });
    }
  };

  const handleLaunch = async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = {
        mode,
        scenario_id: selectedScenarioId,
        user_role: mode === 'practice' ? userRole : null,
        interviewer_persona: interviewer,
        interviewee_persona: interviewee,
        max_rounds: parseInt(maxRounds)
      };

      const session = await api.createSession(payload);
      onSessionCreated(session);
    } catch (err) {
      setError(err.response?.data?.detail || 'Error creating negotiation session.');
    } finally {
      setLoading(false);
    }
  };

  const currentScenario = scenarios.find(s => s.id === selectedScenarioId);

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '40px 20px 24px' }} className="animate-fade-in">
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <span style={{ display: 'inline-block', fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-gold)', marginBottom: '10px' }}>
          Session Setup
        </span>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '2.35rem', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '10px', letterSpacing: '-0.01em' }}>
          Negotiation Setup &amp; Scenario Configuration
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', maxWidth: '560px', margin: '0 auto' }}>
          Configure autonomous agent personas, goals, and negotiation strategies before entering the Negotiation Arena.
        </p>
      </div>

      {error && (
        <div style={{ background: 'rgba(150, 56, 47, 0.10)', border: '1px solid rgba(150, 56, 47, 0.35)', color: '#96382F', padding: '12px 16px', borderRadius: '10px', marginBottom: '24px' }}>
          {error}
        </div>
      )}

      {/* Mode Selection Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '28px' }}>
        <div 
          onClick={() => setMode('simulation')}
          className="mode-card"
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div className="mode-card-icon-box">
                <Bot size={24} />
              </div>
              <h3 className="mode-card-title">Simulation Mode (AI vs AI)</h3>
            </div>
            {mode === 'simulation' && (
              <span className="mode-selected-tag">Active</span>
            )}
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: '1.5' }}>
            Observe two autonomous LLM agents negotiate against each other based on configured personalities and strategies.
          </p>
        </div>

        <div 
          onClick={() => setMode('practice')}
          className="mode-card"
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div className="mode-card-icon-box">
                <Users size={24} />
              </div>
              <h3 className="mode-card-title">Practice Mode (Human vs AI)</h3>
            </div>
            {mode === 'practice' && (
              <span className="mode-selected-tag">Active</span>
            )}
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: '1.5' }}>
            Participate directly as one of the negotiating parties to hone your skills against an intelligent AI counterpart.
          </p>
        </div>
      </div>

      {/* Scenario Selector & Round limit */}
      <div className="glass-panel" style={{ padding: '24px', marginBottom: '28px' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: 'var(--text-primary)' }}>
          <Settings size={20} color="#232D4F" /> Scenario Template Selection
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Choose Scenario Template</label>
            <select value={selectedScenarioId} onChange={(e) => handleScenarioChange(e.target.value)}>
              {scenarios.map(sc => (
                <option key={sc.id} value={sc.id}>{sc.title}</option>
              ))}
            </select>
            {currentScenario && (
              <p style={{ marginTop: '8px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                {currentScenario.description}
              </p>
            )}
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Maximum Rounds</label>
            <input type="number" min="3" max="20" value={maxRounds} onChange={(e) => setMaxRounds(e.target.value)} />
          </div>
        </div>

        {mode === 'practice' && (
          <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Your Role in Practice Mode</label>
            <select value={userRole} onChange={(e) => setUserRole(e.target.value)}>
              <option value="interviewer">Interviewer / Seller / Offer Lead</option>
              <option value="interviewee">Interviewee / Buyer / Manager</option>
            </select>
          </div>
        )}
      </div>

      {/* Personas Configuration Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
        {/* Interviewer Persona Card */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
            <h3 style={{ color: '#232D4F' }}>Role A: Interviewer / Seller</h3>
            <span style={{ fontSize: '0.75rem', padding: '4px 8px', borderRadius: '6px', background: 'rgba(35,45,79,0.10)', color: '#232D4F' }}>
              {mode === 'practice' && userRole === 'interviewer' ? 'HUMAN' : 'AI AGENT'}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Persona Name</label>
              <input value={interviewer.name} onChange={(e) => setInterviewer({ ...interviewer, name: e.target.value })} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Target Preferred Price ($)</label>
                <input type="number" value={interviewer.target_price} onChange={(e) => setInterviewer({ ...interviewer, target_price: parseFloat(e.target.value) || 0 })} />
              </div>
              <div>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Walk-Away Limit ($)</label>
                <input type="number" value={interviewer.walk_away_price} onChange={(e) => setInterviewer({ ...interviewer, walk_away_price: parseFloat(e.target.value) || 0 })} />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Personality Style</label>
              <select value={interviewer.personality} onChange={(e) => setInterviewer({ ...interviewer, personality: e.target.value })}>
                <option value="Aggressive">Aggressive (Firm stance, high opening)</option>
                <option value="Collaborative">Collaborative (Win-win orientation)</option>
                <option value="Analytical">Analytical (Data & benchmark driven)</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>Negotiation Strategies</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {STRATEGIES_LIST.map(strat => (
                  <button
                    key={strat}
                    type="button"
                    onClick={() => toggleStrategy('interviewer', strat)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      border: interviewer.strategies.includes(strat) ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)',
                      background: interviewer.strategies.includes(strat) ? 'rgba(35,45,79,0.12)' : 'var(--bg-sunken)',
                      color: interviewer.strategies.includes(strat) ? '#232D4F' : 'var(--text-muted)',
                      cursor: 'pointer'
                    }}
                  >
                    {strat}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Interviewee Persona Card */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
            <h3 style={{ color: '#2C6A6E' }}>Role B: Interviewee / Buyer</h3>
            <span style={{ fontSize: '0.75rem', padding: '4px 8px', borderRadius: '6px', background: 'rgba(44,106,110,0.14)', color: '#2C6A6E' }}>
              {mode === 'practice' && userRole === 'interviewee' ? 'HUMAN' : 'AI AGENT'}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Persona Name</label>
              <input value={interviewee.name} onChange={(e) => setInterviewee({ ...interviewee, name: e.target.value })} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Target Preferred Price ($)</label>
                <input type="number" value={interviewee.target_price} onChange={(e) => setInterviewee({ ...interviewee, target_price: parseFloat(e.target.value) || 0 })} />
              </div>
              <div>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Walk-Away Limit ($)</label>
                <input type="number" value={interviewee.walk_away_price} onChange={(e) => setInterviewee({ ...interviewee, walk_away_price: parseFloat(e.target.value) || 0 })} />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Personality Style</label>
              <select value={interviewee.personality} onChange={(e) => setInterviewee({ ...interviewee, personality: e.target.value })}>
                <option value="Aggressive">Aggressive (Firm stance, high opening)</option>
                <option value="Collaborative">Collaborative (Win-win orientation)</option>
                <option value="Analytical">Analytical (Data & benchmark driven)</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>Negotiation Strategies</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {STRATEGIES_LIST.map(strat => (
                  <button
                    key={strat}
                    type="button"
                    onClick={() => toggleStrategy('interviewee', strat)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      border: interviewee.strategies.includes(strat) ? '1px solid var(--accent-cyan)' : '1px solid var(--border-color)',
                      background: interviewee.strategies.includes(strat) ? 'rgba(44,106,110,0.16)' : 'var(--bg-sunken)',
                      color: interviewee.strategies.includes(strat) ? '#2C6A6E' : 'var(--text-muted)',
                      cursor: 'pointer'
                    }}
                  >
                    {strat}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Start Button */}
      <div style={{ textAlign: 'center' }}>
        <button 
          className="btn-primary" 
          style={{ padding: '14px 40px', fontSize: '1.1rem', borderRadius: '12px' }}
          onClick={handleLaunch}
          disabled={loading}
        >
          {loading ? 'Initializing Orchestrator...' : (
            <>
              <Play size={20} /> Launch Negotiation Arena
            </>
          )}
        </button>
      </div>
    </div>
  );
}
