import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ArrowLeft,
  Atom,
  Calculator,
  Compass,
  Flame,
  Grid3X3,
  HelpCircle,
  Layers,
  Lightbulb,
  Loader2,
  Music,
  Rocket,
  RotateCcw,
  Sparkles,
  Sun,
} from 'lucide-react';
import { LampoMascot } from './LampoMascot';
import type { AppLanguage, GameId, LampoMood, LampoQuirk } from '../types/lesson';
import { UI_COPY } from '../i18n/translations';
import { playBase64Audio, stopActiveAudio, unlockAudioContext } from '../utils/audioPlayer';

interface LampoGamesProps {
  language: AppLanguage;
  isMuted: boolean;
  initialGame?: GameId | null;
}

type XoCell = 'X' | 'O' | null;

const XO_WIN_LINES: [number, number, number][] = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

function checkXoWinner(board: XoCell[]): { winner: 'X' | 'O' | 'draw' | null; line: number[] } {
  for (const [a, b, c] of XO_WIN_LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], line: [a, b, c] };
    }
  }
  if (board.every((cell) => cell !== null)) {
    return { winner: 'draw', line: [] };
  }
  return { winner: null, line: [] };
}

function pickLampoXoMove(board: XoCell[]): number {
  const empty = board.map((v, i) => (v === null ? i : -1)).filter((i) => i !== -1);
  if (empty.length === 0) return -1;

  // 1. Always take an immediate win for O
  for (const idx of empty) {
    const copy = [...board];
    copy[idx] = 'O';
    if (checkXoWinner(copy).winner === 'O') return idx;
  }

  // 2. Usually block player X from winning (leaves occasional playful opening)
  if (Math.random() < 0.82) {
    for (const idx of empty) {
      const copy = [...board];
      copy[idx] = 'X';
      if (checkXoWinner(copy).winner === 'X') return idx;
    }
  }

  // 3. Center or corners
  if (board[4] === null && Math.random() < 0.75) return 4;
  const corners = [0, 2, 6, 8].filter((i) => board[i] === null);
  if (corners.length > 0 && Math.random() < 0.7) {
    return corners[Math.floor(Math.random() * corners.length)];
  }
  return empty[Math.floor(Math.random() * empty.length)];
}

interface MemoryCard {
  uid: number;
  pairId: string;
  flipped: boolean;
  matched: boolean;
}

const MEMORY_SYMBOLS: Array<{
  pairId: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}> = [
  { pairId: 'atom', icon: Atom, color: 'text-sky-400' },
  { pairId: 'rocket', icon: Rocket, color: 'text-rose-400' },
  { pairId: 'sun', icon: Sun, color: 'text-amber-400' },
  { pairId: 'flame', icon: Flame, color: 'text-orange-400' },
  { pairId: 'music', icon: Music, color: 'text-violet-400' },
  { pairId: 'compass', icon: Compass, color: 'text-emerald-400' },
];

