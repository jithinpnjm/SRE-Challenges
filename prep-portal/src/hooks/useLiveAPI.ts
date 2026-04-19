import { useState, useCallback, useRef, useEffect } from "react";
import { GoogleGenAI, Modality, Type } from "@google/genai";
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';

const SESSION_KEY = 'sre-mentor-last-session';

const LIVE_MODEL = "gemini-3.1-flash-live-preview";
const INPUT_SAMPLE_RATE = 16000;
const OUTPUT_SAMPLE_RATE = 24000;
const BUFFER_SIZE = 4096;

const declarationReadPage = {
  name: "read_current_page",
  description: "Reads the text content of the page the user is currently viewing.",
  parameters: { type: Type.OBJECT, properties: {} }
};

const declarationFetchPage = {
  name: "fetch_page",
  description: "Fetch and read any documentation page by path without navigating away. Use this when the user asks to load or study a specific guide.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      path: { type: Type.STRING, description: "The doc path, e.g. '/docs/foundations/05-linux-debug-playbook'" }
    },
    required: ["path"]
  }
};

export function useLiveAPI(onTranscriptUpdate?: (text: string) => void) {
  const { siteConfig } = useDocusaurusContext();
  const [active, setActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string>("");
  const [volume, setVolume] = useState(0);

  const audioContextRef = useRef<AudioContext | null>(null);
  const sessionRef = useRef<any>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const audioQueueRef = useRef<AudioBufferSourceNode[]>([]);
  const nextStartTimeRef = useRef<number>(0);
  const transcriptRef = useRef<string>("");  // always current, safe in closures

  // Helper: update both state and ref atomically
  const appendTranscript = useCallback((updater: (prev: string) => string) => {
    setTranscript(prev => {
      const next = updater(prev);
      transcriptRef.current = next;
      return next;
    });
  }, []);

  const stopAllAudio = useCallback(() => {
    audioQueueRef.current.forEach(node => {
      try { node.stop(); } catch(e) {}
    });
    audioQueueRef.current = [];
    nextStartTimeRef.current = 0;
  }, []);

  const stop = useCallback(() => {
    const session = sessionRef.current;
    sessionRef.current = null;
    if (session) {
      try { session.close(); } catch(e) {}
    }
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    clearInterval((sessionRef as any)?._saveInterval);
    stopAllAudio();
    // Final save on disconnect (ref is always current, no stale closure)
    if (transcriptRef.current) {
      localStorage.setItem(SESSION_KEY, JSON.stringify({
        transcript: transcriptRef.current,
        page: window.location.pathname,
        savedAt: Date.now(),
      }));
    }
    setActive(false);
    setIsConnecting(false);
  }, [stopAllAudio]);

  const saveSession = useCallback(() => {
    const t = transcriptRef.current;
    if (t) {
      localStorage.setItem(SESSION_KEY, JSON.stringify({
        transcript: t,
        page: window.location.pathname,
        savedAt: Date.now(),
      }));
    }
  }, []);

  const playPCMMessage = useCallback(async (base64: string) => {
    if (!audioContextRef.current) return;
    const ctx = audioContextRef.current;
    if (ctx.state === 'suspended') await ctx.resume();

    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const int16 = new Int16Array(bytes.buffer);
    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) {
      float32[i] = int16[i] / 32768;
    }

    const buffer = ctx.createBuffer(1, float32.length, OUTPUT_SAMPLE_RATE);
    buffer.getChannelData(0).set(float32);

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);

    const now = ctx.currentTime;
    if (nextStartTimeRef.current < now) {
      nextStartTimeRef.current = now + 0.15;
    }

    const startTime = nextStartTimeRef.current;
    source.start(startTime);
    nextStartTimeRef.current += buffer.duration;

    audioQueueRef.current.push(source);
    source.onended = () => {
      audioQueueRef.current = audioQueueRef.current.filter(n => n !== source);
    };
  }, []);

  const handleToolCall = useCallback(async (toolCall: any) => {
    const results: any[] = [];

    for (const fc of toolCall.functionCalls) {
      let responseData: any = { error: "Unknown tool" };

      if (fc.name === "read_current_page") {
        const content = document.querySelector('main')?.innerText || "No content found on current page.";
        responseData = { content: content.slice(0, 6000) };
      } else if (fc.name === "fetch_page") {
        try {
          const resp = await fetch(fc.args.path);
          const html = await resp.text();
          const parser = new DOMParser();
          const parsed = parser.parseFromString(html, 'text/html');
          const content = parsed.querySelector('article')?.innerText
            || parsed.querySelector('main')?.innerText
            || 'No content found.';
          responseData = { path: fc.args.path, content: content.slice(0, 6000) };
        } catch (e) {
          responseData = { error: `Failed to fetch ${fc.args.path}` };
        }
      }

      results.push({
        functionResponse: {
          name: fc.name,
          response: { result: responseData },
          id: fc.id
        }
      });
    }

    if (sessionRef.current && results.length > 0) {
      sessionRef.current.sendRealtimeInput({
        toolResponse: { functionResponses: results }
      });
    }
  }, []);

  const start = useCallback(async (systemInstruction: string) => {
    try {
      setError(null);
      setIsConnecting(true);
      nextStartTimeRef.current = 0;

      const apiKey = (
        (siteConfig.customFields?.geminiApiKey as string) ||
        (typeof localStorage !== 'undefined' && localStorage.getItem('GEMINI_API_KEY')) ||
        ''
      );

      if (!apiKey) {
        throw new Error("Gemini API Key missing. Add GEMINI_API_KEY to prep-portal/.env.local and restart npm start.");
      }

      // Load last session from localStorage
      let sessionContext = '';
      try {
        const raw = localStorage.getItem(SESSION_KEY);
        if (raw) {
          const saved = JSON.parse(raw);
          const { transcript: lastT, page: lastPage, savedAt } = saved;
          const minutesAgo = Math.round((Date.now() - savedAt) / 60000);
          if (lastT && lastT.length > 50) {
            const lastLines = lastT.split('\n').filter(Boolean).slice(-20).join('\n');
            setTranscript('[Resumed — ' + minutesAgo + 'm ago]\n' + lastT.slice(-2000));
            transcriptRef.current = lastT;
            sessionContext = `\n\nSESSION RESUME:
Interrupted ${minutesAgo} minutes ago on page: ${lastPage || 'unknown'}.
The EXACT last lines of conversation were:
"""
${lastLines}
"""
RULES:
- Do NOT re-introduce yourself.
- Do NOT say "last time we discussed X" unless X is literally in the lines above.
- Do NOT hallucinate or guess topics — only reference what is explicitly in the transcript above.
- Say exactly one sentence like "We got cut off — picking up where we left off." then continue from the last mentor line above.`;
          }
        }
      } catch (e) {
        // ignore parse errors
      }

      const ai = new GoogleGenAI({ apiKey });
      const session = await ai.live.connect({
        model: LIVE_MODEL,
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: systemInstruction + sessionContext,
          tools: [{ functionDeclarations: [declarationReadPage, declarationFetchPage] }],
          inputAudioTranscription: {},
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } },
          },
        },
        callbacks: {
          onopen: () => {
            setActive(true);
            setIsConnecting(false);
            // Save session every 10s in case of abrupt disconnect
            const saveInterval = setInterval(saveSession, 10000);
            (sessionRef as any)._saveInterval = saveInterval;
          },
          onmessage: async (message: any) => {
            if (message.serverContent?.interrupted) {
              stopAllAudio();
              return;
            }

            if (message.toolCall) {
              await handleToolCall(message.toolCall);
              return;
            }

            // Iterate ALL parts — audio chunks and text can be in any part
            const parts = message.serverContent?.modelTurn?.parts || [];
            for (const part of parts) {
              if (part.inlineData?.data) {
                playPCMMessage(part.inlineData.data);
              }
              if (part.text) {
                appendTranscript(prev => prev + " " + part.text);
              }
            }

            const userText = message.serverContent?.inputAudioTranscription?.text;
            if (userText) {
              appendTranscript(prev => prev + "\nYou: " + userText);
            }
          },
          onerror: (err: any) => {
            console.error("AI Error:", err);
            setError(String(err?.message || err || "Connection error."));
          },
          onclose: (event: any) => {
            const reason = event?.reason || event?.message || JSON.stringify(event) || "closed";
            console.error("[SREMentor] WebSocket closed:", reason, "code:", event?.code);
            if (reason && reason !== 'closed') setError(`Closed: ${reason}`);
            stop();
          }
        }
      });

      sessionRef.current = session;

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      mediaStreamRef.current = mediaStream;

      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: INPUT_SAMPLE_RATE });
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(mediaStream);
      const processor = audioContext.createScriptProcessor(BUFFER_SIZE, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        let sum = 0;
        for (let i = 0; i < inputData.length; i++) sum += Math.abs(inputData[i]);
        setVolume(sum / inputData.length);

        const pcmData = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          pcmData[i] = Math.max(-1, Math.min(1, inputData[i])) * 32767;
        }

        const base64Data = btoa(String.fromCharCode(...new Uint8Array(pcmData.buffer)));
        session.sendRealtimeInput({
          audio: { data: base64Data, mimeType: "audio/pcm;rate=16000" }
        });
      };

      source.connect(processor);
      processor.connect(audioContext.destination);

    } catch (err: any) {
      console.error("Failed to start Live API:", err);
      setError(err.message || "Failed to connect to AI.");
      setIsConnecting(false);
      stop();
    }
  }, [playPCMMessage, stopAllAudio, stop, onTranscriptUpdate, handleToolCall, siteConfig]);

  return { active, isConnecting, error, transcript, volume, start, stop };
}
