import React from 'react';
import { Activity, ShieldCheck, DollarSign, TrendingUp } from 'lucide-react';

export default function DealMeter({ metrics }) {
  if (!metrics) return null;

  const zopa = metrics.estimated_zopa || {};
  const convergence = zopa.convergence_percentage || 0;
  const agreementProb = Math.round((zopa.agreement_probability || 0.5) * 100);
  const intMet = metrics.interviewer_metrics || {};
  const iveMet = metrics.interviewee_metrics || {};

  return (
    <div className="glass-panel" style={{ padding: '20px', marginBottom: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Activity size={20} color="#818cf8" /> Live Negotiation Metrics & Estimated ZOPA
        </h3>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', background: '#0f172a', padding: '4px 10px', borderRadius: '6px' }}>
          Round {metrics.round_count} of {metrics.max_rounds}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '20px' }}>
        {/* Interviewer Stance Box */}
        <div style={{ background: '#0f172a', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
          <div style={{ fontSize: '0.8rem', color: '#818cf8', fontWeight: 600, marginBottom: '4px' }}>
            {intMet.name} (Seller)
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            ${(intMet.latest_offer || 0).toLocaleString()}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Concession Rate: <span style={{ color: '#34d399' }}>{intMet.concession_rate_pct || 0}%</span>
          </div>
        </div>

        {/* Convergence & ZOPA Center Box */}
        <div style={{ background: '#0f172a', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
            Agreement Probability
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, color: agreementProb > 70 ? '#34d399' : agreementProb > 40 ? '#fbbf24' : '#f43f5e' }}>
            {agreementProb}%
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            ZOPA Gap: ${zopa.gap ? zopa.gap.toLocaleString() : 0}
          </div>
        </div>

        {/* Interviewee Stance Box */}
        <div style={{ background: '#0f172a', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-color)', textAlign: 'right' }}>
          <div style={{ fontSize: '0.8rem', color: '#06b6d4', fontWeight: 600, marginBottom: '4px' }}>
            {iveMet.name} (Buyer)
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            ${(iveMet.latest_offer || 0).toLocaleString()}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Concession Rate: <span style={{ color: '#34d399' }}>{iveMet.concession_rate_pct || 0}%</span>
          </div>
        </div>
      </div>

      {/* Progress Convergence Bar */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
          <span>Offer Convergence Progress</span>
          <span>{convergence}% Converged</span>
        </div>
        <div style={{ width: '100%', height: '10px', background: '#0f172a', borderRadius: '5px', overflow: 'hidden' }}>
          <div 
            style={{ 
              width: `${convergence}%`, 
              height: '100%', 
              background: 'linear-gradient(90deg, #6366f1 0%, #06b6d4 50%, #10b981 100%)',
              transition: 'width 0.4s ease'
            }} 
          />
        </div>
      </div>
    </div>
  );
}
