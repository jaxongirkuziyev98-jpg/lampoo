import { useState, useRef, useEffect, useCallback } from 'react';
import type { AppLanguage } from '../types/lesson';
import { UI_COPY } from '../i18n/translations';
import { unlockAudioContext } from '../utils/audioPlayer';

interface UseVoiceRecorderOptions {
  language: AppLanguage;
  onBeforeStart?: () => void;
  onTranscript: (text: string) => void;
}

function pickSupportedMimeType(): string {
  if (typeof MediaRecorder === 'undefined') return '';
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/ogg;codecs=opus',
  ];
  for (const mime of candidates) {
    if (MediaRecorder.isTypeSupported(mime)) {
      return mime;
    }
  }
  return '';
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      const commaIdx = result.indexOf(',');
      resolve(commaIdx >= 0 ? result.slice(commaIdx + 1) : result);
    };
    reader.onerror = () => reject(new Error('Failed to read audio blob'));
    reader.readAsDataURL(blob);
  });
}

export function useVoiceRecorder({
  language,
  onBeforeStart,
  onTranscript,
}: UseVoiceRecorderOptions) {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [voiceError, setVoiceError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<number | null>(null);
  const vadIntervalRef = useRef<number | null>(null);
  const vadCtxRef = useRef<AudioContext | null>(null);
  const mountedRef = useRef(true);
  const onTranscriptRef = useRef(onTranscript);
  onTranscriptRef.current = onTranscript;
  const languageRef = useRef(language);
  languageRef.current = language;

  const stopTracksAndTimers = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (vadIntervalRef.current !== null) {
      window.clearInterval(vadIntervalRef.current);
      vadIntervalRef.current = null;
    }
    if (vadCtxRef.current) {
      try {
        void vadCtxRef.current.close();
      } catch {
        // ignore
      }
      vadCtxRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      try {
        if (recorderRef.current && recorderRef.current.state !== 'inactive') {
          recorderRef.current.stop();
        }
      } catch {
        // ignore
      }
      stopTracksAndTimers();
    };
  }, [stopTracksAndTimers]);

  const stopRecording = useCallback(() => {
    const rec = recorderRef.current;
    if (rec && rec.state !== 'inactive') {
      try {
        rec.stop();
      } catch {
        stopTracksAndTimers();
        setIsRecording(false);
      }
    }
  }, [stopTracksAndTimers]);

  const startRecording = useCallback(async () => {
    const copy = UI_COPY[languageRef.current];
    setVoiceError(null);
    void unlockAudioContext();
    onBeforeStart?.();

    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === 'undefined'
    ) {
      setVoiceError(copy.micPermissionError);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!mountedRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      streamRef.current = stream;
      chunksRef.current = [];
      const mimeType = pickSupportedMimeType();
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      recorderRef.current = recorder;

      // Track whether speech was actually heard before auto-stopping on silence
      let speechDetected = false;
      let startedAt = Date.now();
      let lastSpeechAt = Date.now();
      let noiseSamples: number[] = [];
      let noiseFloor = 0.008;

      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) {
          chunksRef.current.push(ev.data);
        }
      };

      recorder.onstop = async () => {
        stopTracksAndTimers();
        if (!mountedRef.current) return;
        setIsRecording(false);

        const actualMime = recorder.mimeType || mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: actualMime });
        chunksRef.current = [];

        if (!speechDetected && Date.now() - startedAt > 5500) {
          setVoiceError(UI_COPY[languageRef.current].micEmptyError);
          return;
        }

        if (blob.size < 400) {
          setVoiceError(UI_COPY[languageRef.current].micEmptyError);
          return;
        }

        setIsTranscribing(true);
        try {
          const audioBase64 = await blobToBase64(blob);
          const res = await fetch('/api/transcribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              audioBase64,
              mimeType: actualMime,
              language: languageRef.current,
            }),
          });
          const data = await res.json();
          if (!mountedRef.current) return;

          if (!res.ok) {
            throw new Error(
              typeof data?.error === 'string'
                ? data.error
                : UI_COPY[languageRef.current].micEmptyError
            );
          }

          const transcript = typeof data?.text === 'string' ? data.text.trim() : '';
          if (!transcript) {
            setVoiceError(UI_COPY[languageRef.current].micEmptyError);
            return;
          }
          onTranscriptRef.current(transcript);
        } catch (err) {
          if (!mountedRef.current) return;
          setVoiceError(
            err instanceof Error
              ? err.message
              : UI_COPY[languageRef.current].micEmptyError
          );
        } finally {
          if (mountedRef.current) {
            setIsTranscribing(false);
          }
        }
      };

      // Setup automatic Voice Activity & Silence Detection (VAD) so user never has to click Stop
      try {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext?: typeof AudioContext })
            .webkitAudioContext;
        if (AudioCtx) {
          const vadCtx = new AudioCtx();
          vadCtxRef.current = vadCtx;
          if (vadCtx.state === 'suspended') {
            await vadCtx.resume();
          }
          const source = vadCtx.createMediaStreamSource(stream);
          const analyser = vadCtx.createAnalyser();
          analyser.fftSize = 1024;
          source.connect(analyser);
          const dataBuf = new Float32Array(analyser.fftSize);

          vadIntervalRef.current = window.setInterval(() => {
            if (!recorderRef.current || recorderRef.current.state !== 'recording') return;
            analyser.getFloatTimeDomainData(dataBuf);
            let sum = 0;
            for (let i = 0; i < dataBuf.length; i++) {
              sum += dataBuf[i] * dataBuf[i];
            }
            const rms = Math.sqrt(sum / dataBuf.length);
            const now = Date.now();
            const elapsed = now - startedAt;

            // Calibrate room noise floor during the first ~250ms
            if (elapsed < 280) {
              noiseSamples.push(rms);
              const avg = noiseSamples.reduce((a, b) => a + b, 0) / noiseSamples.length;
              noiseFloor = Math.max(0.005, Math.min(0.03, avg));
              return;
            }

            const speechThreshold = Math.max(0.016, noiseFloor * 2.6);
            if (rms > speechThreshold) {
              speechDetected = true;
              lastSpeechAt = now;
            } else if (speechDetected && now - lastSpeechAt >= 1250) {
              // User finished speaking (~1.25s pause) -> automatically transcribe & answer!
              stopRecording();
            } else if (!speechDetected && elapsed >= 6500) {
              // No speech heard for 6.5s -> stop gently
              stopRecording();
            }
          }, 70);
        }
      } catch {
        // If Web Audio analyser fails, max duration timer still protects recording
      }

      recorder.start(200);
      startedAt = Date.now();
      lastSpeechAt = Date.now();
      setRecordingSeconds(0);
      setIsRecording(true);
      timerRef.current = window.setInterval(() => {
        setRecordingSeconds((s) => {
          if (s >= 24) {
            stopRecording();
            return 25;
          }
          return s + 1;
        });
      }, 1000);
    } catch {
      stopTracksAndTimers();
      setIsRecording(false);
      setVoiceError(copy.micPermissionError);
    }
  }, [onBeforeStart, stopRecording, stopTracksAndTimers]);

  const toggleRecording = useCallback(() => {
    if (isTranscribing) return;
    if (isRecording) {
      stopRecording();
    } else {
      void startRecording();
    }
  }, [isRecording, isTranscribing, startRecording, stopRecording]);

  return {
    isRecording,
    isTranscribing,
    recordingSeconds,
    voiceError,
    clearVoiceError: () => setVoiceError(null),
    toggleRecording,
  };
}
