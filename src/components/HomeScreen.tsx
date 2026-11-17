import React, { useState, useRef, useEffect } from 'react';
import {
  History,
  Triangle,
  Sprout,
  Sun,
  TrendingUp,
  ChevronDown,
  Globe,
  ArrowUp,
  Volume2,
  VolumeX,
  Loader2,
  Languages,
  Mic,
  BookOpen,
  MessageCircle,
  Gamepad2,
} from 'lucide-react';
import { LampoMascot } from './LampoMascot';
import { LampoCompanion } from './LampoCompanion';
import { LampoGames } from './LampoGames';
import type {
  AppLanguage,
  AppMode,
  GameId,
  LampoMood,
  LampoQuirk,
  LessonDepth,
} from '../types/lesson';
import { LANGUAGES, UI_COPY } from '../i18n/translations';
import { unlockAudioContext } from '../utils/audioPlayer';
import { useVoiceRecorder } from '../hooks/useVoiceRecorder';

interface HomeScreenProps {
  language: AppLanguage;
  onChangeLanguage: (lang: AppLanguage) => void;
  onAskQuestion: (question: string, depth: LessonDepth, useInternet: boolean) => void;
  onOpenHistory: () => void;
  isLoading: boolean;
  isMuted: boolean;
  onToggleMute: () => void;
  historyCount: number;
  errorMessage: string | null;
}

const SUGGESTION_ICONS = [Triangle, Sprout, Sun, TrendingUp];

