import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  Volume2,
  VolumeX,
  FileText,
  Home,
  ArrowUp,
  Loader2,
  History,
  BookOpen,
  CheckCircle2,
  ExternalLink,
  Languages,
  ChevronDown,
  X,
  Sparkles,
  Mic,
  ListChecks,
  ImagePlus,
} from 'lucide-react';
import type {
  AppLanguage,
  LessonPlan,
  QuestionImageAttachment,
  QuizQuestion,
} from '../types/lesson';
import { LANGUAGES, UI_COPY } from '../i18n/translations';
import { WhiteboardCanvas } from './WhiteboardCanvas';
import { LampoMascot } from './LampoMascot';
import { MiniTestModal } from './MiniTestModal';
import { useVoiceRecorder } from '../hooks/useVoiceRecorder';
import { processQuestionImage } from '../utils/imageUpload';
import {
  playBase64Audio,
  stopActiveAudio,
  unlockAudioContext,
} from '../utils/audioPlayer';

interface LessonPlayerProps {
  lesson: LessonPlan;
  language: AppLanguage;
  onChangeLanguage: (lang: AppLanguage) => void;
  isMuted: boolean;
  onToggleMute: () => void;
  onGoHome: () => void;
  onOpenHistory: () => void;
  onAskFollowUp: (question: string, image?: QuestionImageAttachment | null) => void;
  onRequestContinuation: () => Promise<boolean>;
  onQuizLoaded: (lessonId: string, questions: QuizQuestion[]) => void;
  onSrsUpdated: () => void;
  isGeneratingFollowUp: boolean;
  isContinuingLecture: boolean;
  errorMessage: string | null;
}

