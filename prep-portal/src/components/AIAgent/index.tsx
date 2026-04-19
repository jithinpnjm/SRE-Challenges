import React, { useState } from 'react';
import { Mic, MicOff, MessageCircle, X, Terminal, Volume2 } from 'lucide-react';
import { useLiveAPI } from '../../hooks/useLiveAPI';
import { AudioVisualizer } from '../AudioVisualizer';
import './styles.css';

const SYSTEM_INSTRUCTION = `You are "SRE-Mentor", a technical AI integrated into the SRE Challenges portal for Jithin, a Staff SRE candidate preparing for a Nebius AI infrastructure interview.

CAPABILITIES:
1. Use the "read_current_page" tool to read what the user is currently studying. Do this when they ask about page content.
2. Use the "navigate_to" tool if they ask to go to a specific lab or guide.

CONTEXT:
- This is a Docusaurus site with study material on Linux, Kubernetes, GPU infrastructure, Cilium, Soperator, observability, and SRE principles.
- The user has a 4-stage interview: Hiring Manager screen, Technical (Linux/K8s depth), System Design, and final panel.
- Focus areas: GPU cluster management, Slurm/Kubernetes for AI workloads, Cilium CNI, incident response, SLOs.

GUIDELINES:
1. Be concise in voice responses — short answers work better for voice interaction.
2. Stop and listen whenever the user starts speaking.
3. Ask clarifying questions to guide the user toward deeper understanding.
4. Encourage hands-on troubleshooting and real-world examples.`;

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
              <div style={{ color: '#ff4444', fontSize: '11px', marginBottom: '10px', padding: '10px', background: 'rgba(255,0,0,0.05)', borderRadius: '8px' }}>
                {error}
              </div>
            )}

            {!active && !isConnecting && (
              <div style={{ textAlign: 'center', opacity: 0.5, marginTop: '20px' }}>
                <Volume2 size={32} style={{ marginBottom: '10px' }} />
                <p style={{ fontSize: '12px' }}>Initialize neural bridge to begin mentorship.</p>
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
