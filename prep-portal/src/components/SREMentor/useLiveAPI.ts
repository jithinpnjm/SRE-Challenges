import { useState, useRef, useCallback } from 'react';
import { GoogleGenAI, Modality } from '@google/genai';

const LIVE_MODEL = 'gemini-2.0-flash-exp';
const SAMPLE_RATE_IN = 16000;
const SAMPLE_RATE_OUT = 24000;

export function useLiveAPI(apiKey: string) {
  const [active, setActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isReconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [volume, setVolume] = useState(0);
  const [transcript, setTranscript] = useState('');

  const sessionRef = useRef<any>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioQueueRef = useRef<AudioBufferSourceNode[]>([]);

  const stopAllAudio = useCallback(() => {
    audioQueueRef.current.forEach(node => { try { node.stop(); } catch {} });
    audioQueueRef.current = [];
  }, []);

  const playPCMMessage = useCallback((base64: string) => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;

    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const int16 = new Int16Array(bytes.buffer);
    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) float32[i] = int16[i] / 32768;

    const buffer = ctx.createBuffer(1, float32.length, SAMPLE_RATE_OUT);
    buffer.getChannelData(0).set(float32);

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    audioQueueRef.current.push(source);
    source.onended = () => {
      audioQueueRef.current = audioQueueRef.current.filter(n => n !== source);
    };
    source.start();
  }, []);

  const cleanupAudio = useCallback(() => {
    stopAllAudio();
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    setVolume(0);
  }, [stopAllAudio]);

  const start = useCallback(async (systemInstruction: string) => {
    if (!apiKey) { setError('No Gemini API key'); return; }
    setIsConnecting(true);
    setError(null);
    setTranscript('');

    try {
      const ai = new GoogleGenAI({ apiKey });

      const session = await ai.live.connect({
        model: LIVE_MODEL,
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction,
          inputAudioTranscription: {},
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } },
          },
        } as any,
        callbacks: {
          onopen: () => {
            console.log('[SREMentor] Connected');
            setIsConnecting(false);
            setActive(true);
          },
          onmessage: (msg: any) => {
            // Play model audio
            const audio = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audio) playPCMMessage(audio);

            // Model text
            const text = msg.serverContent?.modelTurn?.parts?.[0]?.text;
            if (text) setTranscript(t => `${t}\nMentor: ${text}`);

            // User interrupted model — stop current audio immediately
            if (msg.serverContent?.interrupted) {
              console.log('[SREMentor] Interrupted by user');
              stopAllAudio();
            }

            // User speech transcription
            const userText = msg.serverContent?.inputAudioTranscription?.text;
            if (userText) setTranscript(t => `${t}\nYou: ${userText}`);
          },
          onerror: (err: any) => {
            console.error('[SREMentor] Error:', err);
            setError(err?.message || String(err));
            setActive(false);
            setIsConnecting(false);
          },
          onclose: (e: any) => {
            console.warn('[SREMentor] Closed:', e?.code, e?.reason);
            if (e?.reason) setError(e.reason);
            setActive(false);
            setIsConnecting(false);
            cleanupAudio();
          },
        },
      });

      sessionRef.current = session;

      // Mic with echo cancellation — critical to prevent feedback loop
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      const audioCtx = new AudioContext({ sampleRate: SAMPLE_RATE_IN });
      audioCtxRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const processor = audioCtx.createScriptProcessor(4096, 1, 1);

      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);

        let sum = 0;
        for (let i = 0; i < inputData.length; i++) sum += inputData[i] * inputData[i];
        setVolume(Math.sqrt(sum / inputData.length));

        const int16 = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          int16[i] = Math.max(-1, Math.min(1, inputData[i])) * 32767;
        }
        const base64 = btoa(String.fromCharCode(...new Uint8Array(int16.buffer)));

        if (sessionRef.current) {
          try {
            sessionRef.current.sendRealtimeInput({
              audio: { data: base64, mimeType: 'audio/pcm;rate=16000' },
            });
          } catch {}
        }
      };

      source.connect(processor);
      processor.connect(audioCtx.destination);

    } catch (err: any) {
      console.error('[SREMentor] Start error:', err);
      setError(err.message || 'Failed to start');
      setIsConnecting(false);
      setActive(false);
      cleanupAudio();
    }
  }, [apiKey, playPCMMessage, stopAllAudio, cleanupAudio]);

  const stop = useCallback(() => {
    try { sessionRef.current?.close(); } catch {}
    sessionRef.current = null;
    cleanupAudio();
    setActive(false);
    setIsConnecting(false);
  }, [cleanupAudio]);

  const sendText = useCallback((text: string) => {
    try {
      sessionRef.current?.sendClientContent({
        turns: [{ role: 'user', parts: [{ text }] }],
        turnComplete: true,
      });
    } catch {}
  }, []);

  return { active, isConnecting, isReconnecting, error, volume, transcript, start, stop, sendText };
}
