import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Gamepad2, Mic, PhoneOff } from 'lucide-react';
import { LampoMascot } from './LampoMascot';
import type {
  AppLanguage,
  GameId,
  LampoMood,
  LampoQuirk,
} from '../types/lesson';
import { UI_COPY } from '../i18n/translations';
import {
  playBase64AudioAndWait,
  stopActiveAudio,
  unlockAudioContext,
} from '../utils/audioPlayer';

interface LampoCompanionProps {
  language: AppLanguage;
  isMuted: boolean;
  onLaunchGame: (gameId: GameId) => void;
}

type LivePhase = 'idle' | 'listening' | 'thinking' | 'speaking';

const TARGET_SAMPLE_RATE = 16000;
const OUTPUT_SAMPLE_RATE = 24000;
const TRAILING_SILENCE_MS = 220;
const MAX_UTTERANCE_MS = 14000;
const PRE_ROLL_MS = 240;
const BARGE_IN_GRACE_MS = 320;

function downsampleToInt16(input: Float32Array, inputRate: number): Int16Array {
  if (inputRate <= TARGET_SAMPLE_RATE) {
    const out = new Int16Array(input.length);
    for (let i = 0; i < input.length; i++) {
      const s = Math.max(-1, Math.min(1, input[i]));
      out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return out;
  }
  const ratio = inputRate / TARGET_SAMPLE_RATE;
  const outLength = Math.max(1, Math.floor(input.length / ratio));
  const out = new Int16Array(outLength);
  for (let i = 0; i < outLength; i++) {
    const srcIdx = i * ratio;
    const idx0 = Math.floor(srcIdx);
    const idx1 = Math.min(input.length - 1, idx0 + 1);
    const frac = srcIdx - idx0;
    const sample = input[idx0] * (1 - frac) + input[idx1] * frac;
    const clamped = Math.max(-1, Math.min(1, sample));
    out[i] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
  }
  return out;
}

function int16ToBase64(pcm: Int16Array): string {
  const bytes = new Uint8Array(pcm.buffer, pcm.byteOffset, pcm.byteLength);
  let binary = '';
  const step = 0x8000;
  for (let i = 0; i < bytes.length; i += step) {
    binary += String.fromCharCode(...bytes.subarray(i, i + step));
  }
  return window.btoa(binary);
}

function base64Pcm16ToFloat32(base64: string): Float32Array {
  const binary = window.atob(base64);
  const numSamples = Math.floor(binary.length / 2);
  const out = new Float32Array(numSamples);
  for (let i = 0; i < numSamples; i++) {
    const lo = binary.charCodeAt(i * 2);
    const hi = binary.charCodeAt(i * 2 + 1);
    let val = (hi << 8) | lo;
    if (val >= 0x8000) val -= 0x10000;
    out[i] = val / 32768;
  }
  return out;
}

function encodePcmChunksToWavBase64(chunks: Int16Array[], sampleRate = TARGET_SAMPLE_RATE): string {
  let totalSamples = 0;
  for (const c of chunks) totalSamples += c.length;
  const dataByteLength = totalSamples * 2;
  const buffer = new ArrayBuffer(44 + dataByteLength);
  const view = new DataView(buffer);

  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + dataByteLength, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, dataByteLength, true);

  let offset = 44;
  for (const chunk of chunks) {
    for (let i = 0; i < chunk.length; i++) {
      view.setInt16(offset, chunk[i], true);
      offset += 2;
    }
  }

  const bytes = new Uint8Array(buffer);
  let binary = '';
  const step = 0x8000;
  for (let i = 0; i < bytes.length; i += step) {
    binary += String.fromCharCode(...bytes.subarray(i, i + step));
  }
  return window.btoa(binary);
}