function createShuffledDeck(): MemoryCard[] {
  const deck: MemoryCard[] = [];
  let uid = 0;
  for (const sym of MEMORY_SYMBOLS) {
    deck.push({ uid: uid++, pairId: sym.pairId, flipped: false, matched: false });
    deck.push({ uid: uid++, pairId: sym.pairId, flipped: false, matched: false });
  }
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

interface MathProblem {
  text: string;
  answer: number;
}

interface RiddleItem {
  question: string;
  hint: string;
  answer: string;
  acceptedVariants: string[];
}

function makeMathProblem(level: number): MathProblem {
  const ops = level >= 3 ? ['+', '-', '×'] : ['+', '-'];
  const op = ops[Math.floor(Math.random() * ops.length)];
  const maxVal = Math.min(45, 12 + level * 4);
  let a = Math.floor(Math.random() * maxVal) + 2;
  let b = Math.floor(Math.random() * maxVal) + 2;
  if (op === '×') {
    a = Math.floor(Math.random() * 11) + 2;
    b = Math.floor(Math.random() * 11) + 2;
    return { text: `${a} × ${b} = ?`, answer: a * b };
  }
  if (op === '-' && b > a) {
    [a, b] = [b, a];
  }
  return {
    text: `${a} ${op} ${b} = ?`,
    answer: op === '+' ? a + b : a - b,
  };
}

export const LampoGames: React.FC<LampoGamesProps> = ({
  language,
  isMuted,
  initialGame = null,
}) => {
  const copy = UI_COPY[language];
  const [activeGame, setActiveGame] = useState<GameId | null>(initialGame);
  const [lampoLine, setLampoLine] = useState(copy.gamesSubtitle);
  const [mood, setMood] = useState<LampoMood>('playful');
  const [quirk, setQuirk] = useState<LampoQuirk>('none');
  const [quirkKey, setQuirkKey] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const speakTokenRef = useRef(0);
  const xoTimerRef = useRef<number | null>(null);
  const memoryTimerRef = useRef<number | null>(null);

  // X vs O state
  const [xoBoard, setXoBoard] = useState<XoCell[]>(() => Array(9).fill(null));
  const [xoScore, setXoScore] = useState({ you: 0, lampo: 0 });
  const [xoTurn, setXoTurn] = useState<'X' | 'O'>('X');
  const [xoWinInfo, setXoWinInfo] = useState<{ winner: 'X' | 'O' | 'draw' | null; line: number[] }>({
    winner: null,
    line: [],
  });

  // Math state
  const [mathStreak, setMathStreak] = useState(0);
  const [mathProblem, setMathProblem] = useState<MathProblem>(() => makeMathProblem(0));
  const [mathInput, setMathInput] = useState('');
  const [mathFeedback, setMathFeedback] = useState<'correct' | 'wrong' | null>(null);

  // Memory Match state
  const [memoryCards, setMemoryCards] = useState<MemoryCard[]>(() => createShuffledDeck());
  const [memoryMoves, setMemoryMoves] = useState(0);
  const [memoryLocked, setMemoryLocked] = useState(false);

  // Riddle state
  const [riddle, setRiddle] = useState<RiddleItem | null>(null);
  const [riddleLoading, setRiddleLoading] = useState(false);
  const [riddleInput, setRiddleInput] = useState('');
  const [showHint, setShowHint] = useState(false);
  const [riddleSolved, setRiddleSolved] = useState(false);
  const [prevRiddles, setPrevRiddles] = useState<string[]>([]);

  useEffect(() => {
    if (initialGame) {
      setActiveGame(initialGame);
    }
  }, [initialGame]);

  useEffect(() => {
    return () => {
      speakTokenRef.current += 1;
      if (xoTimerRef.current !== null) window.clearTimeout(xoTimerRef.current);
      if (memoryTimerRef.current !== null) window.clearTimeout(memoryTimerRef.current);
      stopActiveAudio();
    };
  }, []);

  const reactLampo = useCallback(
    async (
      text: string,
      nextMood: LampoMood,
      nextQuirk: LampoQuirk,
      speak = true
    ) => {
      setLampoLine(text);
      setMood(nextMood);
      setQuirk(nextQuirk);
      setQuirkKey((k) => k + 1);

      if (!speak || isMuted || !text.trim()) return;
      const token = ++speakTokenRef.current;
      try {
        const res = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, language, voice: 'Kore', mood: nextMood }),
        });
        if (!res.ok || speakTokenRef.current !== token) return;
        const data = await res.json();
        if (!data?.audioBase64 || speakTokenRef.current !== token) return;
        await playBase64Audio(data.audioBase64, data.mimeType || 'audio/mpeg', {
          onStart: () => {
            if (speakTokenRef.current === token) setIsSpeaking(true);
          },
          onEnd: () => {
            if (speakTokenRef.current === token) setIsSpeaking(false);
          },
          onBlocked: () => {
            if (speakTokenRef.current === token) setIsSpeaking(false);
          },
          onError: () => {
            if (speakTokenRef.current === token) setIsSpeaking(false);
          },
        });
      } catch {
        if (speakTokenRef.current === token) setIsSpeaking(false);
      }
    },
    [isMuted, language]
  );

  const loadNewRiddle = useCallback(async () => {
    setRiddleLoading(true);
    setRiddleInput('');
    setShowHint(false);
    setRiddleSolved(false);
    setMood('curious');
    try {
      const res = await fetch('/api/riddle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language, previousQuestions: prevRiddles }),
      });
      if (!res.ok) throw new Error('Failed');
      const data = (await res.json()) as RiddleItem;
      setRiddle(data);
      setPrevRiddles((p) => [...p.slice(-5), data.question]);
      void reactLampo(`${copy.riddleWelcome} ${data.question}`, 'playful', 'bounce', true);
    } catch {
      const fallback: RiddleItem =
        language === 'ru'
          ? {
              question: 'Висит груша, нельзя скушать. Что это?',
              hint: 'Даёт свет в комнате',
              answer: 'лампочка',
              acceptedVariants: ['лампа', 'лампочка'],
            }
          : language === 'en'
            ? {
                question: 'I have hands, a face, and run all day, yet I never walk. What am I?',
                hint: 'It tells you the time',
                answer: 'clock',
                acceptedVariants: ['a clock', 'clock', 'watch'],
              }
            : language === 'tr'
              ? {
                  question: 'Çarşıdan aldım bir tane, eve geldim bin tane. Nedir bu?',
                  hint: 'Kırmızı taneli bir meyve',
                  answer: 'nar',
                  acceptedVariants: ['nar'],
                }
              : {
                  question: "Qat-qat to'nli, qarich bo'yli, yechintirsang ko'z yosh to'kadi. Bu nima?",
                  hint: 'Oshxonada ovqatga solinadi',
                  answer: 'piyoz',
                  acceptedVariants: ['piyoz'],
                };
      setRiddle(fallback);
      void reactLampo(`${copy.riddleWelcome} ${fallback.question}`, 'playful', 'wiggle', false);
    } finally {
      setRiddleLoading(false);
    }
  }, [language, prevRiddles, reactLampo, copy.riddleWelcome]);

  const resetXoRound = useCallback(
    (resetScore = false) => {
      if (xoTimerRef.current !== null) {
        window.clearTimeout(xoTimerRef.current);
        xoTimerRef.current = null;
      }
      setXoBoard(Array(9).fill(null));
      setXoTurn('X');
      setXoWinInfo({ winner: null, line: [] });
      if (resetScore) {
        setXoScore({ you: 0, lampo: 0 });
      }
    },
    []
  );

  const resetMemoryGame = useCallback(() => {
    if (memoryTimerRef.current !== null) {
      window.clearTimeout(memoryTimerRef.current);
      memoryTimerRef.current = null;
    }
    setMemoryCards(createShuffledDeck());
    setMemoryMoves(0);
    setMemoryLocked(false);
  }, []);

  const openGame = (id: GameId) => {
    void unlockAudioContext();
    setActiveGame(id);
    if (id === 'xo') {
      resetXoRound(true);
      void reactLampo(copy.xoWelcome, 'excited', 'bounce', true);
    } else if (id === 'math') {
      setMathStreak(0);
      setMathProblem(makeMathProblem(0));
      setMathInput('');
      setMathFeedback(null);
      void reactLampo(copy.mathWelcome, 'curious', 'wiggle', true);
    } else if (id === 'memory') {
      resetMemoryGame();
      void reactLampo(copy.memoryWelcome, 'playful', 'bounce', true);
    } else if (id === 'riddle') {
      void loadNewRiddle();
    }
  };

  // X vs O move handler
  const handleXoCellClick = (index: number) => {
    void unlockAudioContext();
    if (xoTurn !== 'X' || xoBoard[index] !== null || xoWinInfo.winner !== null) return;

    const afterPlayer = [...xoBoard];
    afterPlayer[index] = 'X';
    const playerCheck = checkXoWinner(afterPlayer);
    setXoBoard(afterPlayer);

    if (playerCheck.winner === 'X') {
      setXoWinInfo(playerCheck);
      setXoScore((s) => ({ ...s, you: s.you + 1 }));
      void reactLampo(copy.xoWin, 'annoyed', 'shake', true);
      return;
    }
    if (playerCheck.winner === 'draw') {
      setXoWinInfo(playerCheck);
      void reactLampo(copy.xoDraw, 'surprised', 'wiggle', true);
      return;
    }

    setXoTurn('O');
    xoTimerRef.current = window.setTimeout(() => {
      xoTimerRef.current = null;
      const move = pickLampoXoMove(afterPlayer);
      if (move === -1) return;
      const afterBot = [...afterPlayer];
      afterBot[move] = 'O';
      const botCheck = checkXoWinner(afterBot);
      setXoBoard(afterBot);
      setXoTurn('X');

      if (botCheck.winner === 'O') {
        setXoWinInfo(botCheck);
        setXoScore((s) => ({ ...s, lampo: s.lampo + 1 }));
        void reactLampo(copy.xoLose, 'proud', 'jump', true);
      } else if (botCheck.winner === 'draw') {
        setXoWinInfo(botCheck);
        void reactLampo(copy.xoDraw, 'playful', 'wiggle', true);
      }
    }, 360);
  };

  // Math check
  const handleMathSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void unlockAudioContext();
    const num = Number(mathInput.trim());
    if (!Number.isFinite(num) || mathInput.trim() === '') return;

    if (num === mathProblem.answer) {
      const nextStreak = mathStreak + 1;
      setMathStreak(nextStreak);
      setMathFeedback('correct');
      void reactLampo(copy.mathCorrect, 'excited', 'jump', true);
      window.setTimeout(() => {
        setMathProblem(makeMathProblem(nextStreak));
        setMathInput('');
        setMathFeedback(null);
      }, 950);
    } else {
      setMathStreak(0);
      setMathFeedback('wrong');
      void reactLampo(
        `${copy.mathWrong} ${mathProblem.answer}`,
        'playful',
        'shake',
        true
      );
    }
  };

  // Memory Match handler
  const handleMemoryCardClick = (uid: number) => {
    void unlockAudioContext();
    if (memoryLocked) return;

    const clicked = memoryCards.find((c) => c.uid === uid);
    if (!clicked || clicked.flipped || clicked.matched) return;

    const flippedNow = memoryCards.filter((c) => c.flipped && !c.matched);
    const updated = memoryCards.map((c) => (c.uid === uid ? { ...c, flipped: true } : c));
    setMemoryCards(updated);

    if (flippedNow.length === 1) {
      const first = flippedNow[0];
      setMemoryMoves((m) => m + 1);

      if (first.pairId === clicked.pairId) {
        const withMatch = updated.map((c) =>
          c.uid === first.uid || c.uid === clicked.uid ? { ...c, matched: true } : c
        );
        setMemoryCards(withMatch);
        const allMatched = withMatch.every((c) => c.matched);
        if (allMatched) {
          void reactLampo(copy.memoryWon, 'proud', 'jump', true);
        } else {
          void reactLampo(copy.memoryMatch, 'excited', 'bounce', false);
        }
      } else {
        setMemoryLocked(true);
        void reactLampo(copy.memoryMiss, 'playful', 'wiggle', false);
        memoryTimerRef.current = window.setTimeout(() => {
          memoryTimerRef.current = null;
          setMemoryCards((prev) =>
            prev.map((c) =>
              c.uid === first.uid || c.uid === clicked.uid ? { ...c, flipped: false } : c
            )
          );
          setMemoryLocked(false);
        }, 620);
      }
    }
  };

  // Riddle check
  const handleRiddleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!riddle || !riddleInput.trim() || riddleSolved) return;
    void unlockAudioContext();

    const norm = (s: string) =>
      s
        .toLowerCase()
        .replace(/[ʻʼ’‘`´']/g, "'")
        .replace(/[^a-zа-яёğüşöçı'\s]/gi, '')
        .trim();

    const guess = norm(riddleInput);
    const matches = [riddle.answer, ...(riddle.acceptedVariants || [])].some((ans) => {
      const target = norm(ans);
      return target && (guess === target || guess.includes(target) || target.includes(guess));
    });

    if (matches) {
      setRiddleSolved(true);
      void reactLampo(`${copy.riddleCorrect} (${riddle.answer})`, 'proud', 'jump', true);
    } else {
      void reactLampo(copy.riddleWrong, 'playful', 'shake', true);
    }
  };

  const gameCards: Array<{ id: GameId; icon: React.ComponentType<{ className?: string }>; accent: string }> = [
    { id: 'xo', icon: Grid3X3, accent: 'text-sky-400' },
    { id: 'math', icon: Calculator, accent: 'text-emerald-400' },
    { id: 'memory', icon: Layers, accent: 'text-amber-400' },
    { id: 'riddle', icon: HelpCircle, accent: 'text-violet-400' },
  ];

  const matchedPairCount = memoryCards.filter((c) => c.matched).length / 2;
  const memoryComplete = matchedPairCount === MEMORY_SYMBOLS.length;

  return (
    <div className="w-full max-w-3xl mx-auto flex flex-col gap-4">
      {/* Live Reactive Lampo Banner */}
      <div className="rounded-3xl bg-[#131A29]/95 border border-slate-800 p-4 sm:p-5 flex flex-col sm:flex-row items-center gap-4 shadow-[0_14px_40px_rgba(0,0,0,0.45)]">
        <div className="shrink-0 animate-lampo-float">
          <LampoMascot
            size={84}
            mood={mood}
            quirk={quirk}
            quirkKey={quirkKey}
            isSpeaking={isSpeaking}
            isThinking={riddleLoading}
            onClick={() =>
              void reactLampo(copy.pokeQuips[quirkKey % copy.pokeQuips.length], 'playful', 'wiggle', true)
            }
          />
        </div>
        <div className="flex-1 min-w-0 text-center sm:text-left">
          <div className="text-xs font-bold uppercase tracking-wider text-sky-400 mb-1">
            {activeGame ? copy.gameTitles[activeGame] : copy.gamesTitle}
          </div>
          <p className="text-sm sm:text-[15px] font-medium text-slate-100 leading-relaxed">
            {lampoLine}
          </p>
        </div>
        {activeGame && (
          <button
            type="button"
            onClick={() => {
              speakTokenRef.current += 1;
              if (xoTimerRef.current !== null) window.clearTimeout(xoTimerRef.current);
              if (memoryTimerRef.current !== null) window.clearTimeout(memoryTimerRef.current);
              stopActiveAudio();
              setIsSpeaking(false);
              setActiveGame(null);
              setLampoLine(copy.gamesSubtitle);
              setMood('happy');
            }}
            className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#182236] hover:bg-[#1F2C45] border border-slate-700/80 text-xs font-semibold text-slate-200 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{copy.gameBack}</span>
          </button>
        )}
      </div>

      {/* Game Selector Grid OR Active Game Stage */}
      {!activeGame ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {gameCards.map(({ id, icon: Icon, accent }) => (
            <button
              key={id}
              type="button"
              onClick={() => openGame(id)}
              className="group text-left rounded-2xl bg-[#131A29]/90 hover:bg-[#192236] border border-slate-800 hover:border-sky-500/60 p-4 sm:p-5 transition-all flex items-start gap-3.5"
            >
              <div className="w-10 h-10 rounded-xl bg-[#1B253A] border border-slate-700/80 flex items-center justify-center shrink-0">
                <Icon className={`w-5 h-5 ${accent}`} />
              </div>
              <div>
                <div className="text-sm font-bold text-slate-100 group-hover:text-white">
                  {copy.gameTitles[id]}
                </div>
                <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                  {copy.gameDescriptions[id]}
                </p>
              </div>
            </button>
          ))}
        </div>
      ) : activeGame === 'xo' ? (
        <div className="rounded-3xl bg-[#131A29] border border-slate-800 p-5 sm:p-6 space-y-5 text-center">
          {/* Scoreboard */}
          <div className="flex items-center justify-between max-w-xs mx-auto rounded-2xl bg-[#182236] border border-slate-700/80 px-5 py-3">
            <div className="text-center">
              <div className="text-[11px] font-semibold text-slate-400">{copy.gameYou} (X)</div>
              <div className="text-2xl font-extrabold text-sky-400 font-mono-math">
                {xoScore.you}
              </div>
            </div>
            <div className="text-xs font-bold text-slate-500">VS</div>
            <div className="text-center">
              <div className="text-[11px] font-semibold text-slate-400">{copy.gameLampo} (O)</div>
              <div className="text-2xl font-extrabold text-amber-400 font-mono-math">
                {xoScore.lampo}
              </div>
            </div>
          </div>

          {!xoWinInfo.winner && (
            <div className="text-xs font-semibold text-slate-400">
              {xoTurn === 'X' ? copy.xoYourTurn : copy.xoLampoTurn}
            </div>
          )}

          {/* 3x3 Board */}
          <div className="grid grid-cols-3 gap-2.5 max-w-[260px] mx-auto">
            {xoBoard.map((cell, idx) => {
              const isWinCell = xoWinInfo.line.includes(idx);
              return (
                <button
                  key={idx}
                  type="button"
                  disabled={cell !== null || xoWinInfo.winner !== null || xoTurn !== 'X'}
                  onClick={() => handleXoCellClick(idx)}
                  className={`aspect-square rounded-2xl border text-3xl font-black font-mono-math flex items-center justify-center transition-all ${
                    isWinCell
                      ? cell === 'X'
                        ? 'bg-sky-500/20 border-sky-400 text-sky-300 scale-[1.03]'
                        : 'bg-amber-500/20 border-amber-400 text-amber-300 scale-[1.03]'
                      : cell === 'X'
                        ? 'bg-[#182236] border-sky-500/40 text-sky-400'
                        : cell === 'O'
                          ? 'bg-[#182236] border-amber-500/40 text-amber-400'
                          : 'bg-[#182236] hover:bg-[#212E47] border-slate-700/80 hover:border-sky-500/60 active:scale-95'
                  }`}
                >
                  {cell}
                </button>
              );
            })}
          </div>

          {xoWinInfo.winner && (
            <button
              type="button"
              onClick={() => {
                resetXoRound(false);
                void reactLampo(copy.xoWelcome, 'playful', 'bounce', false);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              <span>{copy.gameReset}</span>
            </button>
          )}
        </div>
      ) : activeGame === 'math' ? (
        <div className="rounded-3xl bg-[#131A29] border border-slate-800 p-5 sm:p-6 space-y-5 text-center">
          <div className="inline-flex items-center gap-2 rounded-xl bg-[#182236] border border-slate-700/80 px-3.5 py-1.5 text-xs font-bold text-emerald-300">
            <Sparkles className="w-3.5 h-3.5" />
            <span>
              {copy.mathStreak}: {mathStreak}
            </span>
          </div>

          <div className="text-3xl sm:text-4xl font-extrabold font-mono-math text-slate-50 tracking-wide">
            {mathProblem.text}
          </div>

          <form
            onSubmit={handleMathSubmit}
            className="flex items-center justify-center gap-2 max-w-xs mx-auto"
          >
            <input
              type="number"
              value={mathInput}
              onChange={(e) => setMathInput(e.target.value)}
              placeholder={copy.mathPlaceholder}
              className="w-36 rounded-xl bg-[#182236] border border-slate-700 px-3.5 py-2.5 text-center text-base font-bold font-mono-math text-slate-100 focus:outline-none focus:border-sky-500"
            />
            <button
              type="submit"
              className="px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold transition-colors"
            >
              {copy.mathCheck}
            </button>
          </form>

          {mathFeedback === 'wrong' && (
            <button
              type="button"
              onClick={() => {
                setMathProblem(makeMathProblem(0));
                setMathInput('');
                setMathFeedback(null);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#182236] hover:bg-[#1F2C45] border border-slate-700 text-xs font-semibold text-slate-200"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{copy.mathNext}</span>
            </button>
          )}
        </div>
      ) : activeGame === 'memory' ? (
        <div className="rounded-3xl bg-[#131A29] border border-slate-800 p-5 sm:p-6 space-y-4 text-center">
          <div className="flex items-center justify-center gap-6 text-xs font-semibold text-slate-400">
            <span>
              {copy.memoryMoves}:{' '}
              <span className="font-mono-math text-amber-300 font-bold">{memoryMoves}</span>
            </span>
            <span>
              {copy.memoryPairs}:{' '}
              <span className="font-mono-math text-emerald-300 font-bold">
                {matchedPairCount} / {MEMORY_SYMBOLS.length}
              </span>
            </span>
          </div>

          <div className="grid grid-cols-4 gap-2.5 max-w-sm mx-auto">
            {memoryCards.map((card) => {
              const sym = MEMORY_SYMBOLS.find((s) => s.pairId === card.pairId);
              const Icon = sym?.icon || Atom;
              const isFaceUp = card.flipped || card.matched;
              return (
                <button
                  key={card.uid}
                  type="button"
                  disabled={isFaceUp || memoryLocked}
                  onClick={() => handleMemoryCardClick(card.uid)}
                  className={`aspect-square rounded-2xl border flex items-center justify-center transition-all duration-200 ${
                    card.matched
                      ? 'bg-emerald-500/15 border-emerald-400/60 scale-[0.98]'
                      : isFaceUp
                        ? 'bg-[#212E47] border-sky-400/70'
                        : 'bg-[#182236] hover:bg-[#202C44] border-slate-700/80 hover:border-amber-400/50 active:scale-95'
                  }`}
                >
                  {isFaceUp ? (
                    <Icon className={`w-7 h-7 ${sym?.color || 'text-sky-400'}`} />
                  ) : (
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-600/80" />
                  )}
                </button>
              );
            })}
          </div>

          {memoryComplete && (
            <button
              type="button"
              onClick={() => {
                resetMemoryGame();
                void reactLampo(copy.memoryWelcome, 'playful', 'bounce', false);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              <span>{copy.gameReset}</span>
            </button>
          )}
        </div>
      ) : (
        <div className="rounded-3xl bg-[#131A29] border border-slate-800 p-5 sm:p-6 space-y-4">
          {riddleLoading ? (
            <div className="flex items-center justify-center py-6 text-slate-400 gap-2 text-sm">
              <Loader2 className="w-4 h-4 animate-spin text-sky-400" />
              <span>...</span>
            </div>
          ) : (
            riddle && (
              <>
                <p className="text-base font-bold text-slate-100 leading-relaxed text-center">
                  {riddle.question}
                </p>

                {showHint && (
                  <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 px-3.5 py-2 text-xs text-amber-200 text-center">
                    {riddle.hint}
                  </div>
                )}

                {!riddleSolved ? (
                  <form
                    onSubmit={handleRiddleSubmit}
                    className="flex flex-col sm:flex-row items-center justify-center gap-2 max-w-md mx-auto"
                  >
                    <input
                      type="text"
                      value={riddleInput}
                      onChange={(e) => setRiddleInput(e.target.value)}
                      placeholder={copy.riddlePlaceholder}
                      className="w-full sm:flex-1 rounded-xl bg-[#182236] border border-slate-700 px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-sky-500"
                    />
                    <div className="flex items-center gap-2">
                      <button
                        type="submit"
                        className="px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold transition-colors"
                      >
                        {copy.riddleCheckBtn}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowHint(true)}
                        className="px-3 py-2.5 rounded-xl bg-[#182236] hover:bg-[#1F2C45] border border-slate-700 text-xs font-semibold text-amber-300 inline-flex items-center gap-1"
                      >
                        <Lightbulb className="w-3.5 h-3.5" />
                        <span>{copy.riddleHintBtn}</span>
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="text-center space-y-3">
                    <div className="text-sm font-bold text-emerald-300">
                      {copy.riddleReveal} {riddle.answer}
                    </div>
                    <button
                      type="button"
                      onClick={() => void loadNewRiddle()}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold transition-colors"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>{copy.riddleNewBtn}</span>
                    </button>
                  </div>
                )}

                {!riddleSolved && (
                  <div className="flex justify-center pt-1">
                    <button
                      type="button"
                      onClick={() => void loadNewRiddle()}
                      className="text-xs font-semibold text-slate-400 hover:text-slate-200 underline underline-offset-4"
                    >
                      {copy.riddleNewBtn}
                    </button>
                  </div>
                )}
              </>
            )
          )}
        </div>
      )}
    </div>
  );
};