export const HomeScreen: React.FC<HomeScreenProps> = ({
  language,
  onChangeLanguage,
  onAskQuestion,
  onOpenHistory,
  isLoading,
  isMuted,
  onToggleMute,
  historyCount,
  errorMessage,
}) => {
  const [mode, setMode] = useState<AppMode>('lesson');
  const [selectedGame, setSelectedGame] = useState<GameId | null>(null);
  const [question, setQuestion] = useState('');
  const [depth, setDepth] = useState<LessonDepth>('batafsil');
  const [useInternet, setUseInternet] = useState(false);
  const [depthMenuOpen, setDepthMenuOpen] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [homePokeCount, setHomePokeCount] = useState(0);
  const [homeMood, setHomeMood] = useState<LampoMood>('happy');
  const [homeQuirk, setHomeQuirk] = useState<LampoQuirk>('none');
  const [homeQuirkKey, setHomeQuirkKey] = useState(0);
  const [homeQuip, setHomeQuip] = useState<string | null>(null);

  const depthRef = useRef<HTMLDivElement>(null);
  const langRef = useRef<HTMLDivElement>(null);
  const quipTimerRef = useRef<number | null>(null);

  const copy = UI_COPY[language];
  const currentLangObj = LANGUAGES.find((l) => l.code === language) || LANGUAGES[0];

  const {
    isRecording,
    isTranscribing,
    recordingSeconds,
    voiceError,
    clearVoiceError,
    toggleRecording,
  } = useVoiceRecorder({
    language,
    onTranscript: (transcript) => {
      setQuestion(transcript);
      onAskQuestion(transcript, depth, useInternet);
    },
  });

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (depthRef.current && !depthRef.current.contains(e.target as Node)) {
        setDepthMenuOpen(false);
      }
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setLangMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!question.trim() || isLoading) return;
    void unlockAudioContext();
    onAskQuestion(question.trim(), depth, useInternet);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleHomePoke = () => {
    void unlockAudioContext();
    const idx = Math.min(copy.pokeQuips.length - 1, homePokeCount);
    setHomePokeCount((c) => (c + 1) % copy.pokeQuips.length);
    const reactions: Array<{ mood: LampoMood; quirk: LampoQuirk }> = [
      { mood: 'playful', quirk: 'wiggle' },
      { mood: 'surprised', quirk: 'jump' },
      { mood: 'playful', quirk: 'bounce' },
      { mood: 'annoyed', quirk: 'shake' },
      { mood: 'sad', quirk: 'wiggle' },
    ];
    setHomeMood(reactions[idx].mood);
    setHomeQuirk(reactions[idx].quirk);
    setHomeQuirkKey((k) => k + 1);
    setHomeQuip(copy.pokeQuips[idx]);
    if (quipTimerRef.current !== null) window.clearTimeout(quipTimerRef.current);
    quipTimerRef.current = window.setTimeout(() => {
      setHomeQuip(null);
      setHomeMood('happy');
    }, 3200);
  };

  return (
    <div className="min-h-screen w-full bg-[#0B0F17] text-slate-100 flex flex-col justify-between relative overflow-hidden">
      {/* Subtle sky-blue ambient glow */}
      <div
        className="pointer-events-none absolute top-[10%] left-1/2 -translate-x-1/2 w-[580px] h-[580px] lampo-aura rounded-full"
        aria-hidden="true"
      />

      {/* Minimal Top Bar */}
      <header className="relative z-20 w-full max-w-6xl mx-auto px-5 sm:px-8 pt-5 pb-2 flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={onOpenHistory}
          className="relative w-10 h-10 rounded-xl bg-[#131A29] border border-slate-800 shadow-xs flex items-center justify-center text-slate-300 hover:text-white hover:border-slate-700 transition-colors shrink-0"
          aria-label={copy.historyTitle}
          title={copy.historyTitle}
        >
          <History className="w-4 h-4" />
          {historyCount > 0 && <span className="sr-only">{historyCount}</span>}
        </button>

        <div className="text-center select-none">
          <div className="text-lg font-bold tracking-tight text-slate-50 whitespace-nowrap">
            Lampo
          </div>
          <div className="text-xs font-medium text-slate-400 whitespace-nowrap">
            {copy.subtitle}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Language Switcher */}
          <div className="relative" ref={langRef}>
            <button
              type="button"
              disabled={isLoading}
              onClick={() => setLangMenuOpen((o) => !o)}
              className="h-10 px-3 rounded-xl bg-[#131A29] border border-slate-800 shadow-xs inline-flex items-center gap-1.5 text-xs font-semibold text-slate-200 hover:text-white hover:border-slate-700 transition-colors whitespace-nowrap"
              aria-label="Language"
            >
              <Languages className="w-4 h-4 text-sky-400" />
              <span>{currentLangObj.label}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {langMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-44 rounded-2xl bg-[#151E30] border border-slate-700/90 shadow-2xl p-1.5 z-30">
                {LANGUAGES.map((item) => (
                  <button
                    key={item.code}
                    type="button"
                    onClick={() => {
                      onChangeLanguage(item.code);
                      setLangMenuOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center justify-between ${
                      language === item.code
                        ? 'bg-sky-500/15 text-sky-300'
                        : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                    }`}
                  >
                    <span>{item.label}</span>
                    <span className="text-[11px] text-slate-500 font-mono-math">
                      {item.shortLabel}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              if (isMuted) {
                void unlockAudioContext();
              }
              onToggleMute();
            }}
            className="w-10 h-10 rounded-xl bg-[#131A29] border border-slate-800 shadow-xs flex items-center justify-center text-slate-300 hover:text-white hover:border-slate-700 transition-colors shrink-0"
            aria-label={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? (
              <VolumeX className="w-4 h-4 text-slate-500" />
            ) : (
              <Volume2 className="w-4 h-4 text-sky-400" />
            )}
          </button>
        </div>
      </header>

      {/* Mode Switcher: Lesson / Chat / Games */}
      <div className="relative z-20 flex justify-center px-5 pt-2">
        <div className="inline-flex items-center gap-1 rounded-2xl bg-[#131A29] border border-slate-800 p-1 shadow-xs">
          <button
            type="button"
            onClick={() => setMode('lesson')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              mode === 'lesson'
                ? 'bg-sky-500 text-slate-950'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>{copy.modeLesson}</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('chat')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              mode === 'chat'
                ? 'bg-sky-500 text-slate-950'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
            }`}
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>{copy.modeChat}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setSelectedGame(null);
              setMode('games');
            }}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              mode === 'games'
                ? 'bg-sky-500 text-slate-950'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
            }`}
          >
            <Gamepad2 className="w-3.5 h-3.5" />
            <span>{copy.modeGames}</span>
          </button>
        </div>
      </div>

      {/* Main View Content */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-5 sm:px-8 py-5">
        {mode === 'chat' ? (
          <LampoCompanion
            language={language}
            isMuted={isMuted}
            onLaunchGame={(gid) => {
              setSelectedGame(gid);
              setMode('games');
            }}
          />
        ) : mode === 'games' ? (
          <LampoGames
            language={language}
            isMuted={isMuted}
            initialGame={selectedGame}
          />
        ) : (
          <>
            <div className="flex flex-col items-center text-center mb-8 sm:mb-10">
              <div className="relative mb-4 animate-lampo-float">
                {homeQuip && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-[260px] rounded-2xl bg-[#192338] border border-slate-700 px-3.5 py-2 text-xs font-medium text-slate-100 shadow-xl z-30">
                    {homeQuip}
                  </div>
                )}
                <LampoMascot
                  size={94}
                  mood={isLoading ? 'curious' : homeMood}
                  quirk={homeQuirk}
                  quirkKey={homeQuirkKey}
                  isThinking={isLoading}
                  trackMouse={!isLoading}
                  onClick={isLoading ? undefined : handleHomePoke}
                />
              </div>

              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-50 text-balance">
                {isLoading ? copy.heroLoadingTitle : copy.heroTitle}
              </h1>
              <p className="mt-2.5 text-sm sm:text-base text-slate-400 font-medium">
                {isLoading ? copy.heroLoadingSubtitle : copy.heroSubtitle}
              </p>
            </div>

            {/* Bottom Prompt & Quick Suggestions Area */}
            <div className="w-full max-w-3xl mx-auto space-y-3.5">
          {(errorMessage || voiceError) && (
            <div
              role="alert"
              className="rounded-2xl bg-rose-950/70 border border-rose-800/80 px-4 py-3 text-sm text-rose-200 text-center"
            >
              {voiceError || errorMessage}
            </div>
          )}

          {/* 4 Quick Suggestion Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {copy.suggestions.map((text, idx) => {
              const Icon = SUGGESTION_ICONS[idx];
              return (
                <button
                  key={text}
                  type="button"
                  disabled={isLoading}
                  onClick={() => {
                    void unlockAudioContext();
                    onAskQuestion(text, depth, useInternet);
                  }}
                  className="group text-left rounded-2xl bg-[#131A29]/90 hover:bg-[#192236] border border-slate-800/90 hover:border-sky-500/60 px-4 py-3.5 transition-all flex flex-col justify-between gap-2.5 disabled:opacity-60 disabled:pointer-events-none"
                >
                  <Icon className="w-4 h-4 text-slate-500 group-hover:text-sky-400 transition-colors" />
                  <span className="text-[13px] font-semibold text-slate-200 group-hover:text-white leading-snug">
                    {text}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Prompt Input Box */}
          <form
            onSubmit={handleSubmit}
            className="rounded-3xl bg-[#131A29] border border-slate-800 shadow-[0_14px_40px_rgba(0,0,0,0.45)] p-3 sm:p-4 focus-within:border-sky-500/70 transition-all"
          >
            <textarea
              value={question}
              onChange={(e) => {
                if (voiceError) clearVoiceError();
                setQuestion(e.target.value);
              }}
              onKeyDown={handleKeyDown}
              disabled={isLoading || isRecording || isTranscribing}
              rows={2}
              placeholder={
                isRecording
                  ? `${copy.micListening} (${recordingSeconds}s)`
                  : isTranscribing
                    ? copy.micTranscribing
                    : copy.placeholder
              }
              className="w-full resize-none bg-transparent px-2 pt-1 pb-2 text-[15px] text-slate-100 placeholder:text-slate-500 focus:outline-none leading-relaxed"
            />

            <div className="flex items-center justify-between gap-3 pt-2.5 border-t border-slate-800/90">
              <div className="flex items-center gap-2 flex-wrap">
                {/* Depth / Duration Selector */}
                <div className="relative" ref={depthRef}>
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => setDepthMenuOpen((o) => !o)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-800 text-xs font-semibold text-slate-200 transition-colors whitespace-nowrap shrink-0"
                  >
                    <span>{copy.depths[depth]}</span>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  </button>

                  {depthMenuOpen && (
                    <div className="absolute left-0 bottom-full mb-2 w-48 rounded-2xl bg-[#151E30] border border-slate-700/90 shadow-2xl p-1.5 z-30">
                      {(['qisqa', 'batafsil', 'chuqur'] as LessonDepth[]).map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => {
                            setDepth(d);
                            setDepthMenuOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                            depth === d
                              ? 'bg-sky-500/15 text-sky-300'
                              : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                          }`}
                        >
                          {copy.depths[d]}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Internet Search Grounding Toggle */}
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => setUseInternet((v) => !v)}
                  aria-pressed={useInternet}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors whitespace-nowrap shrink-0 ${
                    useInternet
                      ? 'bg-sky-500/15 border-sky-500/50 text-sky-300'
                      : 'bg-transparent border-slate-700/80 text-slate-400 hover:text-slate-200 hover:border-slate-600'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>{copy.internet}</span>
                </button>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  disabled={isLoading || isTranscribing}
                  onClick={toggleRecording}
                  title={copy.micStartTitle}
                  aria-label={copy.micStartTitle}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all shrink-0 border ${
                    isRecording
                      ? 'bg-sky-500/20 border-sky-400 text-sky-300 shadow-[0_0_16px_rgba(56,189,248,0.35)] animate-pulse'
                      : isTranscribing
                        ? 'bg-slate-800 border-slate-700 text-sky-400'
                        : 'bg-slate-800/90 hover:bg-slate-700/90 border-slate-700 text-slate-300 hover:text-sky-300'
                  } disabled:opacity-50`}
                >
                  {isTranscribing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Mic className="w-4 h-4" />
                  )}
                </button>

                <button
                  type="submit"
                  disabled={!question.trim() || isLoading || isRecording || isTranscribing}
                  className="w-10 h-10 rounded-full bg-sky-500 hover:bg-sky-400 disabled:bg-slate-800 disabled:text-slate-600 text-slate-950 flex items-center justify-center transition-colors shrink-0"
                  aria-label="Send"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ArrowUp className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
          </>
        )}
      </main>

      <footer className="relative z-10 py-3 text-center text-xs text-slate-500">
        {copy.footerNote}
      </footer>
    </div>
  );
};