export const LampoCompanion: React.FC<LampoCompanionProps> = ({
  language,
  isMuted,
  onLaunchGame,
}) => {
  const copy = UI_COPY[language];

  const [isLiveCall, setIsLiveCall] = useState(false);
  const [phase, setPhase] = useState<LivePhase>('idle');
  const [micLevel, setMicLevel] = useState(0);
  const [mascotSize, setMascotSize] = useState(() =>
    typeof window !== 'undefined' && window.innerWidth < 640 ? 172 : 212
  );
  const [permissionNotice, setPermissionNotice] = useState<string | null>(null);
  const [suggestedGame, setSuggestedGame] = useState<GameId | undefined>(undefined);

  const [mood, setMood] = useState<LampoMood>('happy');
  const [quirk, setQuirk] = useState<LampoQuirk>('none');
  const [quirkKey, setQuirkKey] = useState(0);
  const [annoyanceLevel, setAnnoyanceLevel] = useState(0);

  const mountedRef = useRef(true);
  const callActiveRef = useRef(false);
  const phaseRef = useRef<LivePhase>('idle');
  phaseRef.current = phase;
  const languageRef = useRef(language);
  languageRef.current = language;
  const isMutedRef = useRef(isMuted);
  isMutedRef.current = isMuted;
  const annoyanceRef = useRef(annoyanceLevel);
  annoyanceRef.current = annoyanceLevel;

  const historyRef = useRef<Array<{ role: 'user' | 'lampo'; text: string }>>([
    { role: 'lampo', text: copy.chatWelcome },
  ]);

  const streamRef = useRef<MediaStream | null>(null);
  const vadCtxRef = useRef<AudioContext | null>(null);
  const outAudioCtxRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const silentGainRef = useRef<GainNode | null>(null);

  // Realtime WebSocket Live API refs
  const liveWsRef = useRef<WebSocket | null>(null);
  const wsLiveReadyRef = useRef(false);
  const greetingFinishedRef = useRef(false);
  const activeLiveSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const nextPlayTimeRef = useRef(0);
  const liveTurnCompletePendingRef = useRef(false);

  // Fallback HTTP stream refs
  const turnTokenRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const audioQueueRef = useRef<Array<{ audioBase64: string; mimeType: string }>>([]);
  const isDrainingQueueRef = useRef(false);
  const streamFinishedRef = useRef(true);
  const speechStartedAtRef = useRef(0);
  const resetUtteranceRef = useRef<() => void>(() => {});

  const greetingCacheRef = useRef<
    Map<AppLanguage, { audioBase64: string; mimeType: string }>
  >(new Map());

  const setLivePhase = useCallback((next: LivePhase) => {
    phaseRef.current = next;
    if (mountedRef.current) {
      setPhase(next);
    }
  }, []);

  useEffect(() => {
    const onResize = () => {
      setMascotSize(window.innerWidth < 640 ? 172 : 212);
    };
    window.addEventListener('resize', onResize, { passive: true });
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (historyRef.current.length <= 1) {
      historyRef.current = [{ role: 'lampo', text: UI_COPY[language].chatWelcome }];
    }
    if (!isMuted && !greetingCacheRef.current.has(language)) {
      let cancelled = false;
      fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: UI_COPY[language].chatWelcome,
          language,
          voice: 'Kore',
          mood: 'happy',
        }),
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (!cancelled && data?.audioBase64) {
            greetingCacheRef.current.set(language, {
              audioBase64: data.audioBase64,
              mimeType: data.mimeType || 'audio/mpeg',
            });
          }
        })
        .catch(() => {});
      return () => {
        cancelled = true;
      };
    }
  }, [language, isMuted]);

  const stopLivePcmPlayback = useCallback(() => {
    Array.from(activeLiveSourcesRef.current).forEach((src) => {
      try {
        src.onended = null;
        src.stop();
        src.disconnect();
      } catch {
        // ignore
      }
    });
    activeLiveSourcesRef.current.clear();
    nextPlayTimeRef.current = 0;
    liveTurnCompletePendingRef.current = false;
  }, []);

  const abortInFlightTurn = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    audioQueueRef.current = [];
    streamFinishedRef.current = true;
    stopActiveAudio();
    stopLivePcmPlayback();
  }, [stopLivePcmPlayback]);

  const stopLiveCall = useCallback(() => {
    callActiveRef.current = false;
    wsLiveReadyRef.current = false;
    greetingFinishedRef.current = false;
    turnTokenRef.current += 1;
    abortInFlightTurn();

    if (liveWsRef.current) {
      try {
        liveWsRef.current.onopen = null;
        liveWsRef.current.onmessage = null;
        liveWsRef.current.onerror = null;
        liveWsRef.current.onclose = null;
        liveWsRef.current.close();
      } catch {
        // ignore
      }
      liveWsRef.current = null;
    }

    if (processorRef.current) {
      try {
        processorRef.current.onaudioprocess = null;
        processorRef.current.disconnect();
      } catch {
        // ignore
      }
      processorRef.current = null;
    }
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.disconnect();
      } catch {
        // ignore
      }
      sourceNodeRef.current = null;
    }
    if (silentGainRef.current) {
      try {
        silentGainRef.current.disconnect();
      } catch {
        // ignore
      }
      silentGainRef.current = null;
    }
    if (vadCtxRef.current) {
      try {
        void vadCtxRef.current.close();
      } catch {
        // ignore
      }
      vadCtxRef.current = null;
    }
    if (outAudioCtxRef.current) {
      try {
        void outAudioCtxRef.current.close();
      } catch {
        // ignore
      }
      outAudioCtxRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    if (mountedRef.current) {
      setIsLiveCall(false);
      setLivePhase('idle');
      setMicLevel(0);
    }
  }, [abortInFlightTurn, setLivePhase]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      stopLiveCall();
    };
  }, [stopLiveCall]);

  const scheduleLivePcm24k = useCallback(
    (base64Pcm: string) => {
      if (isMutedRef.current || !callActiveRef.current) return;
      const outCtx = outAudioCtxRef.current;
      if (!outCtx) return;

      if (outCtx.state === 'suspended') {
        void outCtx.resume().catch(() => {});
      }

      const floats = base64Pcm16ToFloat32(base64Pcm);
      if (!floats.length) return;

      const audioBuf = outCtx.createBuffer(1, floats.length, OUTPUT_SAMPLE_RATE);
      audioBuf.getChannelData(0).set(floats);

      const src = outCtx.createBufferSource();
      src.buffer = audioBuf;
      src.connect(outCtx.destination);

      const now = outCtx.currentTime;
      const startAt = Math.max(now + 0.018, nextPlayTimeRef.current);
      nextPlayTimeRef.current = startAt + audioBuf.duration;

      activeLiveSourcesRef.current.add(src);
      liveTurnCompletePendingRef.current = false;
      setLivePhase('speaking');

      src.onended = () => {
        activeLiveSourcesRef.current.delete(src);
        if (
          activeLiveSourcesRef.current.size === 0 &&
          liveTurnCompletePendingRef.current &&
          mountedRef.current &&
          callActiveRef.current
        ) {
          liveTurnCompletePendingRef.current = false;
          nextPlayTimeRef.current = 0;
          setLivePhase('listening');
        }
      };

      try {
        src.start(startAt);
      } catch {
        activeLiveSourcesRef.current.delete(src);
      }
    },
    [setLivePhase]
  );

  const openRealtimeLiveSocket = useCallback(
    (lang: AppLanguage) => {
      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${proto}//${window.location.host}/ws/live?lang=${lang}`);
      liveWsRef.current = ws;

      ws.onmessage = (event) => {
        if (!mountedRef.current || !callActiveRef.current || liveWsRef.current !== ws) return;
        let msg: Record<string, unknown>;
        try {
          msg = JSON.parse(String(event.data || '{}')) as Record<string, unknown>;
        } catch {
          return;
        }

        if (msg.type === 'ready') {
          wsLiveReadyRef.current = true;
          return;
        }

        if (msg.type === 'fallback') {
          wsLiveReadyRef.current = false;
          try {
            ws.close();
          } catch {
            // ignore
          }
          if (liveWsRef.current === ws) liveWsRef.current = null;
          return;
        }

        if (msg.type === 'audio' && typeof msg.data === 'string') {
          scheduleLivePcm24k(msg.data);
          return;
        }

        if (msg.type === 'emotion') {
          if (typeof msg.mood === 'string') {
            setMood(msg.mood as LampoMood);
          }
          if (typeof msg.quirk === 'string') {
            setQuirk(msg.quirk as LampoQuirk);
            setQuirkKey((k) => k + 1);
          }
          if (typeof msg.annoyanceLevel === 'number') {
            setAnnoyanceLevel(msg.annoyanceLevel);
          }
          if (typeof msg.suggestedGame === 'string') {
            setSuggestedGame(msg.suggestedGame as GameId);
          } else if (msg.suggestedGame === undefined) {
            setSuggestedGame(undefined);
          }
          return;
        }

        if (msg.type === 'interrupted') {
          stopLivePcmPlayback();
          if (greetingFinishedRef.current) {
            setLivePhase('listening');
          }
          return;
        }

        if (msg.type === 'turnComplete') {
          liveTurnCompletePendingRef.current = true;
          if (activeLiveSourcesRef.current.size === 0 && greetingFinishedRef.current) {
            nextPlayTimeRef.current = 0;
            setLivePhase('listening');
          }
        }
      };

      ws.onerror = () => {
        wsLiveReadyRef.current = false;
      };

      ws.onclose = () => {
        wsLiveReadyRef.current = false;
        if (liveWsRef.current === ws) {
          liveWsRef.current = null;
        }
      };
    },
    [scheduleLivePcm24k, setLivePhase, stopLivePcmPlayback]
  );

  const drainAudioQueue = useCallback(
    async (token: number) => {
      if (isDrainingQueueRef.current) return;
      isDrainingQueueRef.current = true;

      try {
        while (mountedRef.current && callActiveRef.current && turnTokenRef.current === token) {
          const nextClip = audioQueueRef.current.shift();
          if (!nextClip) {
            if (streamFinishedRef.current) {
              break;
            }
            await new Promise((r) => setTimeout(r, 25));
            continue;
          }

          if (isMutedRef.current) {
            audioQueueRef.current = [];
            break;
          }

          setLivePhase('speaking');
          speechStartedAtRef.current = Date.now();
          const status = await playBase64AudioAndWait(
            nextClip.audioBase64,
            nextClip.mimeType,
            () => {
              if (mountedRef.current && turnTokenRef.current === token) {
                setLivePhase('speaking');
                speechStartedAtRef.current = Date.now();
              }
            }
          );

          if (status === 'stopped' || turnTokenRef.current !== token) {
            break;
          }
        }
      } finally {
        isDrainingQueueRef.current = false;
        greetingFinishedRef.current = true;
        if (mountedRef.current && callActiveRef.current && turnTokenRef.current === token) {
          resetUtteranceRef.current();
          if (activeLiveSourcesRef.current.size === 0) {
            setLivePhase('listening');
          }
        }
      }
    },
    [setLivePhase]
  );

  const speakTextViaTts = useCallback(
    async (text: string, expectedToken: number, voiceMood: LampoMood = 'happy') => {
      if (isMutedRef.current || !text.trim()) {
        greetingFinishedRef.current = true;
        if (mountedRef.current && callActiveRef.current && turnTokenRef.current === expectedToken) {
          setLivePhase('listening');
        }
        return;
      }
      try {
        const res = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text,
            language: languageRef.current,
            voice: 'Kore',
            mood: voiceMood,
          }),
        });
        if (!mountedRef.current || turnTokenRef.current !== expectedToken) return;
        if (!res.ok) {
          greetingFinishedRef.current = true;
          setLivePhase(callActiveRef.current ? 'listening' : 'idle');
          return;
        }
        const data = await res.json();
        if (!mountedRef.current || turnTokenRef.current !== expectedToken) return;
        if (data?.audioBase64) {
          streamFinishedRef.current = true;
          audioQueueRef.current.push({
            audioBase64: data.audioBase64,
            mimeType: data.mimeType || 'audio/mpeg',
          });
          await drainAudioQueue(expectedToken);
        } else {
          greetingFinishedRef.current = true;
          setLivePhase(callActiveRef.current ? 'listening' : 'idle');
        }
      } catch {
        greetingFinishedRef.current = true;
        if (mountedRef.current && turnTokenRef.current === expectedToken) {
          setLivePhase(callActiveRef.current ? 'listening' : 'idle');
        }
      }
    },
    [drainAudioQueue, setLivePhase]
  );

  const submitVoiceWav = useCallback(
    async (wavBase64: string, token: number) => {
      if (!mountedRef.current || !callActiveRef.current || turnTokenRef.current !== token) {
        return;
      }

      abortInFlightTurn();
      const controller = new AbortController();
      abortControllerRef.current = controller;
      streamFinishedRef.current = false;
      setLivePhase('thinking');

      try {
        const res = await fetch('/api/voice-turn-stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            audioBase64: wavBase64,
            mimeType: 'audio/wav',
            history: historyRef.current.slice(-4),
            language: languageRef.current,
            annoyanceLevel: annoyanceRef.current,
            wantAudio: !isMutedRef.current,
          }),
        });

        if (!res.ok || !res.body) {
          throw new Error(`HTTP ${res.status}`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let gotAnyAudio = false;
        let wasSilent = false;

        const handleEvent = (line: string) => {
          const trimmed = line.trim();
          if (!trimmed) return;
          let ev: Record<string, unknown>;
          try {
            ev = JSON.parse(trimmed) as Record<string, unknown>;
          } catch {
            return;
          }

          if (turnTokenRef.current !== token || !callActiveRef.current || !mountedRef.current) {
            return;
          }

          if (ev.type === 'silent' || ev.silent === true) {
            wasSilent = true;
            streamFinishedRef.current = true;
            if (!gotAnyAudio) {
              setLivePhase('listening');
            }
            return;
          }

          if (ev.type === 'meta') {
            const nextMood = (ev.mood as LampoMood) || 'playful';
            const nextQuirk = (ev.quirk as LampoQuirk) || 'bounce';
            const delta = Number(ev.annoyanceDelta) || 0;
            const nextAnnoy = Math.max(0, Math.min(8, annoyanceRef.current + delta));

            setMood(nextMood);
            setQuirk(nextQuirk);
            setQuirkKey((k) => k + 1);
            setAnnoyanceLevel(nextAnnoy);
            setSuggestedGame(ev.suggestedGame as GameId | undefined);
            return;
          }

          if (ev.type === 'audio' && typeof ev.audioBase64 === 'string') {
            gotAnyAudio = true;
            audioQueueRef.current.push({
              audioBase64: ev.audioBase64,
              mimeType: String(ev.mimeType || 'audio/mpeg'),
            });
            void drainAudioQueue(token);
            return;
          }

          if (ev.type === 'done') {
            const replyText = String(ev.reply || '').trim();
            if (replyText) {
              historyRef.current = [
                ...historyRef.current.slice(-6),
                { role: 'lampo', text: replyText },
              ];
            }
            streamFinishedRef.current = true;
            if (!gotAnyAudio) {
              setLivePhase('listening');
            }
            return;
          }

          if (ev.type === 'error') {
            throw new Error(String(ev.error || 'Voice stream error'));
          }
        };

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          if (turnTokenRef.current !== token || !callActiveRef.current) {
            void reader.cancel().catch(() => {});
            return;
          }
          buffer += decoder.decode(value, { stream: true });
          let newlineIdx = buffer.indexOf('\n');
          while (newlineIdx !== -1) {
            const line = buffer.slice(0, newlineIdx);
            buffer = buffer.slice(newlineIdx + 1);
            handleEvent(line);
            newlineIdx = buffer.indexOf('\n');
          }
        }

        if (buffer.trim()) {
          handleEvent(buffer);
        }
        streamFinishedRef.current = true;

        if (wasSilent && !gotAnyAudio && turnTokenRef.current === token && callActiveRef.current) {
          setLivePhase('listening');
        }
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') return;
        streamFinishedRef.current = true;
        if (!mountedRef.current || !callActiveRef.current || turnTokenRef.current !== token) {
          return;
        }
        setMood('curious');
        setQuirk('wiggle');
        setQuirkKey((k) => k + 1);
        await speakTextViaTts(UI_COPY[languageRef.current].liveReconnectLine, token, 'curious');
      } finally {
        if (abortControllerRef.current === controller) {
          abortControllerRef.current = null;
        }
      }
    },
    [abortInFlightTurn, drainAudioQueue, setLivePhase, speakTextViaTts]
  );

  const attachLiveVadProcessor = useCallback(
    (vadCtx: AudioContext, stream: MediaStream) => {
      const source = vadCtx.createMediaStreamSource(stream);
      const processor = vadCtx.createScriptProcessor(1024, 1, 1);
      const silentGain = vadCtx.createGain();
      silentGain.gain.value = 0;

      source.connect(processor);
      processor.connect(silentGain);
      silentGain.connect(vadCtx.destination);

      sourceNodeRef.current = source;
      processorRef.current = processor;
      silentGainRef.current = silentGain;

      const maxPreRollChunks = Math.max(
        2,
        Math.ceil((PRE_ROLL_MS / 1000) * (vadCtx.sampleRate / 1024))
      );
      let preRoll: Int16Array[] = [];
      let speechChunks: Int16Array[] = [];
      let speechActive = false;
      let speechStartedAt = 0;
      let lastSpeechAt = 0;
      let noiseFloor = 0.0035;
      let bargeInStreak = 0;

      resetUtteranceRef.current = () => {
        speechActive = false;
        speechChunks = [];
        preRoll = [];
        bargeInStreak = 0;
        if (mountedRef.current) setMicLevel(0);
      };

      processor.onaudioprocess = (event) => {
        if (!mountedRef.current || !callActiveRef.current) return;

        const input = event.inputBuffer.getChannelData(0);
        let sum = 0;
        for (let i = 0; i < input.length; i++) {
          sum += input[i] * input[i];
        }
        const rms = Math.sqrt(sum / input.length);
        const now = Date.now();
        const pcm = downsampleToInt16(input, vadCtx.sampleRate);

        // Primary Ultra-Low-Latency Path: continuous 16kHz PCM stream to Gemini Live WebSocket
        const ws = liveWsRef.current;
        if (wsLiveReadyRef.current && ws && ws.readyState === WebSocket.OPEN) {
          if (!greetingFinishedRef.current) {
            return;
          }
          setMicLevel(
            phaseRef.current === 'listening'
              ? Math.min(1, Math.max(0, (rms - 0.0015) * 28))
              : 0
          );
          ws.send(JSON.stringify({ type: 'audio', data: int16ToBase64(pcm) }));
          return;
        }

        // Fallback HTTP Streaming Path (if WebSocket Live unavailable)
        const curPhase = phaseRef.current;
        if (curPhase === 'speaking') {
          setMicLevel(0);
          if (now - speechStartedAtRef.current < BARGE_IN_GRACE_MS) {
            return;
          }
          const bargeThreshold = Math.max(0.022, noiseFloor * 3.8);
          if (rms > bargeThreshold) {
            bargeInStreak += 1;
            if (bargeInStreak >= 3) {
              bargeInStreak = 0;
              turnTokenRef.current += 1;
              abortInFlightTurn();
              setLivePhase('listening');
              speechActive = true;
              speechStartedAt = now;
              lastSpeechAt = now;
              speechChunks = [...preRoll, pcm];
              preRoll = [];
            }
          } else {
            bargeInStreak = 0;
            preRoll.push(pcm);
            if (preRoll.length > maxPreRollChunks) preRoll.shift();
          }
          return;
        }

        if (curPhase !== 'listening') {
          bargeInStreak = 0;
          setMicLevel(0);
          return;
        }

        setMicLevel(Math.min(1, Math.max(0, (rms - 0.0015) * 28)));

        if (rms < 0.012 && !speechActive) {
          noiseFloor = Math.max(0.002, Math.min(0.0085, noiseFloor * 0.92 + rms * 0.08));
        }

        const speechThreshold = Math.max(0.004, noiseFloor * 1.85);

        if (rms > speechThreshold) {
          if (!speechActive) {
            speechActive = true;
            speechStartedAt = now;
            speechChunks = [...preRoll, pcm];
            preRoll = [];
          } else {
            speechChunks.push(pcm);
          }
          lastSpeechAt = now;
        } else if (speechActive) {
          speechChunks.push(pcm);
          if (
            now - lastSpeechAt >= TRAILING_SILENCE_MS ||
            now - speechStartedAt >= MAX_UTTERANCE_MS
          ) {
            const captured = speechChunks;
            const durationMs = now - speechStartedAt;
            speechActive = false;
            speechChunks = [];
            preRoll = [];
            setMicLevel(0);

            if (durationMs >= 160 && captured.length > 0) {
              const wavB64 = encodePcmChunksToWavBase64(captured, TARGET_SAMPLE_RATE);
              const token = ++turnTokenRef.current;
              void submitVoiceWav(wavB64, token);
            }
          }
        } else {
          preRoll.push(pcm);
          if (preRoll.length > maxPreRollChunks) {
            preRoll.shift();
          }
        }
      };
    },
    [abortInFlightTurn, setLivePhase, submitVoiceWav]
  );

  const startLiveCall = useCallback(async () => {
    setPermissionNotice(null);
    stopActiveAudio();
    stopLivePcmPlayback();
    greetingFinishedRef.current = false;
    wsLiveReadyRef.current = false;

    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;

    // Unlock BOTH persistent HTMLAudioElement and dedicated 24kHz speaker AudioContext
    // strictly inside user click gesture BEFORE calling getUserMedia
    await unlockAudioContext();
    let outCtx: AudioContext | null = null;
    if (AudioCtx) {
      try {
        outCtx = new AudioCtx({ sampleRate: OUTPUT_SAMPLE_RATE });
        if (outCtx.state === 'suspended') {
          await outCtx.resume();
        }
        const silentBuf = outCtx.createBuffer(1, 1, OUTPUT_SAMPLE_RATE);
        const s = outCtx.createBufferSource();
        s.buffer = silentBuf;
        s.connect(outCtx.destination);
        s.start(0);
      } catch {
        outCtx = null;
      }
    }

    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices?.getUserMedia ||
      !AudioCtx
    ) {
      if (outCtx) {
        try { void outCtx.close(); } catch {}
      }
      setMood('sad');
      setPermissionNotice(UI_COPY[languageRef.current].micPermissionError);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      if (!mountedRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        if (outCtx) {
          try { void outCtx.close(); } catch {}
        }
        return;
      }

      // Dedicated separate AudioContext strictly for mic capture (never shares speaker outCtx)
      const vadCtx = new AudioCtx();
      if (vadCtx.state === 'suspended') {
        await vadCtx.resume();
      }

      streamRef.current = stream;
      vadCtxRef.current = vadCtx;
      outAudioCtxRef.current = outCtx;
      nextPlayTimeRef.current = 0;

      callActiveRef.current = true;
      setIsLiveCall(true);
      setMood('happy');
      setQuirk('bounce');
      setQuirkKey((k) => k + 1);

      // Connect Gemini Live WebSocket immediately while cached welcome plays
      const currentLang = languageRef.current;
      openRealtimeLiveSocket(currentLang);
      attachLiveVadProcessor(vadCtx, stream);

      const token = ++turnTokenRef.current;
      const greeting = UI_COPY[currentLang].chatWelcome;

      if (!isMutedRef.current) {
        setLivePhase('speaking');
        speechStartedAtRef.current = Date.now();
        const cachedGreeting = greetingCacheRef.current.get(currentLang);
        if (cachedGreeting) {
          streamFinishedRef.current = true;
          audioQueueRef.current.push(cachedGreeting);
          await drainAudioQueue(token);
        } else {
          await speakTextViaTts(greeting, token, 'happy');
        }
      } else {
        greetingFinishedRef.current = true;
        setLivePhase('listening');
      }
    } catch {
      if (outCtx) {
        try { void outCtx.close(); } catch {}
      }
      setMood('sad');
      setPermissionNotice(UI_COPY[languageRef.current].micPermissionError);
    }
  }, [
    attachLiveVadProcessor,
    drainAudioQueue,
    openRealtimeLiveSocket,
    setLivePhase,
    speakTextViaTts,
    stopLivePcmPlayback,
  ]);

  const haloScale =
    phase === 'listening'
      ? 1 + micLevel * 0.24
      : phase === 'speaking'
        ? 1.08
        : 1;

  const haloBorderClass =
    mood === 'annoyed'
      ? 'border-rose-400/60 bg-rose-500/12 shadow-[0_0_95px_rgba(244,63,94,0.28)]'
      : mood === 'sad'
        ? 'border-indigo-400/50 bg-indigo-500/10 shadow-[0_0_85px_rgba(99,102,241,0.22)]'
        : mood === 'surprised'
          ? 'border-amber-400/60 bg-amber-500/12 shadow-[0_0_95px_rgba(251,191,36,0.26)]'
          : mood === 'excited' || mood === 'proud'
            ? 'border-amber-300/55 bg-sky-500/12 shadow-[0_0_95px_rgba(251,191,36,0.22)]'
            : phase === 'speaking'
              ? 'border-sky-400/65 bg-sky-500/14 shadow-[0_0_95px_rgba(56,189,248,0.3)]'
              : phase === 'listening'
                ? 'border-emerald-400/60 bg-emerald-500/12 shadow-[0_0_90px_rgba(16,185,129,0.26)]'
                : 'border-slate-700/60 bg-sky-500/5 shadow-[0_0_75px_rgba(56,189,248,0.14)]';

  const statusLabel =
    permissionNotice ||
    (phase === 'listening'
      ? copy.liveListening
      : phase === 'thinking'
        ? copy.liveThinking
        : phase === 'speaking'
          ? copy.liveSpeaking
          : copy.liveReadyHint);

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col items-center justify-center gap-7 py-3">
      {/* Huge Centered Emotional Voice-Only Lampo */}
      <div className="relative flex flex-col items-center justify-center">
        <div
          className={`relative flex items-center justify-center rounded-full border-2 transition-all duration-200 ${haloBorderClass}`}
          style={{
            width: mascotSize + 62,
            height: mascotSize + 62,
            transform: `scale(${haloScale.toFixed(3)})`,
          }}
        >
          {phase === 'listening' && (
            <span
              className="pointer-events-none absolute inset-0 rounded-full border border-emerald-400/40 animate-ping"
              style={{ animationDuration: '2s' }}
              aria-hidden="true"
            />
          )}
          <div className="animate-lampo-float">
            <LampoMascot
              size={mascotSize}
              mood={mood}
              quirk={quirk}
              quirkKey={quirkKey}
              isSpeaking={phase === 'speaking'}
              isThinking={false}
              trackMouse={true}
            />
          </div>
        </div>

        <p className="mt-4 text-xs font-semibold tracking-wide text-slate-400 text-center">
          {statusLabel}
        </p>
      </div>

      {suggestedGame && (
        <button
          type="button"
          onClick={() => {
            stopLiveCall();
            onLaunchGame(suggestedGame);
          }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold transition-colors"
        >
          <Gamepad2 className="w-4 h-4" />
          <span>
            {copy.playSuggestedGame}: {copy.gameTitles[suggestedGame]}
          </span>
        </button>
      )}

      {/* Primary Centered Start / Stop Live Conversation Button */}
      <div className="flex flex-col items-center">
        {!isLiveCall ? (
          <button
            type="button"
            onClick={() => void startLiveCall()}
            className="inline-flex items-center gap-2.5 px-8 py-4 rounded-full bg-sky-500 hover:bg-sky-400 active:scale-[0.98] text-slate-950 text-sm sm:text-base font-bold transition-all shadow-[0_0_36px_rgba(56,189,248,0.38)]"
          >
            <Mic className="w-5 h-5" />
            <span>{copy.liveStartBtn}</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={stopLiveCall}
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-[#192338] hover:bg-rose-950/75 border border-slate-700 hover:border-rose-500/60 text-slate-100 text-sm font-semibold transition-all"
          >
            <PhoneOff className="w-4 h-4 text-rose-400" />
            <span>{copy.liveStopBtn}</span>
          </button>
        )}
      </div>
    </div>
  );
};
