import React, { useState, useEffect, useRef } from 'react';
import { Bot, CheckCircle, Send, Play, Pause, FastForward, Sparkles, Brain } from 'lucide-react';

export default function NegotiationArena({ 
  session, 
  turns = [], 
  isPlaying, 
  onTogglePlay, 
  onStepTurn, 
  onHumanSubmit, 
  loadingStep, 
  onFinishSession, 
  onViewMemory, 
  onViewMetrics 
}) {
  const [filterAgent, setFilterAgent] = useState('all'); // 'all', 'interviewer', 'interviewee'
  const [showThoughts, setShowThoughts] = useState(true);
  
  // Practice Mode Human input state
  const [userMessage, setUserMessage] = useState('');
  const [userPrice, setUserPrice] = useState('');

  const chatBottomRef = useRef(null);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [turns]);

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (!userMessage && !userPrice) return;
    onHumanSubmit(userMessage, userPrice);
    setUserMessage('');
    setUserPrice('');
  };

  const interviewer = session.interviewer_persona || {};
  const interviewee = session.interviewee_persona || {};

  // Compute concession percentages
  const lastInterviewerTurn = [...turns].reverse().find(t => t.speaker === 'interviewer');
  const lastIntervieweeTurn = [...turns].reverse().find(t => t.speaker === 'interviewee');
  
  const currentIntPrice = lastInterviewerTurn?.offer?.price || interviewer.target_price || 8000;
  const currentIvePrice = lastIntervieweeTurn?.offer?.price || interviewee.target_price || 5000;

  const intConcessionPct = Math.min(100, Math.max(0, Math.round(
    (Math.abs(interviewer.target_price - currentIntPrice) / Math.max(1, Math.abs((interviewer.target_price || 8000) - (interviewer.walk_away_price || 5500)))) * 100
  )));

  const iveConcessionPct = Math.min(100, Math.max(0, Math.round(
    (Math.abs(interviewee.target_price - currentIvePrice) / Math.max(1, Math.abs((interviewee.walk_away_price || 8000) - (interviewee.target_price || 5000)))) * 100
  )));

  const filteredTurns = turns.filter(t => {
    if (filterAgent === 'interviewer') return t.speaker === 'interviewer';
    if (filterAgent === 'interviewee') return t.speaker === 'interviewee';
    return true;
  });

  const currencySymbol = interviewer.target_price >= 1000 ? '₹' : '$';

  return (
    <div className="left-panel">
      {/* Top Agent Stance Cards */}
      <div className="stance-container">
        {/* Agent A Card (Vendor) */}
        <div className="agent-stance-card vendor">
          <div className="card-header">
            <div className="agent-profile-summary">
              <div className="avatar-circle purple">
                <Bot size={22} />
              </div>
              <div className="agent-meta">
                <h3>{interviewer.name || 'Agent A · Vendor'}</h3>
                <p>Goal: {interviewer.private_goals?.goal_description || 'Maximize Profit'} • Personality: {interviewer.personality || 'Assertive'}</p>
              </div>
            </div>
            <div className="price-targets">
              <div>Target: <strong>{currencySymbol}{interviewer.target_price?.toLocaleString()}</strong></div>
              <div>Bottom Line: <strong>{currencySymbol}{interviewer.walk_away_price?.toLocaleString()}</strong></div>
            </div>
          </div>
          <div className="progress-section">
            <div className="progress-header">
              <span>Concession</span>
              <span>{intConcessionPct}%</span>
            </div>
            <div className="progress-bar-track">
              <div className="progress-bar-fill purple" style={{ width: `${intConcessionPct}%` }}></div>
            </div>
          </div>
        </div>

        {/* VS Badge */}
        <div className="vs-badge">VS</div>

        {/* Agent B Card (Buyer) */}
        <div className="agent-stance-card buyer">
          <div className="card-header">
            <div className="agent-profile-summary">
              <div className="avatar-circle green">
                <Bot size={22} />
              </div>
              <div className="agent-meta">
                <h3>{interviewee.name || 'Agent B · Buyer'}</h3>
                <p>Goal: {interviewee.private_goals?.goal_description || 'Minimize Cost'} • Personality: {interviewee.personality || 'Analytical'}</p>
              </div>
            </div>
            <div className="price-targets">
              <div>Target: <strong>{currencySymbol}{interviewee.target_price?.toLocaleString()}</strong></div>
              <div>Bottom Line: <strong>{currencySymbol}{interviewee.walk_away_price?.toLocaleString()}</strong></div>
            </div>
          </div>
          <div className="progress-section">
            <div className="progress-header">
              <span>Concession</span>
              <span>{iveConcessionPct}%</span>
            </div>
            <div className="progress-bar-track">
              <div className="progress-bar-fill green" style={{ width: `${iveConcessionPct}%` }}></div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Negotiation Arena Chat Transcript */}
      <div className="arena-card">
        {/* Header Controls */}
        <div className="arena-header">
          <div className="arena-title">
            <div className="title-icon">
              <CheckCircle size={16} />
            </div>
            <span>Negotiation Arena</span>
          </div>

          <div className="arena-actions">
            <div className="filter-group">
              <button 
                className={`filter-btn ${filterAgent === 'all' ? 'active' : ''}`}
                onClick={() => setFilterAgent('all')}
              >
                All Turns
              </button>
              <button 
                className={`filter-btn ${filterAgent === 'interviewer' ? 'active' : ''}`}
                onClick={() => setFilterAgent('interviewer')}
              >
                Agent A
              </button>
              <button 
                className={`filter-btn ${filterAgent === 'interviewee' ? 'active' : ''}`}
                onClick={() => setFilterAgent('interviewee')}
              >
                Agent B
              </button>
            </div>

            <label className="toggle-switch">
              <span>Show Thoughts</span>
              <input 
                type="checkbox" 
                className="toggle-input" 
                checked={showThoughts} 
                onChange={(e) => setShowThoughts(e.target.checked)} 
              />
              <span className="toggle-slider"></span>
            </label>

            {/* Simulation & Practice Controls */}
            {session.mode === 'simulation' ? (
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  className="btn-control"
                  disabled={loadingStep}
                  onClick={onTogglePlay}
                >
                  {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                  {isPlaying ? 'Pause' : 'Auto Play'}
                </button>
                <button 
                  className="btn-control"
                  disabled={loadingStep || session.status === 'agreement'}
                  onClick={onStepTurn}
                >
                  <FastForward size={14} /> {loadingStep ? 'Stepping...' : 'Step Turn'}
                </button>
              </div>
            ) : (
              turns.length === 0 && (
                <button 
                  className="btn-control"
                  disabled={loadingStep}
                  onClick={onStepTurn}
                >
                  <FastForward size={14} /> {loadingStep ? 'Stepping...' : 'Trigger AI Opening Turn'}
                </button>
              )
            )}
          </div>
        </div>

        {/* Chat Scroll Area */}
        <div className="chat-scroll-area">
          {filteredTurns.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              <Sparkles size={32} style={{ marginBottom: '12px', opacity: 0.5 }} />
              <p>
                {session.mode === 'practice' 
                  ? "Negotiation initiated! Type your opening message in the input bar below and click 'Send' (or click 'Trigger AI Opening Turn' above)."
                  : "Negotiation initiated. Click 'Step Turn' or 'Auto Play' to begin AI conversation."}
              </p>
            </div>
          ) : (
            filteredTurns.map((turn, index) => {
              const isInterviewer = turn.speaker === 'interviewer';
              const agentName = isInterviewer ? (interviewer.name || 'Agent A · Vendor') : (interviewee.name || 'Agent B · Buyer');
              const agoText = index === filteredTurns.length - 1 ? 'Just now' : `${Math.max(1, filteredTurns.length - index)} min ago`;

              return (
                <div 
                  key={turn._id || index} 
                  className={`message-wrapper ${isInterviewer ? 'vendor' : 'buyer'}`}
                >
                  <div className="message-sender">
                    {!isInterviewer && <span>{agoText} • </span>}
                    <strong>{agentName}</strong>
                    {isInterviewer && <span> • {agoText}</span>}
                  </div>

                  <div className="bubble-main">
                    {turn.message}
                  </div>

                  {showThoughts && turn.reason && (
                    <div className="thought-bubble">
                      <Brain size={14} color="#232D4F" />
                      <span>💭 {turn.reason}</span>
                    </div>
                  )}
                </div>
              );
            })
          )}
          <div ref={chatBottomRef} />
        </div>

        {/* Practice Mode Input Bar */}
        {session.mode === 'practice' && (
          <form className="chat-input-bar" onSubmit={handleFormSubmit}>
            <input 
              type="text" 
              className="chat-input"
              placeholder={`Enter message as ${session.user_role === 'interviewer' ? interviewer.name : interviewee.name}...`}
              value={userMessage}
              onChange={(e) => setUserMessage(e.target.value)}
            />
            <input 
              type="number"
              className="chat-input"
              style={{ width: '130px', flex: 'none' }}
              placeholder={`Offer (${currencySymbol})`}
              value={userPrice}
              onChange={(e) => setUserPrice(e.target.value)}
            />
            <button type="submit" className="btn-send" disabled={loadingStep}>
              <Send size={16} /> {loadingStep ? 'Processing...' : 'Send'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
