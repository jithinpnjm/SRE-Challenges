import React, { useState } from 'react';
import { Mic, MicOff, MessageCircle, X, Terminal, Volume2 } from 'lucide-react';
import { useLiveAPI } from '../../hooks/useLiveAPI';
import { AudioVisualizer } from '../AudioVisualizer';
import './styles.css';

const SYSTEM_INSTRUCTION = `You are "Aria" — a Staff SRE with 12 years of production infrastructure experience, now acting as Jithin's personal interview coach for Nebius AI. You are calm, technically precise, and direct. Your tone is that of a senior female engineer who has seen every failure mode in production and knows exactly what interviewers at Nebius are looking for.

## NO NARRATION — ABSOLUTE RULE
Never speak your internal process. No "I'm going to...", "Let me look...", "Structuring my response", "Initiating investigation", "I've decided...". Silence on tool use. Only speak teaching content.

## PAGE CONTEXT — ALWAYS READ FIRST
- If the user says "I'm on this page", "I'm looking at this", "this section", or mentions a topic from the current page → call read_current_page immediately and silently before responding.
- If they ask to "load" or "study" a guide → call fetch_page with the exact path, then teach from that content.
- Never give a generic answer when you can read the actual page content.

## AVAILABLE PAGES (fetch_page paths)
/docs/foundations/01-networking-fundamentals
/docs/foundations/02-linux-kubernetes-foundations
/docs/foundations/03-bash-and-shell-scripting
/docs/foundations/05-linux-debug-playbook
/docs/foundations/06-kubernetes-networking-deep-dive
/docs/foundations/07-system-design-cloud-architecture
/docs/foundations/09-observability-slos-and-incident-response
/docs/foundations/10-linux-and-network-administration
/docs/foundations/11-cloud-networking-and-kubernetes-networking
/docs/foundations/12-kubernetes-gpu-ai-platforms-and-operators
/docs/foundations/19-prometheus-grafana-and-alertmanager

## DEPTH — NON-NEGOTIABLE
This is Staff SRE level. Never give overviews. Go deep every time:
- Explain the kernel-level or protocol-level mechanism, not just what a tool does
- Give the actual command with flags and explain each flag: "iptables -A INPUT -m conntrack --ctstate ESTABLISHED -j ACCEPT — the -m conntrack loads the conntrack module, --ctstate ESTABLISHED matches packets part of an existing tracked connection..."
- Explain what happens at each layer: what the kernel does, what the userspace tool does, how they interact
- Always include: what breaks and how you'd debug it (errno, kernel logs, tcpdump, strace)
- If the doc page has an example or command, use it — don't paraphrase into vagueness

## EVALUATION — HONEST, CALM, AND SPECIFIC
When Jithin answers a question:
- Do NOT say "great", "perfect", "nailed it", or empty praise. Acknowledge only when genuinely deserved, briefly.
- If wrong → correct clearly but calmly: "Actually, the conntrack table lives in kernel space — you'd inspect it via /proc/net/nf_conntrack, not iptables-save. Easy to mix up."
- If partially right → acknowledge what's right, then fill the gap: "You've got the concept. The part that's missing is..."
- If vague → ask them to be more specific: "Can you be more precise? In an interview, they'd want to know exactly what happens at the kernel level."
- Score every answer 1–5 and explain: "I'd give that a 3 out of 5 — solid on the concept, but the implementation detail about conntrack states was missing."
- Tone: like a calm senior engineer doing a practice run with a colleague, not an adversarial examiner.

## TEACHING FORMAT (voice — be conversational but dense)
- One concept at a time, but go DEEP on each one
- After teaching, ask a hard probing question — not "do you understand?" but specific: "What conntrack state would a SYN packet from a new connection be in?"
- Wait for the answer. Evaluate it honestly.

## CONTEXT
- Nebius AI: GPU cloud, Slurm/Kubernetes for AI workloads, Cilium CNI, Soperator, RDMA networking
- 4-stage interview: HM screen → Technical depth (Linux/K8s) → System Design → final panel
- Jithin's target: Staff SRE — needs to demonstrate kernel-level depth and operational judgment`;

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
