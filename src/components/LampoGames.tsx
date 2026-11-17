import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ArrowLeft,
  Calculator,
  Hand,
  HelpCircle,
  Hash,
  RotateCcw,
  Scissors,
  ScrollText,
  Sparkles,
  Loader2,
  Lightbulb,
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

type RpsChoice = 'rock' | 'paper' | 'scissors';

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

  // RPS state
  const [rpsScore, setRpsScore] = useState({ you: 0, lampo: 0 });
  const [rpsLast, setRpsLast] = useState<{
    you: RpsChoice;
    lampo: RpsChoice;
    result: 'win' | 'lose' | 'draw';
  } | null>(null);

  // Math state
  const [mathStreak, setMathStreak] = useState(0);
  const [mathProblem, setMathProblem] = useState<MathProblem>(() => makeMathProblem(0));
  const [mathInput, setMathInput] = useState('');
  const [mathFeedback, setMathFeedback] = useState<'correct' | 'wrong' | null>(null);

  // Guess number state
  const [secretNum, setSecretNum] = useState(() => Math.floor(Math.random() * 50) + 1);
  const [guessInput, setGuessInput] = useState('');
  const [guessAttempts, setGuessAttempts] = useState(0);
  const [guessWon, setGuessWon] = useState(false);

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
          body: JSON.stringify({ text, language, voice: 'Kore' }),
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

  const openGame = (id: GameId) => {
    void unlockAudioContext();
    setActiveGame(id);
    if (id === 'rps') {
      setRpsScore({ you: 0, lampo: 0 });
      setRpsLast(null);
      void reactLampo(copy.rpsWelcome, 'excited', 'bounce', true);
    } else if (id === 'math') {
      setMathStreak(0);
      setMathProblem(makeMathProblem(0));
      setMathInput('');
      setMathFeedback(null);
      void reactLampo(copy.mathWelcome, 'curious', 'wiggle', true);
    } else if (id === 'guess') {
      setSecretNum(Math.floor(Math.random() * 50) + 1);
      setGuessInput('');
      setGuessAttempts(0);
      setGuessWon(false);
      void reactLampo(copy.guessWelcome, 'playful', 'bounce', true);
    } else if (id === 'riddle') {
      void loadNewRiddle();
    }
  };

  // RPS move
  const handleRpsPick = (choice: RpsChoice) => {
    void unlockAudioContext();
    const choices: RpsChoice[] = ['rock', 'paper', 'scissors'];
    const bot = choices[Math.floor(Math.random() * 3)];
    let result: 'win' | 'lose' | 'draw' = 'draw';
    if (
      (choice === 'rock' && bot === 'scissors') ||
      (choice === 'paper' && bot === 'rock') ||
      (choice === 'scissors' && bot === 'paper')
    ) {
      result = 'win';
    } else if (choice !== bot) {
      result = 'lose';
    }

    setRpsLast({ you: choice, lampo: bot, result });
    if (result === 'win') {
      setRpsScore((s) => ({ ...s, you: s.you + 1 }));
      void reactLampo(copy.rpsWin, 'annoyed', 'shake', true);
    } else if (result === 'lose') {
      setRpsScore((s) => ({ ...s, lampo: s.lampo + 1 }));
      void reactLampo(copy.rpsLose, 'proud', 'bounce', true);
    } else {
      void reactLampo(copy.rpsDraw, 'surprised', 'wiggle', true);
    }
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

  // Guess number check
  const handleGuessSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void unlockAudioContext();
    const val = Number(guessInput.trim());
    if (!Number.isFinite(val) || val < 1 || val > 50 || guessWon) return;

    const attempts = guessAttempts + 1;
    setGuessAttempts(attempts);
    setGuessInput('');

    if (val === secretNum) {
      setGuessWon(true);
      void reactLampo(copy.guessWon, 'proud', 'jump', true);
    } else if (Math.abs(val - secretNum) <= 4) {
      void reactLampo(
        `${copy.guessHot} (${val < secretNum ? '↑' : '↓'})`,
        'surprised',
        'wiggle',
        true
      );
    } else if (val < secretNum) {
      void reactLampo(copy.guessHigher, 'curious', 'bounce', true);
    } else {
      void reactLampo(copy.guessLower, 'playful', 'shake', true);
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
    { id: 'rps', icon: Hand, accent: 'text-sky-400' },
    { id: 'math', icon: Calculator, accent: 'text-emerald-400' },
    { id: 'guess', icon: Hash, accent: 'text-amber-400' },
    { id: 'riddle', icon: HelpCircle, accent: 'text-violet-400' },
  ];

  const rpsIcon = (c: RpsChoice) =>
    c === 'rock' ? Hand : c === 'paper' ? ScrollText : Scissors;

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
      ) : activeGame === 'rps' ? (
        <div className="rounded-3xl bg-[#131A29] border border-slate-800 p-5 sm:p-6 space-y-5">
          {/* Scoreboard */}
          <div className="flex items-center justify-between max-w-xs mx-auto rounded-2xl bg-[#182236] border border-slate-700/80 px-5 py-3">
            <div className="text-center">
              <div className="text-[11px] font-semibold text-slate-400">{copy.gameYou}</div>
              <div className="text-2xl font-extrabold text-sky-400 font-mono-math">
                {rpsScore.you}
              </div>
            </div>
            <div className="text-xs font-bold text-slate-500">VS</div>
            <div className="text-center">
              <div className="text-[11px] font-semibold text-slate-400">{copy.gameLampo}</div>
              <div className="text-2xl font-extrabold text-amber-400 font-mono-math">
                {rpsScore.lampo}
              </div>
            </div>
          </div>

          {rpsLast && (
            <div className="flex items-center justify-center gap-6 text-xs text-slate-300">
              {(() => {
                const YouIcon = rpsIcon(rpsLast.you);
                const BotIcon = rpsIcon(rpsLast.lampo);
                return (
                  <>
                    <div className="flex items-center gap-2 rounded-xl bg-[#182236] px-3.5 py-2 border border-sky-500/40">
                      <YouIcon className="w-4 h-4 text-sky-400" />
                      <span>{copy.rpsChoices[rpsLast.you]}</span>
                    </div>
                    <span className="text-slate-500 font-bold">vs</span>
                    <div className="flex items-center gap-2 rounded-xl bg-[#182236] px-3.5 py-2 border border-amber-500/40">
                      <BotIcon className="w-4 h-4 text-amber-400" />
                      <span>{copy.rpsChoices[rpsLast.lampo]}</span>
                    </div>
                  </>
                );
              })()}
            </div>
          )}

          {/* Action Buttons */}
          <div className="grid grid-cols-3 gap-3 max-w-md mx-auto">
            {(['rock', 'paper', 'scissors'] as RpsChoice[]).map((c) => {
              const Icon = rpsIcon(c);
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => handleRpsPick(c)}
                  className="rounded-2xl bg-[#192338] hover:bg-[#22304D] border border-slate-700/90 hover:border-sky-500/70 py-4 px-3 flex flex-col items-center gap-2 transition-all active:scale-95"
                >
                  <Icon className="w-6 h-6 text-sky-300" />
                  <span className="text-xs font-bold text-slate-100">
                    {copy.rpsChoices[c]}
                  </span>
                </button>
              );
            })}
          </div>
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
      ) : activeGame === 'guess' ? (
        <div className="rounded-3xl bg-[#131A29] border border-slate-800 p-5 sm:p-6 space-y-4 text-center">
          <div className="text-xs font-semibold text-slate-400">
            {copy.guessAttempts}: <span className="font-mono-math text-amber-300 font-bold">{guessAttempts}</span>
          </div>

          {!guessWon ? (
            <form
              onSubmit={handleGuessSubmit}
              className="flex items-center justify-center gap-2 max-w-xs mx-auto"
            >
              <input
                type="number"
                min={1}
                max={50}
                value={guessInput}
                onChange={(e) => setGuessInput(e.target.value)}
                placeholder={copy.guessPlaceholder}
                className="w-36 rounded-xl bg-[#182236] border border-slate-700 px-3.5 py-2.5 text-center text-base font-bold font-mono-math text-slate-100 focus:outline-none focus:border-sky-500"
              />
              <button
                type="submit"
                className="px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold transition-colors"
              >
                {copy.guessButton}
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => openGame('guess')}
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
