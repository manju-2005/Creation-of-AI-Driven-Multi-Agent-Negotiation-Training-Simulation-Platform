import React, { useState, useEffect } from 'react';
import { Eye, ArrowLeft, Shield } from 'lucide-react';
import { api } from '../services/api';

export default function AgentMemoryViewer({ sessionId, onBack }) {
  const [activeRole, setActiveRole] = useState('interviewer');
  const [memory, setMemory] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMemory(activeRole);
  }, [sessionId, activeRole]);

  const loadMemory = async (role) => {
    setLoading(true);
    try {
      const data = await api.getAgentMemory(sessionId, role);
      setMemory(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '900px', margin: '40px auto', padding: '24px' }} className="animate-fade-in">
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <button className="btn-secondary" onClick={onBack}>
          <ArrowLeft size={16} /> Back to Arena
        </button>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 700 }}>Agent Long-Term Memory Inspector</h1>
      </div>

      {/* Role Tabs */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
        <button 
          className="btn-secondary" 
          style={{ borderColor: activeRole === 'interviewer' ? '#232D4F' : undefined, background: activeRole === 'interviewer' ? 'rgba(35,45,79,0.10)' : undefined }}
          onClick={() => setActiveRole('interviewer')}
        >
          Interviewer Memory
        </button>
        <button 
          className="btn-secondary" 
          style={{ borderColor: activeRole === 'interviewee' ? '#2C6A6E' : undefined, background: activeRole === 'interviewee' ? 'rgba(44,106,110,0.14)' : undefined }}
          onClick={() => setActiveRole('interviewee')}
        >
          Interviewee Memory
        </button>
      </div>

      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: '#3E7A57', fontSize: '0.85rem' }}>
          <Shield size={16} /> Strict Context Isolation Active: Memory is private per agent and never exposed to counterpart prompts.
        </div>

        {loading ? (
          <p style={{ color: 'var(--text-muted)' }}>Loading agent memory records...</p>
        ) : !memory ? (
          <p style={{ color: 'var(--text-muted)' }}>No memory records initialized yet.</p>
        ) : (
          <pre style={{ background: 'var(--bg-sunken)', padding: '16px', borderRadius: '10px', color: '#3E7A57', fontSize: '0.9rem', overflowX: 'auto' }}>
            {JSON.stringify(memory, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}
