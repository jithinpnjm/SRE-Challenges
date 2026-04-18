import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLiveAPI } from './useLiveAPI';
import { AudioVisualizer } from './AudioVisualizer';
import { useSession } from './useSession';

const STORAGE_KEY_GEMINI = 'sre_mentor_gemini_key';

function buildSystemPrompt(docsToc: string, nebiusGuide: string, previousTranscript: string): string {
  const history = previousTranscript
    ? `\nPREVIOUS SESSION — continue from here:\n${previousTranscript.slice(-2000)}`
    : '';

  // Use only first 4000 chars of the guide to keep system prompt lean
  const guideSnippet = nebiusGuide.slice(0, 4000);

  return `You are a Staff SRE Instructor preparing a student for a Nebius AI interview tomorrow.

RULES — follow strictly:
- ALWAYS wait for the student to speak first before teaching anything
- Keep every response under 4 sentences unless the student asks for more
- Ask ONE follow-up question after each explanation and then STOP and WAIT
- Never monologue — this is a conversation, not a lecture
- Teach from the student's study files listed below

NEBIUS CONTEXT:
${guideSnippet}

STUDENT STUDY FILES:
${docsToc}
${history}`;
}

export default function SREMentor(): React.ReactElement | null {
  const [isMounted, setIsMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [geminiKey, setGeminiKey] = useState('');
  const [savedKey, setSavedKey] = useState('');
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [docsToc, setDocsToc] = useState('');
  const [nebiusGuide, setNebiusGuide] = useState('');
  const [docsLoaded, setDocsLoaded] = useState(false);
  const [sessionTranscript, setSessionTranscript] = useState('');
  const [liveModels, setLiveModels] = useState<string[]>([]);
  const [findingModels, setFindingModels] = useState(false);

  const { ready, previousTranscript, saveSession, clearSession } = useSession();
  const { active, isConnecting, isReconnecting, error, volume, transcript, start, stop, sendText } =
    useLiveAPI(savedKey);

  const transcriptRef = useRef<HTMLDivElement>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setIsMounted(true);
    const k = localStorage.getItem(STORAGE_KEY_GEMINI);
    if (k) setSavedKey(k);

    fetch('/sre-docs.json')
      .then(r => r.json())
      .then((data: { docs: { path: string; content: string }[] }) => {
        // Extract Nebius company guide for full injection
        const guideFile = data.docs.find(d => d.path.includes('00-company-stack-interview-guide'));
        setNebiusGuide(guideFile?.content ?? '');

        // Build a compact TOC of all other files
        const toc = data.docs
          .filter(d => !d.path.includes('00-company-stack-interview-guide'))
          .map(d => `- ${d.path}`)
          .join('\n');
        setDocsToc(toc);
        setDocsLoaded(true);
      })
      .catch(() => setDocsLoaded(true));
  }, []);

  // Accumulate transcript across reconnections
  useEffect(() => {
    if (transcript) {
      setSessionTranscript(prev => prev + '\n' + transcript);
    }
  }, [transcript]);

  // Auto-save session every 5s when active
  useEffect(() => {
    if (!active || !sessionTranscript) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveSession(sessionTranscript);
    }, 5000);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [sessionTranscript, active, saveSession]);

  // Save on stop
  useEffect(() => {
    if (!active && sessionTranscript) {
      saveSession(sessionTranscript);
    }
  }, [active]);

  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [transcript]);

  const saveKey = () => {
    const k = geminiKey.trim();
    if (k) {
      localStorage.setItem(STORAGE_KEY_GEMINI, k);
      setSavedKey(k);
      setGeminiKey('');
      setShowKeyInput(false);
    }
  };

  const findLiveModels = async () => {
    const key = savedKey || geminiKey.trim();
    if (!key) return;
    setFindingModels(true);
    setLiveModels([]);
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
      const data = await r.json();
      const live = (data.models ?? [])
        .filter((m: any) => m.supportedGenerationMethods?.includes('bidiGenerateContent'))
        .map((m: any) => m.name as string);
      setLiveModels(live);
    } catch {
      setLiveModels(['Error fetching models']);
    }
    setFindingModels(false);
  };

  const handleStart = useCallback(async () => {
    if (!docsLoaded) return;
    const systemPrompt = buildSystemPrompt(docsToc, nebiusGuide, previousTranscript);
    await start(systemPrompt);
  }, [docsLoaded, docsToc, nebiusGuide, previousTranscript, start]);

  const handleStop = useCallback(() => {
    stop();
  }, [stop]);

  const toggleVoice = useCallback(() => {
    if (active) handleStop();
    else handleStart();
  }, [active, handleStart, handleStop]);

  const handleNewSession = useCallback(() => {
    stop();
    clearSession();
    setSessionTranscript('');
  }, [stop, clearSession]);

  if (!isMounted) return null;

  const statusText = !docsLoaded
    ? 'Loading study materials...'
    : isConnecting
    ? 'Connecting to Gemini Live...'
    : isReconnecting
    ? 'Reconnecting...'
    : active
    ? 'Listening — speak freely'
    : error
    ? error
    : previousTranscript
    ? 'Session restored — click mic to continue'
    : 'Click mic to start session';

  const statusColor = error
    ? '#f87171'
    : isConnecting || isReconnecting || !docsLoaded
    ? '#fbbf24'
    : active
    ? '#4ade80'
    : previousTranscript
    ? '#60a5fa'
    : '#6c7086';

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setIsOpen(o => !o)}
        title="SRE Voice Mentor"
        style={{
          position: 'fixed', bottom: '24px', right: '24px',
          width: '56px', height: '56px', borderRadius: '50%',
          background: active ? '#dc2626' : isOpen ? '#1d4ed8' : '#2563eb',
          color: '#fff', border: 'none', cursor: 'pointer',
          fontSize: '22px', boxShadow: '0 4px 20px rgba(37,99,235,0.4)',
          zIndex: 9999, display: 'flex', alignItems: 'center',
          justifyContent: 'center', transition: 'background 0.2s',
          animation: active ? 'pulseBtn 2s infinite' : 'none',
        }}
      >
        {isOpen ? '✕' : '🎙️'}
      </button>

      {isOpen && (
        <div style={{
          position: 'fixed', bottom: '90px', right: '24px',
          width: '340px',
          background: '#0f0f1a',
          borderRadius: '20px',
          boxShadow: '0 12px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06)',
          zIndex: 9998, display: 'flex', flexDirection: 'column',
          overflow: 'hidden', fontFamily: 'system-ui, sans-serif',
        }}>
          {/* Header */}
          <div style={{
            padding: '14px 16px',
            background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: '13px', color: '#fff' }}>SRE Staff Mentor</div>
              <div style={{ fontSize: '10px', color: '#93c5fd', marginTop: '1px' }}>
                {docsLoaded ? `${nebiusGuide ? '📚 Nebius docs loaded · ' : ''}Gemini Live` : '⏳ Loading docs...'}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              {previousTranscript && (
                <button onClick={handleNewSession} title="New session"
                  style={{ background: 'none', border: 'none', color: '#93c5fd', cursor: 'pointer', fontSize: '13px' }}>
                  ＋New
                </button>
              )}
              <button onClick={() => setShowKeyInput(s => !s)} title="API Key settings"
                style={{ background: 'none', border: 'none', color: '#93c5fd', cursor: 'pointer', fontSize: '16px' }}>
                ⚙️
              </button>
            </div>
          </div>

          {/* Key input */}
          {showKeyInput && (
            <div style={{ padding: '12px 14px', background: '#0d0d1f', borderBottom: '1px solid #1e1e3a' }}>
              <div style={{ fontSize: '11px', color: '#6c7086', marginBottom: '6px' }}>
                Gemini API Key · stored in browser only
              </div>
              <input type="password" placeholder="AIza..."
                value={geminiKey} onChange={e => setGeminiKey(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && saveKey()}
                style={{
                  width: '100%', padding: '7px 10px', borderRadius: '8px',
                  border: '1px solid #2d2d5e', background: '#1a1a2e',
                  color: '#e2e8f0', fontSize: '12px', boxSizing: 'border-box', marginBottom: '8px',
                }}
              />
              <button onClick={saveKey} style={{
                width: '100%', padding: '7px', background: '#2563eb',
                color: '#fff', border: 'none', borderRadius: '8px',
                cursor: 'pointer', fontSize: '12px', fontWeight: 600,
              }}>Save Key</button>
              {savedKey && <div style={{ fontSize: '10px', color: '#4ade80', marginTop: '6px' }}>✓ Key saved</div>}
              <button onClick={findLiveModels} disabled={findingModels} style={{
                width: '100%', padding: '7px', marginTop: '8px',
                background: '#1a1a2e', color: '#60a5fa',
                border: '1px solid #2d2d5e', borderRadius: '8px',
                cursor: 'pointer', fontSize: '11px',
              }}>
                {findingModels ? 'Scanning...' : '🔍 Find available Live models'}
              </button>
              {liveModels.length > 0 && (
                <div style={{ marginTop: '8px', fontSize: '10px', color: '#94a3b8' }}>
                  {liveModels.map(m => (
                    <div key={m} style={{ padding: '3px 0', color: '#4ade80' }}>{m}</div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* No key state */}
          {!savedKey && !showKeyInput && (
            <div style={{ padding: '28px 20px', textAlign: 'center', color: '#94a3b8' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>🔑</div>
              <div style={{ fontSize: '13px', marginBottom: '12px' }}>Add your Gemini API key to start</div>
              <button onClick={() => setShowKeyInput(true)} style={{
                padding: '8px 20px', background: '#2563eb', color: '#fff',
                border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600,
              }}>Add API Key</button>
              <div style={{ fontSize: '10px', color: '#475569', marginTop: '10px' }}>Free key at aistudio.google.com</div>
            </div>
          )}

          {/* Main UI */}
          {savedKey && !showKeyInput && (
            <div style={{ padding: '20px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>

              {/* Session restore badge */}
              {previousTranscript && !active && (
                <div style={{
                  width: '100%', padding: '8px 12px', borderRadius: '10px',
                  background: '#0d1a3a', border: '1px solid #1e3a6a',
                  fontSize: '11px', color: '#60a5fa', boxSizing: 'border-box',
                }}>
                  🔄 Previous session restored — mentor remembers where you left off
                </div>
              )}

              {/* Visualizer */}
              <div style={{
                padding: '14px 20px', background: '#0a0a18', borderRadius: '14px',
                border: '1px solid #1e1e3a', width: '100%',
                display: 'flex', justifyContent: 'center', boxSizing: 'border-box',
              }}>
                <AudioVisualizer volume={volume} active={active} />
              </div>

              {/* Status */}
              <div style={{ fontSize: '12px', color: statusColor, textAlign: 'center', minHeight: '18px', transition: 'color 0.3s' }}>
                {statusText}
              </div>

              {/* Mic button */}
              <button
                onClick={toggleVoice}
                disabled={isConnecting || !docsLoaded}
                style={{
                  width: '72px', height: '72px', borderRadius: '50%',
                  background: active
                    ? 'radial-gradient(circle, #dc2626, #b91c1c)'
                    : 'radial-gradient(circle, #2563eb, #1d4ed8)',
                  border: `3px solid ${active ? '#f87171' : '#60a5fa'}`,
                  cursor: (isConnecting || !docsLoaded) ? 'not-allowed' : 'pointer',
                  fontSize: '28px', color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: active ? '0 0 24px rgba(220,38,38,0.5)' : '0 0 24px rgba(37,99,235,0.4)',
                  transition: 'all 0.3s',
                  opacity: (isConnecting || !docsLoaded) ? 0.6 : 1,
                  animation: active ? 'pulseBtn 2s infinite' : 'none',
                }}
              >
                {isConnecting ? '⏳' : active ? '⏹' : '🎙️'}
              </button>

              <div style={{ fontSize: '11px', color: '#334155', textAlign: 'center' }}>
                {active ? 'Click to end session' : 'Click to start talking'}
              </div>

              {/* Live transcript */}
              {transcript.length > 0 && (
                <div ref={transcriptRef} style={{
                  width: '100%', maxHeight: '120px', overflowY: 'auto',
                  background: '#0a0a18', borderRadius: '10px',
                  border: '1px solid #1e1e3a', padding: '10px 12px',
                  fontSize: '11px', color: '#94a3b8', lineHeight: '1.6',
                  whiteSpace: 'pre-wrap', boxSizing: 'border-box',
                }}>
                  {transcript}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes pulseBtn {
          0%, 100% { box-shadow: 0 0 0 0 rgba(220,38,38,0.5); }
          50% { box-shadow: 0 0 0 12px rgba(220,38,38,0); }
        }
      `}</style>
    </>
  );
}
