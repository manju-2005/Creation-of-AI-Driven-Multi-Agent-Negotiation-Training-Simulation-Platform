import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { History, Eye, Trash2, Clock, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';

export default function HistoryScreen({ onSelectSession, onOpenReport }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const data = await api.listSessions();
      setSessions(data || []);
    } catch (err) {
      console.error('Failed to load session history:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this session from history?')) return;
    try {
      await api.deleteSession(id);
      setSessions(prev => prev.filter(s => s.id !== id && s._id !== id));
    } catch (err) {
      console.error('Failed to delete session:', err);
    }
  };

  const formatTimestamp = (dateVal) => {
    if (!dateVal) return 'Just now';
    try {
      let rawStr = String(dateVal).trim();
      if (!rawStr.endsWith('Z') && !rawStr.includes('+') && (rawStr.includes('T') || rawStr.includes(' '))) {
        rawStr = `${rawStr}Z`;
      }
      const d = new Date(rawStr);
      if (isNaN(d.getTime())) return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
      return d.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch (e) {
      return 'Recent';
    }
  };

  return (
    <div style={{ padding: '28px', maxWidth: '1100px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <History color="#232D4F" size={24} />
            Negotiation History Log
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            All active and past multi-agent negotiation sessions persisted in MongoDB.
          </p>
        </div>
        <button className="btn-control" onClick={fetchHistory}>
          Refresh List
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>Loading history records...</div>
      ) : sessions.length === 0 ? (
        <div className="panel-card" style={{ textAlign: 'center', padding: '60px' }}>
          <History size={48} color="#8C8676" style={{ margin: '0 auto 16px' }} />
          <h3>No Saved Negotiation Sessions</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '8px' }}>
            Start a new session in Simulation Mode or Practice Mode to see history records here.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {sessions.map(s => {
            const sid = s.id || s._id;
            const scenarioName = s.scenario_id === 'vendor_pricing' ? 'Vendor Pricing Negotiation' 
              : s.scenario_id === 'job_offer' ? 'Job Offer Negotiation' 
              : 'Project Budget Allocation';

            const statusColor = s.status === 'agreement' ? '#3E7A57' : s.status === 'impasse' ? '#96382F' : '#232D4F';

            return (
              <div 
                key={sid}
                className="panel-card"
                onClick={() => onSelectSession(s)}
                style={{ 
                  cursor: 'pointer', 
                  flexDirection: 'row', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  padding: '16px 24px',
                  transition: 'border-color 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div className="avatar-circle purple" style={{ width: '40px', height: '40px' }}>
                    <Clock size={20} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <h4 style={{ fontSize: '1rem', fontWeight: 700 }}>{scenarioName}</h4>
                      <span 
                        style={{ 
                          fontSize: '0.75rem', 
                          fontWeight: 600, 
                          padding: '3px 10px', 
                          borderRadius: '12px',
                          background: `${statusColor}22`,
                          color: statusColor,
                          border: `1px solid ${statusColor}44`
                        }}
                      >
                        {s.status?.toUpperCase()}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      Mode: <strong style={{ color: '#4A5686' }}>{s.mode}</strong> • Rounds: {s.current_round} / {s.max_rounds} • Created: {formatTimestamp(s.created_at)}
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <button 
                    className="btn-control" 
                    onClick={(e) => { e.stopPropagation(); onSelectSession(s); }}
                  >
                    <Eye size={14} /> Resume / Arena
                  </button>
                  <button 
                    className="btn-control btn-end"
                    onClick={(e) => handleDelete(e, sid)}
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
