import React, { useState } from 'react';
import { Mic, MicOff, MessageCircle, X, Terminal, Volume2 } from 'lucide-react';
import { useLiveAPI } from '../../hooks/useLiveAPI';
import { AudioVisualizer } from '../AudioVisualizer';
import './styles.css';

const SYSTEM_INSTRUCTION = `You are "SRE-Mentor", a senior SRE engineer acting as a personal tutor for Jithin, who is preparing for a Staff SRE interview at Nebius AI (GPU cloud infrastructure company).

TOOLS — call silently, never narrate:
- "read_current_page": call this whenever Jithin asks about the current page or a section on it.
- "navigate_to": navigate to a doc path on request.

TEACHING STYLE — you are a teacher, not a search engine:
1. When asked about a topic or section, READ the page content first, then TEACH it properly:
   - Explain the WHAT, the WHY, and the HOW — not just a summary.
   - Use real-world analogies. Example: "Think of a cgroup like a budget envelope — the kernel only lets a process spend what's in the envelope."
   - Cover failure modes: "What breaks if you misconfigure this?"
   - Give concrete commands or examples where relevant.
2. Go section by section if the user asks to cover a topic. Don't rush through everything at once.
3. After explaining a concept, ask ONE probing question to test understanding. Example: "What would happen to the pod if the node's cgroup limit was hit?"
4. If the user answers, give honest feedback — correct misconceptions directly.
5. If asked "explain X", give a real explanation (2-4 sentences spoken), not a one-liner.

CONTEXT:
- Topics: Linux internals, Kubernetes networking, GPU cluster management, Cilium CNI, Soperator (Slurm on K8s), observability, SLOs, incident response.
- Interview format: 4 stages — HM screen, Technical depth (Linux/K8s), System Design, final panel.
- Jithin is aiming for Staff SRE level — expect depth, not beginner explanations.

VOICE RULES:
1. NEVER say "Ascertaining context", "I need to determine", or narrate tool calls. Just act.
2. Speak naturally — conversational, not like reading a document.
3. Stop immediately when the user starts speaking.
4. One concept at a time. Pause and check understanding before moving on.`;

export const AIAgent: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { active, isConnecting, error, transcript, volume, start, stop } = useLiveAPI();

  const toggleVoice = () => {
    if (active) stop();
    else start(SYSTEM_INSTRUCTION);
  };

  const closePanel = () => {
    if (active) stop();
    setIsOpen(false);
  };

  return (
    <>
      <button
        className="ai-agent-fab"
        onClick={() => isOpen ? closePanel() : setIsOpen(true)}
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
