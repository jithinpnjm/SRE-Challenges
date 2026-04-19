import React, { useState } from 'react';
import { Mic, MicOff, MessageCircle, X, Terminal, Volume2 } from 'lucide-react';
import { useLiveAPI } from '../../hooks/useLiveAPI';
import { AudioVisualizer } from '../AudioVisualizer';
import './styles.css';

const SYSTEM_INSTRUCTION = `You are "SRE-Mentor", a voice AI tutor helping Jithin prepare for a Staff SRE interview at Nebius AI.

TOOLS — use silently, never narrate tool usage out loud:
- "read_current_page": call this automatically at the start of each session. Do NOT announce you are doing it.
- "navigate_to": navigate to a doc path if the user asks.

CONTEXT:
- Docusaurus study site covering Linux, Kubernetes, GPU infrastructure, Cilium, Soperator, observability, SRE principles.
- 4-stage interview: Hiring Manager, Technical deep-dive (Linux/K8s), System Design, final panel.
- Key topics: GPU cluster management, Slurm/K8s for AI workloads, Cilium CNI, incident response, SLOs.

VOICE RULES:
1. NEVER say "I am calling a tool", "Ascertaining context", "I need to determine", or narrate any internal steps. Just do it silently and respond naturally.
2. Keep answers short and conversational — this is voice, not text.
3. Stop talking immediately when the user speaks.
4. Ask one focused question at a time to test understanding.`;

export const AIAgent: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { active, isConnecting, error, transcript, volume, start, stop } = useLiveAPI();

  const toggleVoice = () => {
    if (active) stop();
    else start(SYSTEM_INSTRUCTION);
  };

  return (
    <>
      <button
        className="ai-agent-fab"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Open AI Mentor"
      >
        {isOpen ? <X size={24} /> : <MessageCircle size={30} />}
      </button>

      {isOpen && (
        <div className="ai-agent-panel">
          <div className="ai-agent-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Terminal size={18} />
              <span style={{ fontSize: '12px', fontWeight: 'bold' }}>SRE.Mentor_v2</span>
            </div>
            <div className="ai-status-badge">
              {active ? 'SYNCING' : isConnecting ? 'CONNECTING' : 'IDLE'}
            </div>
          </div>

          <div className="ai-agent-content">
            {error && (
              <div style={{ color: '#fff', fontSize: '12px', marginBottom: '10px', padding: '12px', background: '#cc0000', borderRadius: '8px', fontWeight: 'bold' }}>
                ⚠ {error}
              </div>
            )}

            {isConnecting && (
              <div style={{ textAlign: 'center', opacity: 0.7, marginTop: '20px' }}>
                <p style={{ fontSize: '12px' }}>Connecting to Gemini...</p>
              </div>
            )}

            {!active && !isConnecting && !error && (
              <div style={{ textAlign: 'center', opacity: 0.5, marginTop: '20px' }}>
                <Volume2 size={32} style={{ marginBottom: '10px' }} />
                <p style={{ fontSize: '12px' }}>Click the mic button below to start.</p>
              </div>
            )}

            <div className="ai-transcript">
              {transcript.split('\n').map((line, i) => (
                <div key={i} style={{ marginBottom: '8px' }}>
                  {line.startsWith('You:') ? (
                    <><span className="speaker">STUDENT:</span> {line.replace('You:', '')}</>
                  ) : line.startsWith('Mentor:') ? (
                    <><span className="speaker">MENTOR:</span> {line.replace('Mentor:', '')}</>
                  ) : (
                    line
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="ai-agent-footer">
            <div style={{ flex: 1 }}>
              <AudioVisualizer volume={volume} active={active} />
            </div>
            <button
              className={`ai-btn-voice ${active ? 'active' : ''}`}
              onClick={toggleVoice}
              disabled={isConnecting}
            >
              {active ? <MicOff size={20} /> : <Mic size={20} />}
            </button>
          </div>
        </div>
      )}
    </>
  );
};
