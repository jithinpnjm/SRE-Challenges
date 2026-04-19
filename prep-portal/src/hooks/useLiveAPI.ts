import { useState, useCallback, useRef, useEffect } from "react";
import { GoogleGenAI, Modality, Type } from "@google/genai";
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import { db, auth } from '../lib/firebase';
import { collection, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';

const LIVE_MODEL = "gemini-2.5-flash-native-audio-latest";
const INPUT_SAMPLE_RATE = 16000;
const OUTPUT_SAMPLE_RATE = 24000;
const BUFFER_SIZE = 4096;

const declarationNavigate = {
  name: "navigate_to",
  description: "Navigate the user to a specific path in the documentation.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      path: { type: Type.STRING, description: "The relative path to navigate to, e.g. '/docs/foundations/README'" }
    },
    required: ["path"]
  }
};

const declarationReadPage = {
  name: "read_current_page",
  description: "Reads the text content of the page the user is currently viewing.",
  parameters: { type: Type.OBJECT, properties: {} }
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
  const sessionIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (active && transcript && sessionIdRef.current) {
      const timer = setTimeout(async () => {
        try {
          const sessionDoc = doc(db, 'sessions', sessionIdRef.current!);
          await updateDoc(sessionDoc, {
            transcript,
            updatedAt: serverTimestamp()
          });
        } catch (e) {
          console.error("Failed to sync session:", e);
        }
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [transcript, active]);

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
    stopAllAudio();
    setActive(false);
    setIsConnecting(false);
    sessionIdRef.current = null;
  }, [stopAllAudio]);

  const playPCMMessage = useCallback(async (base64: string) => {
    if (!audioContextRef.current) return;
    const ctx = audioContextRef.current;

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

      if (fc.name === "navigate_to") {
        window.location.href = fc.args.path;
        responseData = { success: true, navigatedTo: fc.args.path };
      } else if (fc.name === "read_current_page") {
        const content = document.querySelector('main')?.innerText || "No content found on current page.";
        responseData = { content: content.slice(0, 5000) };
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

      console.log("[SREMentor] API key present:", !!apiKey, "| Model:", LIVE_MODEL);

      if (!apiKey) {
        throw new Error("Gemini API Key missing. Add GEMINI_API_KEY to prep-portal/.env.local and restart npm start.");
      }

      const ai = new GoogleGenAI({ apiKey });
      const session = await ai.live.connect({
        model: LIVE_MODEL,
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction,
          tools: [{ functionDeclarations: [declarationNavigate, declarationReadPage] }],
          inputAudioTranscription: {},
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Puck" } },
          },
        },
        callbacks: {
          onopen: async () => {
            setActive(true);
            setIsConnecting(false);

            try {
              const docRef = await addDoc(collection(db, 'sessions'), {
                userId: auth.currentUser?.uid || 'anonymous',
                repoName: 'SRE-Challenges',
                transcript: '',
                createdAt: serverTimestamp()
              });
              sessionIdRef.current = docRef.id;
            } catch (e) {
              console.warn("Session logging disabled:", e);
            }
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

            const audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audio) playPCMMessage(audio);

            const text = message.serverContent?.modelTurn?.parts?.[0]?.text;
            if (text) {
              setTranscript(prev => {
                const updated = prev + " " + text;
                if (onTranscriptUpdate) onTranscriptUpdate(updated);
                return updated;
              });
            }

            const userText = message.serverContent?.inputAudioTranscription?.text;
            if (userText) {
              setTranscript(prev => prev + "\nYou: " + userText);
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
