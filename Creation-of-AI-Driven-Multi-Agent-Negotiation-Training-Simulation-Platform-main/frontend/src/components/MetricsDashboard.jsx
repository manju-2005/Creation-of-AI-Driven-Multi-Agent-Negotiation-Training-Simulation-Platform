import React, { useState, useEffect } from 'react';
import { Activity, BookOpen, Wrench, BarChart2, ArrowLeft } from 'lucide-react';
import { api } from '../services/api';

export default function MetricsDashboard({ sessionId, onBack }) {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMetrics();
  }, [sessionId]);

  const loadMetrics = async () => {
    try {
      const data = await api.getMetrics(sessionId);
      setMetrics(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !metrics) {
    return (
      <div style={{ textAlign: 'center', padding: '100px', color: 'var(--text-secondary)' }}>
        <h2>Loading Session Observability Dashboard...</h2>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1000px', margin: '40px auto', padding: '24px' }} className="animate-fade-in">
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <button className="btn-secondary" onClick={onBack}>
          <ArrowLeft size={16} /> Back to Arena
        </button>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 700 }}>Session Metrics & Observability Dashboard</h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '16px', marginBottom: '28px' }}>
        <div className="glass-panel" style={{ padding: '20px', textAlign: 'center' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Current Round</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#232D4F', marginTop: '4px' }}>{metrics.round_count} / {metrics.max_rounds}</div>
        </div>

        <div className="glass-panel" style={{ padding: '20px', textAlign: 'center' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Agreement Probability</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#3E7A57', marginTop: '4px' }}>
            {Math.round((metrics.estimated_zopa?.agreement_probability || 0.5) * 100)}%
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '20px', textAlign: 'center' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>RAG Knowledge Invocations</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#2C6A6E', marginTop: '4px' }}>{metrics.rag_citations_total}</div>
        </div>

        <div className="glass-panel" style={{ padding: '20px', textAlign: 'center' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Tool Invocations</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#4A5686', marginTop: '4px' }}>{metrics.tool_calls_total}</div>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '1.2rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <BarChart2 size={20} color="#232D4F" /> ZOPA Range & Offer Movement Details
        </h3>

        <div style={{ background: 'var(--bg-sunken)', padding: '16px', borderRadius: '10px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          <p><strong>Estimated ZOPA Range:</strong> ${metrics.estimated_zopa?.estimated_range?.[0]} - ${metrics.estimated_zopa?.estimated_range?.[1]}</p>
          <p style={{ marginTop: '6px' }}><strong>ZOPA Gap:</strong> ${metrics.estimated_zopa?.gap}</p>
          <p style={{ marginTop: '6px' }}><strong>Convergence:</strong> {metrics.estimated_zopa?.convergence_percentage}%</p>
        </div>
      </div>
    </div>
  );
}