function formatDuration(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export const LessonPlayer: React.FC<LessonPlayerProps> = ({
  lesson,
  language,
  onChangeLanguage,
  isMuted,
  onToggleMute,
  onGoHome,
  onOpenHistory,
  onAskFollowUp,
  onRequestContinuation,
  onQuizLoaded,
  onSrsUpdated,
  isGeneratingFollowUp,
  isContinuingLecture,
  errorMessage,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [continuousMode, setContinuousMode] = useState(
    () => lesson.depth === 'batafsil' || lesson.depth === 'chuqur'
  );
  const [showWrittenPanel, setShowWrittenPanel] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : true
  );
  const [typedChars, setTypedChars] = useState(0);
  const [followUp, setFollowUp] = useState('');
  const [followUpImage, setFollowUpImage] = useState<QuestionImageAttachment | null>(null);
  const [quizOpen, setQuizOpen] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [audioBlocked, setAudioBlocked] = useState(false);
  const [playbackNonce, setPlaybackNonce] = useState(0);
  const [speechProgress, setSpeechProgress] = useState(0);
  const followUpImageRef = useRef<HTMLInputElement>(null);

  const audioCacheRef = useRef<
    Map<string, { audioBase64: string; mimeType: string }>
  >(new Map());
  const inFlightAudioRef = useRef<
    Map<string, Promise<{ audioBase64: string; mimeType: string } | null>>
  >(new Map());
  const timerRef = useRef<number | null>(null);
  const progressRafRef = useRef<number | null>(null);
  const playbackRunIdRef = useRef(0);
  const activeNoteCardRef = useRef<HTMLButtonElement | null>(null);
  const langRef = useRef<HTMLDivElement>(null);
  const continuationRequestedForLenRef = useRef<number>(0);
  const waitingForContinuationRef = useRef(false);

  const steps = lesson.steps || [];
  const stepsRef = useRef(steps);
  stepsRef.current = steps;
  const isContinuingRef = useRef(isContinuingLecture);
  isContinuingRef.current = isContinuingLecture;

  const currentStep = steps[currentStepIndex];
  const activeLang: AppLanguage = lesson.language || language;
  const copy = UI_COPY[language];
  const currentLangObj = LANGUAGES.find((l) => l.code === language) || LANGUAGES[0];

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setLangMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  useEffect(() => {
    const unlockOnGesture = () => {
      void unlockAudioContext();
    };
    window.addEventListener('pointerdown', unlockOnGesture, { passive: true });
    return () => window.removeEventListener('pointerdown', unlockOnGesture);
  }, []);

  // Reset only when a genuinely new lesson ID loads
  useEffect(() => {
    setCurrentStepIndex(0);
    setIsPlaying(true);
    setElapsedSeconds(0);
    setFollowUp('');
    setAudioBlocked(false);
    setSpeechProgress(0);
    continuationRequestedForLenRef.current = 0;
    setContinuousMode(lesson.depth === 'batafsil' || lesson.depth === 'chuqur');
  }, [lesson.id, lesson.depth]);

  // Lecture elapsed timer while playing
  useEffect(() => {
    if (!isPlaying) return;
    const id = window.setInterval(() => {
      setElapsedSeconds((s) => s + 1);
    }, 1000);
    return () => window.clearInterval(id);
  }, [isPlaying]);

  // Automatically expand lecture seamlessly up to 60 mins when continuousMode is active
  useEffect(() => {
    const maxAllowedSeconds = lesson.depth === 'qisqa' ? 900 : 3600;
    if (
      continuousMode &&
      isPlaying &&
      !isContinuingLecture &&
      elapsedSeconds < maxAllowedSeconds &&
      steps.length > 0 &&
      currentStepIndex >= steps.length - 2 &&
      continuationRequestedForLenRef.current !== steps.length
    ) {
      continuationRequestedForLenRef.current = steps.length;
      void onRequestContinuation();
    }
  }, [
    continuousMode,
    isPlaying,
    isContinuingLecture,
    elapsedSeconds,
    lesson.depth,
    steps.length,
    currentStepIndex,
    onRequestContinuation,
  ]);

  // Sync live written notes typing directly with speech & drawing progress
  useEffect(() => {
    const fullText = currentStep?.writtenNotes || '';
    if (!fullText) {
      setTypedChars(0);
      return;
    }
    if (!isPlaying && speechProgress === 0) {
      setTypedChars(fullText.length);
      return;
    }
    setTypedChars(Math.ceil(fullText.length * Math.min(1, speechProgress * 1.06)));
  }, [currentStep?.writtenNotes, speechProgress, isPlaying]);

  useEffect(() => {
    activeNoteCardRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
    });
  }, [currentStepIndex]);

  const stopAllAudio = useCallback(() => {
    playbackRunIdRef.current += 1;
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (progressRafRef.current !== null) {
      window.cancelAnimationFrame(progressRafRef.current);
      progressRafRef.current = null;
    }
    stopActiveAudio();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  }, []);

  const {
    isRecording,
    isTranscribing,
    recordingSeconds,
    voiceError,
    clearVoiceError,
    toggleRecording,
  } = useVoiceRecorder({
    language,
    onBeforeStart: () => {
      stopAllAudio();
      setIsPlaying(false);
    },
    onTranscript: (transcript) => {
      setFollowUp('');
      stopAllAudio();
      setIsPlaying(false);
      onAskFollowUp(transcript);
    },
  });

  const fetchTtsAudio = useCallback(
    (
      text: string,
      lang: AppLanguage
    ): Promise<{ audioBase64: string; mimeType: string } | null> => {
      const cacheKey = `${lang}:${text}`;
      const cached = audioCacheRef.current.get(cacheKey);
      if (cached) return Promise.resolve(cached);

      const existing = inFlightAudioRef.current.get(cacheKey);
      if (existing) return existing;

      const reqPromise = (async () => {
        try {
          const res = await fetch('/api/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, language: lang, voice: 'Kore' }),
          });
          if (!res.ok) return null;
          const data = await res.json();
          if (data?.audioBase64) {
            const payload = {
              audioBase64: data.audioBase64 as string,
              mimeType: (data.mimeType as string) || 'audio/mpeg',
            };
            audioCacheRef.current.set(cacheKey, payload);
            return payload;
          }
          return null;
        } catch {
          return null;
        } finally {
          inFlightAudioRef.current.delete(cacheKey);
        }
      })();

      inFlightAudioRef.current.set(cacheKey, reqPromise);
      return reqPromise;
    },
    []
  );

  // Prefetch next scene audio
  useEffect(() => {
    const nextStep = steps[currentStepIndex + 1];
    if (nextStep?.narration && !isMuted) {
      void fetchTtsAudio(nextStep.narration, activeLang);
    }
  }, [currentStepIndex, steps, isMuted, activeLang, fetchTtsAudio]);

  // Play current scene narration & synchronize drawing strictly to active speech
  useEffect(() => {
    stopAllAudio();
    const step = stepsRef.current[currentStepIndex];

    if (!isPlaying || !step) {
      return;
    }

    waitingForContinuationRef.current = false;
    setSpeechProgress(0);
    const runId = playbackRunIdRef.current;

    const startTimedProgress = (durationMs: number) => {
      let startAt: number | null = null;
      const tick = (now: number) => {
        if (playbackRunIdRef.current !== runId) return;
        if (startAt === null) startAt = now;
        const p = Math.min(1, (now - startAt) / Math.max(800, durationMs));
        setSpeechProgress(p);
        if (p < 1) {
          progressRafRef.current = window.requestAnimationFrame(tick);
        }
      };
      progressRafRef.current = window.requestAnimationFrame(tick);
    };

    const advanceToNext = () => {
      if (playbackRunIdRef.current !== runId) return;
      setSpeechProgress(1);
      setIsSpeaking(false);
      timerRef.current = window.setTimeout(() => {
        if (playbackRunIdRef.current !== runId) return;
        const totalSteps = stepsRef.current.length;
        setCurrentStepIndex((prev) => {
          if (prev < totalSteps - 1) {
            return prev + 1;
          }
          if (isContinuingRef.current) {
            waitingForContinuationRef.current = true;
          }
          setIsPlaying(false);
          return prev;
        });
      }, 450);
    };

    const scheduleFallbackTimer = (text: string) => {
      const ms = Math.min(14000, Math.max(5000, text.length * 68));
      if (!isMuted && typeof window !== 'undefined' && 'speechSynthesis' in window) {
        try {
          const langMeta = LANGUAGES.find((l) => l.code === activeLang);
          const langPrefix = activeLang.toLowerCase();
          const voices = window.speechSynthesis.getVoices();
          const hasMatchingVoice = voices.some((v) =>
            v.lang.toLowerCase().startsWith(langPrefix)
          );
          if (hasMatchingVoice && langMeta) {
            const utter = new SpeechSynthesisUtterance(text);
            utter.lang = langMeta.bcp47;
            utter.rate = 0.96;
            utter.onstart = () => {
              if (playbackRunIdRef.current !== runId) return;
              setIsSpeaking(true);
              startTimedProgress(ms);
            };
            utter.onend = () => advanceToNext();
            utter.onerror = () => {
              if (playbackRunIdRef.current !== runId) return;
              startTimedProgress(ms);
              timerRef.current = window.setTimeout(advanceToNext, ms);
            };
            window.speechSynthesis.speak(utter);
            return;
          }
        } catch {
          // fall through to timed advance
        }
      }
      setIsSpeaking(!isMuted);
      startTimedProgress(ms);
      timerRef.current = window.setTimeout(advanceToNext, ms);
    };

    if (isMuted) {
      const silentMs = Math.min(12000, Math.max(4500, step.narration.length * 60));
      startTimedProgress(silentMs);
      timerRef.current = window.setTimeout(advanceToNext, silentMs);
      return () => stopAllAudio();
    }

    (async () => {
      const audioPayload = await fetchTtsAudio(step.narration, activeLang);
      if (playbackRunIdRef.current !== runId) return;

      if (!audioPayload) {
        scheduleFallbackTimer(step.narration);
        return;
      }

      await playBase64Audio(audioPayload.audioBase64, audioPayload.mimeType, {
        onStart: () => {
          if (playbackRunIdRef.current !== runId) return;
          setAudioBlocked(false);
          setIsSpeaking(true);
        },
        onProgress: (progress) => {
          if (playbackRunIdRef.current !== runId) return;
          setSpeechProgress(progress);
        },
        onEnd: () => {
          advanceToNext();
        },
        onBlocked: () => {
          if (playbackRunIdRef.current !== runId) return;
          setAudioBlocked(true);
          setIsSpeaking(false);
          setSpeechProgress(0);
        },
        onError: () => {
          if (playbackRunIdRef.current !== runId) return;
          scheduleFallbackTimer(step.narration);
        },
      });
    })();

    return () => stopAllAudio();
  }, [
    lesson.id,
    currentStepIndex,
    isPlaying,
    isMuted,
    playbackNonce,
    activeLang,
    fetchTtsAudio,
    stopAllAudio,
  ]);

  // If new scenes arrive from continuation right after reaching the previous end, resume seamlessly
  useEffect(() => {
    if (
      continuousMode &&
      waitingForContinuationRef.current &&
      !isPlaying &&
      currentStepIndex < steps.length - 1
    ) {
      waitingForContinuationRef.current = false;
      setCurrentStepIndex((i) => i + 1);
      setIsPlaying(true);
    }
  }, [steps.length, continuousMode, isPlaying, currentStepIndex]);

  const handlePrev = () => {
    void unlockAudioContext();
    setSpeechProgress(0);
    setCurrentStepIndex((i) => Math.max(0, i - 1));
  };

  const handleNext = () => {
    void unlockAudioContext();
    setSpeechProgress(0);
    setCurrentStepIndex((i) => Math.min(steps.length - 1, i + 1));
  };

  const handleRestart = () => {
    void unlockAudioContext();
    setSpeechProgress(0);
    setCurrentStepIndex(0);
    setElapsedSeconds(0);
    setIsPlaying(true);
    setPlaybackNonce((n) => n + 1);
  };

  const handleFollowUpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((!followUp.trim() && !followUpImage) || isGeneratingFollowUp) return;
    void unlockAudioContext();
    stopAllAudio();
    setIsPlaying(false);
    const imgToSend = followUpImage;
    setFollowUpImage(null);
    onAskFollowUp(followUp.trim() || copy.photoDefaultQuestion, imgToSend);
  };

  const progressPct =
    steps.length > 1 ? ((currentStepIndex + 1) / steps.length) * 100 : 100;

  return (
    <div className="relative h-screen w-full overflow-hidden flex flex-col bg-[#0B0F17] text-slate-100">
      {/* Top Bar */}
      <header className="relative z-30 w-full px-4 sm:px-6 py-3 bg-[#111827]/95 backdrop-blur-sm border-b border-slate-800/90 flex items-center justify-between gap-3">
        {/* Left: Home & History */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              stopAllAudio();
              onGoHome();
            }}
            className="w-10 h-10 rounded-xl bg-[#182133] border border-slate-700/80 flex items-center justify-center text-slate-300 hover:text-white hover:border-slate-600 transition-colors"
            aria-label="Home"
          >
            <Home className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onOpenHistory}
            className="hidden sm:flex w-10 h-10 rounded-xl bg-[#182133] border border-slate-700/80 items-center justify-center text-slate-300 hover:text-white hover:border-slate-600 transition-colors"
            aria-label={copy.historyTitle}
            title={copy.historyTitle}
          >
            <History className="w-4 h-4" />
          </button>
        </div>

        {/* Center: Title + Topic Flow (no step counter clutter) */}
        <div className="flex-1 max-w-2xl flex items-center justify-between gap-4 min-w-0 px-2">
          <div className="min-w-0">
            <h1 className="text-sm sm:text-base font-bold text-slate-50 truncate">
              {lesson.title}
            </h1>
            <div className="flex items-center gap-2 text-xs text-slate-400 truncate">
              <span className="truncate">{currentStep?.stepTitle || lesson.subject}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono-math text-slate-400 shrink-0">
                {formatDuration(elapsedSeconds)}
              </span>
            </div>
          </div>
          <span className="hidden md:inline-block text-xs font-medium text-slate-400 shrink-0">
            {lesson.subject}
            {lesson.track && lesson.track !== 'general' ? ` · ${copy.tracks[lesson.track]}` : ''}
          </span>
        </div>

        {/* Right: Continuous Toggle, Mini-test, Language Switcher & Written Notes Toggle */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              stopAllAudio();
              setIsPlaying(false);
              setQuizOpen(true);
            }}
            className="h-10 px-3.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 inline-flex items-center gap-1.5 text-xs font-bold transition-colors whitespace-nowrap shrink-0"
          >
            <ListChecks className="w-4 h-4" />
            <span>{copy.miniTestButton}</span>
          </button>

          <button
            type="button"
            onClick={() => setContinuousMode((v) => !v)}
            aria-pressed={continuousMode}
            className={`hidden md:inline-flex h-10 px-3 rounded-xl border items-center gap-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
              continuousMode
                ? 'bg-sky-500/15 border-sky-500/50 text-sky-300'
                : 'bg-[#182133] border-slate-700/80 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{copy.continuousModeLabel}</span>
          </button>

          <div className="relative hidden sm:block" ref={langRef}>
            <button
              type="button"
              onClick={() => setLangMenuOpen((o) => !o)}
              className="h-10 px-3 rounded-xl bg-[#182133] border border-slate-700/80 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-200 hover:text-white hover:border-slate-600 transition-colors whitespace-nowrap shrink-0"
            >
              <Languages className="w-4 h-4 text-sky-400" />
              <span>{currentLangObj.shortLabel}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>
            {langMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-40 rounded-2xl bg-[#151E30] border border-slate-700/90 shadow-2xl p-1.5 z-40">
                {LANGUAGES.map((item) => (
                  <button
                    key={item.code}
                    type="button"
                    onClick={() => {
                      onChangeLanguage(item.code);
                      setLangMenuOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                      language === item.code
                        ? 'bg-sky-500/15 text-sky-300'
                        : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowWrittenPanel((v) => !v)}
            className={`h-10 px-3.5 rounded-xl border inline-flex items-center gap-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
              showWrittenPanel
                ? 'bg-sky-500/15 border-sky-500/50 text-sky-300'
                : 'bg-[#182133] border-slate-700/80 text-slate-300 hover:text-white'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>{showWrittenPanel ? copy.hideNotesButton : copy.notesButton}</span>
          </button>
        </div>
      </header>

      {/* Main Split Stage: Dark Chalkboard Drawing Stage + Live Written Explanation */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row relative">
        {/* Left Zone: Interactive Dark Chalkboard */}
        <main className="relative flex-1 min-w-0 min-h-0 flex flex-col">
          <div className="relative flex-1 min-h-0">
            <WhiteboardCanvas
              steps={steps}
              currentStepIndex={currentStepIndex}
              speechProgress={speechProgress}
              isPlaying={isPlaying}
              isSpeaking={isSpeaking}
            />

            {isGeneratingFollowUp && (
              <div className="absolute inset-0 z-30 bg-[#0B0F17]/75 backdrop-blur-xs flex flex-col items-center justify-center px-6 text-center">
                <div className="mb-3 animate-lampo-float">
                  <LampoMascot size={78} mood="curious" isThinking={true} />
                </div>
                <p className="text-base sm:text-lg font-bold text-slate-50">
                  {copy.heroLoadingTitle}
                </p>
                <p className="mt-1 text-xs sm:text-sm text-slate-400">
                  {copy.heroLoadingSubtitle}
                </p>
              </div>
            )}
          </div>

          {/* Bottom Subtitle + Controls Overlay */}
          <div className="relative z-20 px-4 sm:px-6 pb-3 pt-2.5 bg-gradient-to-t from-[#0B0F17] via-[#0B0F17]/95 to-[#0B0F17]/80 border-t border-slate-800/80">
            <div className="max-w-3xl mx-auto space-y-2.5">
              {(errorMessage || voiceError) && (
                <div
                  role="alert"
                  className="rounded-xl bg-rose-950/70 border border-rose-800/80 px-3.5 py-2 text-xs text-rose-200 text-center"
                >
                  {voiceError || errorMessage}
                </div>
              )}

              {audioBlocked && !isMuted && (
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={async () => {
                      await unlockAudioContext();
                      setAudioBlocked(false);
                      setIsPlaying(true);
                      setPlaybackNonce((n) => n + 1);
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold shadow-lg transition-colors whitespace-nowrap"
                  >
                    <Volume2 className="w-4 h-4" />
                    <span>{copy.enableAudioLabel}</span>
                  </button>
                </div>
              )}

              {/* Dark Subtitle Box */}
              {currentStep && (
                <div className="rounded-2xl bg-[#162033] border border-slate-700/80 text-slate-100 px-5 py-3 shadow-lg text-center">
                  <p className="text-sm sm:text-[15px] font-medium leading-relaxed">
                    {currentStep.narration}
                  </p>
                </div>
              )}

              {/* Smooth Continuous Progress Bar (no step numbers) */}
              <div className="flex items-center gap-3 px-1">
                <div className="relative flex-1 h-2 bg-slate-800 rounded-full overflow-hidden flex items-center">
                  <div
                    className="h-full bg-sky-500 rounded-full transition-all duration-300"
                    style={{ width: `${progressPct}%` }}
                  />
                  <div className="absolute inset-0 flex">
                    {steps.map((s, idx) => (
                      <button
                        key={`${s.stepNumber}_${idx}`}
                        type="button"
                        onClick={() => {
                          void unlockAudioContext();
                          setCurrentStepIndex(idx);
                        }}
                        className="flex-1 h-full focus:outline-none"
                        aria-label={s.stepTitle}
                        title={s.stepTitle}
                      />
                    ))}
                  </div>
                </div>
                {isContinuingLecture && (
                  <span className="text-xs font-medium text-sky-400 shrink-0">
                    {copy.loadingMoreLabel}
                  </span>
                )}
              </div>

              {/* Prompt mini-test automatically at end of lecture */}
              {!isPlaying && currentStepIndex === steps.length - 1 && !isContinuingLecture && (
                <div className="rounded-2xl bg-[#162033] border border-amber-500/45 px-4 py-2.5 flex items-center justify-between gap-3">
                  <span className="text-xs sm:text-[13px] font-medium text-slate-200">
                    {copy.miniTestEndPrompt}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuizOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold transition-colors whitespace-nowrap shrink-0"
                  >
                    <ListChecks className="w-3.5 h-3.5" />
                    <span>{copy.miniTestButton}</span>
                  </button>
                </div>
              )}

              {/* Playback Buttons + Follow-up Input */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                <div className="flex items-center justify-between sm:justify-start gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={handleRestart}
                    className="w-10 h-10 rounded-xl hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-100 transition-colors"
                    aria-label="Restart"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handlePrev}
                    disabled={currentStepIndex === 0}
                    className="w-10 h-10 rounded-xl hover:bg-slate-800 disabled:opacity-35 flex items-center justify-center text-slate-400 hover:text-slate-100 transition-colors"
                    aria-label="Previous"
                  >
                    <SkipBack className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      void unlockAudioContext();
                      if (!isPlaying && currentStepIndex === steps.length - 1) {
                        setCurrentStepIndex(0);
                      }
                      setIsPlaying((p) => !p);
                    }}
                    className="w-14 h-10 rounded-2xl bg-sky-500 hover:bg-sky-400 text-slate-950 shadow-sm flex items-center justify-center transition-colors"
                    aria-label={isPlaying ? 'Pause' : 'Play'}
                  >
                    {isPlaying ? (
                      <Pause className="w-4 h-4 fill-current" />
                    ) : (
                      <Play className="w-4 h-4 fill-current ml-0.5" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleNext}
                    disabled={currentStepIndex >= steps.length - 1}
                    className="w-10 h-10 rounded-xl hover:bg-slate-800 disabled:opacity-35 flex items-center justify-center text-slate-400 hover:text-slate-100 transition-colors"
                    aria-label="Next"
                  >
                    <SkipForward className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (isMuted) {
                        void unlockAudioContext();
                        setAudioBlocked(false);
                      }
                      onToggleMute();
                    }}
                    className="w-10 h-10 rounded-xl hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-100 transition-colors"
                    aria-label={isMuted ? 'Unmute' : 'Mute'}
                  >
                    {isMuted ? (
                      <VolumeX className="w-4 h-4 text-slate-500" />
                    ) : (
                      <Volume2 className="w-4 h-4 text-sky-400" />
                    )}
                  </button>
                </div>

                {/* Follow-up Question Input (text, photo, or voice) */}
                <form
                  onSubmit={handleFollowUpSubmit}
                  className="flex-1 flex items-center gap-2 rounded-2xl bg-[#131A29] border border-slate-800 px-3.5 py-1.5 focus-within:border-sky-500/70 transition-colors min-w-0"
                >
                  <input
                    ref={followUpImageRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      e.target.value = '';
                      if (!file) return;
                      try {
                        const processed = await processQuestionImage(file);
                        setFollowUpImage(processed);
                      } catch {
                        // ignore invalid file
                      }
                    }}
                  />
                  {followUpImage && (
                    <div className="relative shrink-0">
                      <img
                        src={followUpImage.previewUrl}
                        alt={followUpImage.fileName}
                        className="w-7 h-7 rounded-lg object-cover border border-slate-600"
                      />
                      <button
                        type="button"
                        onClick={() => setFollowUpImage(null)}
                        className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-slate-900 border border-slate-600 text-slate-200 flex items-center justify-center"
                        aria-label={copy.photoRemoveLabel}
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  )}
                  <input
                    type="text"
                    value={followUp}
                    onChange={(e) => {
                      if (voiceError) clearVoiceError();
                      setFollowUp(e.target.value);
                    }}
                    disabled={isGeneratingFollowUp || isRecording || isTranscribing}
                    placeholder={
                      isRecording
                        ? `${copy.micListening} (${recordingSeconds}s)`
                        : isTranscribing
                          ? copy.micTranscribing
                          : followUpImage
                            ? copy.photoPlaceholder
                            : copy.followUpPlaceholder
                    }
                    className="flex-1 bg-transparent text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none min-w-0"
                  />
                  <button
                    type="button"
                    disabled={isGeneratingFollowUp || isRecording || isTranscribing}
                    onClick={() => followUpImageRef.current?.click()}
                    title={copy.photoAttachLabel}
                    aria-label={copy.photoAttachLabel}
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-all shrink-0 border ${
                      followUpImage
                        ? 'bg-sky-500/20 border-sky-400 text-sky-300'
                        : 'bg-slate-800/90 hover:bg-slate-700 border-slate-700 text-slate-300 hover:text-sky-300'
                    } disabled:opacity-50`}
                  >
                    <ImagePlus className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={isGeneratingFollowUp || isTranscribing}
                    onClick={toggleRecording}
                    title={copy.micStartTitle}
                    aria-label={copy.micStartTitle}
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-all shrink-0 border ${
                      isRecording
                        ? 'bg-sky-500/20 border-sky-400 text-sky-300 shadow-[0_0_14px_rgba(56,189,248,0.35)] animate-pulse'
                        : isTranscribing
                          ? 'bg-slate-800 border-slate-700 text-sky-400'
                          : 'bg-slate-800/90 hover:bg-slate-700 border-slate-700 text-slate-300 hover:text-sky-300'
                    } disabled:opacity-50`}
                  >
                    {isTranscribing ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Mic className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <button
                    type="submit"
                    disabled={
                      (!followUp.trim() && !followUpImage) ||
                      isGeneratingFollowUp ||
                      isRecording ||
                      isTranscribing
                    }
                    className="w-8 h-8 rounded-full bg-sky-500 hover:bg-sky-400 disabled:bg-slate-800 disabled:text-slate-600 text-slate-950 flex items-center justify-center transition-colors shrink-0"
                    aria-label="Send"
                  >
                    {isGeneratingFollowUp ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <ArrowUp className="w-4 h-4" />
                    )}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </main>

        {/* Right Zone: Live Written Explanation Panel */}
        {showWrittenPanel && (
          <aside
            className="fixed inset-0 z-40 lg:static lg:z-10 lg:w-[410px] xl:w-[440px] shrink-0 bg-[#0F1522] lg:border-l border-slate-800 flex flex-col h-full overflow-hidden"
            aria-label={copy.writtenPanelTitle}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-sky-400" />
                <h2 className="text-sm font-bold text-slate-100">
                  {copy.writtenPanelTitle}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowWrittenPanel(false)}
                className="w-8 h-8 rounded-lg border border-slate-700/80 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
              {/* Summary */}
              <section>
                <div className="text-xs font-semibold text-slate-400 mb-1.5">
                  {copy.summaryTitle}
                </div>
                <p className="text-sm leading-relaxed text-slate-200">
                  {lesson.summary}
                </p>
              </section>

              {/* Key Formula / Core Rule */}
              {lesson.formulaOrFact && (
                <section className="rounded-2xl bg-[#151E30] border border-slate-700/80 p-3.5">
                  <div className="text-xs font-semibold text-slate-400 mb-1">
                    {copy.formulaTitle}
                  </div>
                  <p className="font-mono-math text-[13px] font-semibold text-sky-300 leading-relaxed">
                    {lesson.formulaOrFact}
                  </p>
                </section>
              )}

              {/* Continuous Flowing Written Lecture Sections (no step badges) */}
              <section>
                <div className="text-xs font-semibold text-slate-400 mb-3">
                  {copy.lectureFlowTitle}
                </div>
                <div className="space-y-3">
                  {steps.map((step, idx) => {
                    const isActive = idx === currentStepIndex;
                    const isCompleted = idx < currentStepIndex;
                    const displayedText = isActive
                      ? step.writtenNotes.slice(0, typedChars)
                      : step.writtenNotes;

                    return (
                      <button
                        key={`${step.stepNumber}_${idx}`}
                        ref={isActive ? activeNoteCardRef : undefined}
                        type="button"
                        onClick={() => {
                          void unlockAudioContext();
                          setCurrentStepIndex(idx);
                          setIsPlaying(true);
                        }}
                        className={`w-full text-left rounded-2xl p-4 border transition-all ${
                          isActive
                            ? 'bg-sky-950/45 border-sky-500/60 shadow-xs'
                            : isCompleted
                              ? 'bg-[#131B2C] border-slate-800 hover:border-slate-700'
                              : 'bg-[#111826]/70 border-slate-800/60 opacity-75 hover:opacity-100'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <div className="text-[13px] font-bold text-slate-100">
                            {step.stepTitle}
                          </div>
                          {isActive && (
                            <span className="text-[11px] font-semibold text-sky-400 shrink-0">
                              {copy.writingNowLabel}
                            </span>
                          )}
                        </div>
                        <p className="text-[13px] text-slate-300 leading-relaxed">
                          {displayedText}
                          {isActive && typedChars < step.writtenNotes.length && (
                            <span className="inline-block w-1.5 h-3.5 bg-sky-400 ml-0.5 align-middle animate-pulse" />
                          )}
                        </p>
                      </button>
                    );
                  })}
                </div>

                {/* Button to continue deeper anytime */}
                <button
                  type="button"
                  disabled={isContinuingLecture}
                  onClick={() => {
                    setContinuousMode(true);
                    void onRequestContinuation();
                  }}
                  className="mt-4 w-full py-2.5 px-4 rounded-xl bg-[#162033] hover:bg-[#1C2942] border border-slate-700/80 text-xs font-semibold text-sky-300 flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
                >
                  {isContinuingLecture ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>{copy.loadingMoreLabel}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{copy.continueDeeperLabel}</span>
                    </>
                  )}
                </button>
              </section>

              {/* Key Takeaways */}
              {lesson.keyTakeaways?.length > 0 && (
                <section className="pt-3 border-t border-slate-800">
                  <div className="text-xs font-semibold text-slate-400 mb-2.5">
                    {copy.takeawaysTitle}
                  </div>
                  <ul className="space-y-2">
                    {lesson.keyTakeaways.map((point, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-[13px] text-slate-300 leading-relaxed"
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* Grounded Sources */}
              {lesson.sources && lesson.sources.length > 0 && (
                <section className="pt-3 border-t border-slate-800">
                  <div className="text-xs font-semibold text-slate-400 mb-2">
                    {copy.sourcesTitle}
                  </div>
                  <div className="space-y-2">
                    {lesson.sources.map((src, i) => (
                      <a
                        key={i}
                        href={src.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between gap-2 rounded-xl border border-slate-800 bg-[#131B2C] px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 transition-colors"
                      >
                        <span className="truncate font-medium">{src.title}</span>
                        <ExternalLink className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      </a>
                    ))}
                  </div>
                </section>
              )}
            </div>
          </aside>
        )}
      </div>

      <MiniTestModal
        isOpen={quizOpen}
        onClose={() => setQuizOpen(false)}
        language={language}
        lesson={lesson}
        onQuizLoaded={onQuizLoaded}
        onSrsUpdated={onSrsUpdated}
      />
    </div>
  );
};
