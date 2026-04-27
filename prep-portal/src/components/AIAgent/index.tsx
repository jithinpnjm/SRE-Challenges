import React, { useState } from 'react';
import { Mic, MicOff, MessageCircle, X, Terminal, Volume2, Brain, Target } from 'lucide-react';
import { useLiveAPI } from '../../hooks/useLiveAPI';
import { AudioVisualizer } from '../AudioVisualizer';
import './styles.css';

const baseInstruction = `You are Aria, a senior Staff SRE mentor. Be calm, precise, realistic, technically deep, and conversational. Never narrate internal reasoning. Teach one concept at a time. Use page context when available. After explanations, ask probing follow-up questions and evaluate answers honestly.`;

const modeInstructions: Record<string,string> = {
  coach: 'Mode: Coaching. Teach clearly, use memory-palace analogies, then test recall.',
  interview: 'Mode: Interview. Ask one hard senior SRE interview question at a time. Score answers 1-5 with concise feedback.',
  incident: 'Mode: Incident Commander. Simulate a real production incident. Reveal clues progressively. Ask for next actions.',
  nebius: 'Mode: Nebius Staff Prep. Focus on Linux, Kubernetes, Cilium, GPUs, networking, production judgment.'
};

export const AIAgent: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState('coach');
  const transcriptRef = React.useRef<HTMLDivElement>(null);
  const { active, isConnecting, error, transcript, volume, status, start, stop } = useLiveAPI();

  React.useEffect(() => {
    if (transcriptRef.current) transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
  }, [transcript]);

  const toggleVoice = () => {
    if (active) stop();
    else start(baseInstruction + '\n' + modeInstructions[mode]);
  };

  const closePanel = () => { if (active) stop(); setIsOpen(false); };

  return (<>
    <button className="ai-agent-fab" onClick={() => isOpen ? closePanel() : setIsOpen(true)} aria-label="Open AI Mentor">
      {isOpen ? <X size={24}/> : <MessageCircle size={30}/>}
    </button>
    {isOpen && <div className="ai-agent-panel">
      <div className="ai-agent-header">
        <div style={{display:'flex',alignItems:'center',gap:'10px'}}><Brain size={18}/><span style={{fontSize:'12px',fontWeight:'bold'}}>ARIA // SRE VOICE MENTOR</span></div>
        <div className="ai-status-badge">{status}</div>
      </div>
      <div className="ai-agent-content">
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px',marginBottom:'12px'}}>
          {Object.keys(modeInstructions).map((m)=><button key={m} className="ai-mode-btn" onClick={()=>setMode(m)} disabled={active}>{m.toUpperCase()}</button>)}
        </div>
        <div style={{fontSize:'12px',opacity:0.75,marginBottom:'10px'}}>Current mode: <b>{mode}</b></div>
        {error && <div style={{ color:'#fff',fontSize:'12px',marginBottom:'10px',padding:'12px',background:'#cc0000',borderRadius:'8px'}}>⚠ {error}</div>}
        {!active && !isConnecting && !error && <div style={{textAlign:'center',opacity:0.6,marginTop:'8px'}}><Target size={28}/><p style={{fontSize:'12px'}}>Choose a mode, then start speaking.</p></div>}
        {isConnecting && <p style={{fontSize:'12px'}}>Connecting voice mentor...</p>}
        <div className="ai-transcript" ref={transcriptRef} style={{ maxHeight:'280px', overflowY:'auto' }}>{transcript}</div>
      </div>
      <div className="ai-agent-footer">
        <div style={{flex:1}}><AudioVisualizer volume={volume} active={active}/></div>
        <button className={`ai-btn-voice ${active ? 'active' : ''}`} onClick={toggleVoice} disabled={isConnecting}>{active ? <MicOff size={20}/> : <Mic size={20}/>}</button>
      </div>
    </div>}
  </>);
};
