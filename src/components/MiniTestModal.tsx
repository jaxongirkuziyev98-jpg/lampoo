import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  X,
  CheckCircle2,
  XCircle,
  Lightbulb,
  RotateCcw,
  ArrowRight,
  Loader2,
  Layers,
  ListChecks,
} from 'lucide-react';
import type {
  AppLanguage,
  LampoMood,
  LampoQuirk,
  LessonPlan,
  QuizQuestion,
  SrsCard,
  StudyTrack,
} from '../types/lesson';
import { UI_COPY } from '../i18n/translations';
import { LampoMascot } from './LampoMascot';
import { recordSrsAnswer } from '../utils/spacedRepetition';

interface QueueItem {
  question: QuizQuestion;
  isRetry: boolean;
  lessonId: string;
  lessonTitle: string;
  subject: string;
  track: StudyTrack;
}

interface MiniTestModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: AppLanguage;
  lesson?: LessonPlan | null;
  srsCards?: SrsCard[];
  onQuizLoaded?: (lessonId: string, questions: QuizQuestion[]) => void;
  onSrsUpdated?: () => void;
}

const OPTION_LETTERS = ['A', 'B', 'C', 'D'] as const;

export const MiniTestModal: React.FC<MiniTestModalProps> = ({
  isOpen,
  onClose,
  language,
  lesson,
  srsCards,
  onQuizLoaded,
  onSrsUpdated,
}) => {
  const copy = UI_COPY[language];
  const isReviewMode = Boolean(srsCards && srsCards.length > 0 && !lesson);

  const [subMode, setSubMode] = useState<'quiz' | 'flashcard'>('quiz');
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [cursor, setCursor] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);

  const [firstTryRight, setFirstTryRight] = useState(0);
  const [requeuedIds, setRequeuedIds] = useState<Set<string>>(new Set());
  const [finished, setFinished] = useState(false);

  const [lampoMood, setLampoMood] = useState<LampoMood>('curious');
  const [lampoQuirk, setLampoQuirk] = useState<LampoQuirk>('none');
  const [quirkKey, setQuirkKey] = useState(0);
  const [lampoNote, setLampoNote] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const buildQueueFromQuestions = useCallback(
    (items: QuizQuestion[], meta?: { lessonId: string; lessonTitle: string; subject: string; track: StudyTrack }) => {
      const nextQueue: QueueItem[] = items.map((q) => {
        const card = q as Partial<SrsCard>;
        return {
          question: q,
          isRetry: Boolean(card.wrongCount && card.wrongCount > 0),
          lessonId: meta?.lessonId || card.lessonId || 'srs',
          lessonTitle: meta?.lessonTitle || card.lessonTitle || copy.srsReviewTitle,
          subject: meta?.subject || card.subject || 'Dars',
          track: meta?.track || card.track || 'general',
        };
      });
      setQueue(nextQueue);
      setCursor(0);
      setSelectedOption(null);
      setShowHint(false);
      setIsFlipped(false);
      setFirstTryRight(0);
      setRequeuedIds(new Set());
      setFinished(false);
      setLampoMood('curious');
      setLampoQuirk('bounce');
      setQuirkKey((k) => k + 1);
      setLampoNote(null);
    },
    [copy.srsReviewTitle]
  );

  const loadLessonQuiz = useCallback(async () => {
    if (!lesson) return;
    if (lesson.quizQuestions && lesson.quizQuestions.length > 0) {
      buildQueueFromQuestions(lesson.quizQuestions, {
        lessonId: lesson.id,
        lessonTitle: lesson.title,
        subject: lesson.subject,
        track: lesson.track || 'general',
      });
      return;
    }

    setIsLoading(true);
    setLoadError(null);
    try {
      const notesExcerpt = (lesson.steps || [])
        .slice(0, 5)
        .map((s) => `${s.stepTitle}: ${s.writtenNotes}`)
        .join('\n');

      const res = await fetch('/api/lesson/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: lesson.title,
          subject: lesson.subject,
          summary: lesson.summary,
          formulaOrFact: lesson.formulaOrFact,
          keyTakeaways: lesson.keyTakeaways,
          notesExcerpt,
          track: lesson.track || 'general',
          language: lesson.language || language,
        }),
      });
      const data = await res.json();
      if (!mountedRef.current) return;

      if (!res.ok || !Array.isArray(data?.questions) || data.questions.length === 0) {
        throw new Error(typeof data?.error === 'string' ? data.error : copy.miniTestError);
      }

      const fetched = data.questions as QuizQuestion[];
      onQuizLoaded?.(lesson.id, fetched);
      buildQueueFromQuestions(fetched, {
        lessonId: lesson.id,
        lessonTitle: lesson.title,
        subject: lesson.subject,
        track: lesson.track || 'general',
      });
    } catch (err) {
      if (!mountedRef.current) return;
      setLoadError(err instanceof Error ? err.message : copy.miniTestError);
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [lesson, language, buildQueueFromQuestions, copy.miniTestError, onQuizLoaded]);

  useEffect(() => {
    if (!isOpen) return;
    if (srsCards && srsCards.length > 0 && !lesson) {
      buildQueueFromQuestions(srsCards.slice(0, 6));
      setLoadError(null);
      setIsLoading(false);
    } else if (lesson) {
      void loadLessonQuiz();
    }
  }, [isOpen, lesson, srsCards, buildQueueFromQuestions, loadLessonQuiz]);

  if (!isOpen) return null;

  const currentItem = queue[cursor];
  const uniqueTotal = isReviewMode
    ? srsCards?.length || queue.length
    : lesson?.quizQuestions?.length || queue.filter((item) => !item.isRetry).length || queue.length;

  const handleSelectOption = (optionIdx: number) => {
    if (!currentItem || selectedOption !== null) return;
    setSelectedOption(optionIdx);

    const isCorrect = optionIdx === currentItem.question.correctIndex;
    recordSrsAnswer({
      question: currentItem.question,
      lessonId: currentItem.lessonId,
      lessonTitle: currentItem.lessonTitle,
      subject: currentItem.subject,
      track: currentItem.track,
      isCorrect,
    });
    onSrsUpdated?.();

    if (isCorrect) {
      if (!currentItem.isRetry) {
        setFirstTryRight((c) => c + 1);
      }
      setLampoMood('excited');
      setLampoQuirk('bounce');
      setQuirkKey((k) => k + 1);
      setLampoNote(copy.miniTestCorrectReact);
    } else {
      setLampoMood('sad');
      setLampoQuirk('shake');
      setQuirkKey((k) => k + 1);
      setLampoNote(copy.miniTestWrongReact);

      // Spaced repetition inside the active session: re-insert missed question 2 steps later
      const qId = currentItem.question.id;
      if (!requeuedIds.has(qId)) {
        setRequeuedIds((prev) => new Set(prev).add(qId));
        setQueue((prev) => {
          const copyQueue = [...prev];
          const insertAt = Math.min(copyQueue.length, cursor + 3);
          copyQueue.splice(insertAt, 0, {
            ...currentItem,
            isRetry: true,
          });
          return copyQueue;
        });
      }
    }
  };

  const advanceNext = () => {
    if (cursor + 1 >= queue.length) {
      setFinished(true);
      setLampoMood('proud');
      setLampoQuirk('jump');
      setQuirkKey((k) => k + 1);
      setLampoNote(null);
      return;
    }
    setCursor((c) => c + 1);
    setSelectedOption(null);
    setShowHint(false);
    setIsFlipped(false);
    setLampoMood('curious');
    setLampoNote(null);
  };

  const handleFlashcardRate = (known: boolean) => {
    if (!currentItem) return;
    recordSrsAnswer({
      question: currentItem.question,
      lessonId: currentItem.lessonId,
      lessonTitle: currentItem.lessonTitle,
      subject: currentItem.subject,
      track: currentItem.track,
      isCorrect: known,
    });
    onSrsUpdated?.();

    if (known) {
      if (!currentItem.isRetry) {
        setFirstTryRight((c) => c + 1);
      }
      setLampoMood('happy');
      setLampoQuirk('bounce');
      setQuirkKey((k) => k + 1);
    } else {
      setLampoMood('curious');
      setLampoQuirk('wiggle');
      setQuirkKey((k) => k + 1);
      const qId = currentItem.question.id;
      if (!requeuedIds.has(qId)) {
        setRequeuedIds((prev) => new Set(prev).add(qId));
        setQueue((prev) => {
          const copyQueue = [...prev];
          const insertAt = Math.min(copyQueue.length, cursor + 3);
          copyQueue.splice(insertAt, 0, {
            ...currentItem,
            isRetry: true,
          });
          return copyQueue;
        });
      }
    }
    advanceNext();
  };

  const handleRestart = () => {
    if (srsCards && srsCards.length > 0 && !lesson) {
      buildQueueFromQuestions(srsCards.slice(0, 6));
    } else if (lesson?.quizQuestions) {
      buildQueueFromQuestions(lesson.quizQuestions, {
        lessonId: lesson.id,
        lessonTitle: lesson.title,
        subject: lesson.subject,
        track: lesson.track || 'general',
      });
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4"
      role="dialog"
      aria-modal="true"
      aria-label={copy.miniTestTitle}
    >
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />
      <div className="relative z-10 w-full max-w-2xl rounded-3xl bg-[#0F1522] border border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3.5 min-w-0">
            <LampoMascot
              size={44}
              mood={isLoading ? 'curious' : lampoMood}
              quirk={lampoQuirk}
              quirkKey={quirkKey}
              isThinking={isLoading}
            />
            <div className="min-w-0">
              <h2 className="text-base font-bold text-slate-50 truncate">
                {isReviewMode ? copy.srsReviewTitle : copy.miniTestTitle}
              </h2>
              <div className="flex items-center gap-2 text-xs text-slate-400 truncate">
                <span className="truncate">
                  {currentItem?.lessonTitle || lesson?.title || copy.srsReviewTitle}
                </span>
                {queue.length > 0 && !finished && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono-math text-slate-300 shrink-0">
                      {cursor + 1} / {queue.length}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {!isLoading && !loadError && !finished && queue.length > 0 && (
              <div className="hidden sm:inline-flex items-center gap-1 p-1 rounded-xl bg-[#162033] border border-slate-800">
                <button
                  type="button"
                  onClick={() => setSubMode('quiz')}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                    subMode === 'quiz'
                      ? 'bg-sky-500 text-slate-950'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  <ListChecks className="w-3.5 h-3.5" />
                  <span>{copy.miniTestTestMode}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSubMode('flashcard');
                    setIsFlipped(false);
                  }}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                    subMode === 'flashcard'
                      ? 'bg-sky-500 text-slate-950'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>{copy.miniTestFlashcardMode}</span>
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-xl border border-slate-700/80 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mobile sub-mode switcher */}
        {!isLoading && !loadError && !finished && queue.length > 0 && (
          <div className="sm:hidden px-5 pt-3 flex items-center gap-1">
            <button
              type="button"
              onClick={() => setSubMode('quiz')}
              className={`flex-1 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
                subMode === 'quiz'
                  ? 'bg-sky-500 border-sky-500 text-slate-950'
                  : 'bg-[#162033] border-slate-800 text-slate-300'
              }`}
            >
              {copy.miniTestTestMode}
            </button>
            <button
              type="button"
              onClick={() => {
                setSubMode('flashcard');
                setIsFlipped(false);
              }}
              className={`flex-1 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
                subMode === 'flashcard'
                  ? 'bg-sky-500 border-sky-500 text-slate-950'
                  : 'bg-[#162033] border-slate-800 text-slate-300'
              }`}
            >
              {copy.miniTestFlashcardMode}
            </button>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5">
          {isLoading ? (
            <div className="py-14 flex flex-col items-center text-center">
              <Loader2 className="w-8 h-8 text-sky-400 animate-spin mb-3" />
              <p className="text-sm font-semibold text-slate-200">{copy.miniTestLoading}</p>
            </div>
          ) : loadError ? (
            <div className="py-12 text-center space-y-4">
              <p className="text-sm text-rose-300">{loadError}</p>
              <button
                type="button"
                onClick={() => void loadLessonQuiz()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{copy.miniTestRetryLoad}</span>
              </button>
            </div>
          ) : finished ? (
            <div className="py-8 text-center space-y-5">
              <div className="font-mono-math text-4xl font-extrabold text-sky-400">
                {firstTryRight} / {Math.max(1, uniqueTotal)}
              </div>
              <div className="space-y-1.5">
                <h3 className="text-lg font-bold text-slate-50">{copy.miniTestSummaryTitle}</h3>
                <p className="text-sm text-slate-400 max-w-md mx-auto">
                  {copy.miniTestSummaryNote}
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleRestart}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#182133] hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{copy.miniTestRestartBtn}</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold transition-colors"
                >
                  <span>{copy.miniTestCloseBtn}</span>
                </button>
              </div>
            </div>
          ) : currentItem && subMode === 'flashcard' ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>{currentItem.subject}</span>
                {currentItem.isRetry && (
                  <span className="font-semibold text-amber-400">{copy.miniTestRetryLabel}</span>
                )}
              </div>

              <button
                type="button"
                onClick={() => setIsFlipped((f) => !f)}
                className="w-full min-h-[210px] rounded-2xl bg-[#131B2C] hover:bg-[#162033] border border-slate-700/80 p-6 text-left flex flex-col justify-between transition-colors"
              >
                <div className="text-xs font-semibold text-sky-400">
                  {isFlipped ? copy.formulaTitle : copy.miniTestFlashcardMode}
                </div>
                <div className="py-4 text-base sm:text-lg font-bold text-slate-100 leading-relaxed">
                  {isFlipped
                    ? currentItem.question.flashcardBack
                    : currentItem.question.flashcardFront}
                </div>
                <div className="text-xs text-slate-400">
                  {isFlipped ? currentItem.question.explanation : copy.miniTestFlipPrompt}
                </div>
              </button>

              {isFlipped && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => handleFlashcardRate(false)}
                    className="py-2.5 px-4 rounded-xl bg-[#182133] hover:bg-amber-950/50 border border-slate-700 hover:border-amber-500/60 text-xs font-semibold text-amber-300 transition-colors"
                  >
                    {copy.miniTestHardBtn}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleFlashcardRate(true)}
                    className="py-2.5 px-4 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/50 text-xs font-semibold text-emerald-300 transition-colors"
                  >
                    {copy.miniTestEasyBtn}
                  </button>
                </div>
              )}
            </div>
          ) : currentItem ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2 text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <span>{currentItem.subject}</span>
                  {currentItem.isRetry && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="font-semibold text-amber-400">
                        {copy.miniTestRetryLabel}
                      </span>
                    </>
                  )}
                </div>
                {currentItem.question.hint && selectedOption === null && (
                  <button
                    type="button"
                    onClick={() => setShowHint((h) => !h)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-sky-400 hover:text-sky-300 transition-colors"
                  >
                    <Lightbulb className="w-3.5 h-3.5" />
                    <span>{copy.miniTestHintBtn}</span>
                  </button>
                )}
              </div>

              <h3 className="text-base sm:text-lg font-bold text-slate-50 leading-snug">
                {currentItem.question.question}
              </h3>

              {showHint && selectedOption === null && (
                <div className="rounded-xl bg-[#162033] border border-slate-700/80 px-3.5 py-2.5 text-xs text-sky-200 leading-relaxed">
                  {currentItem.question.hint}
                </div>
              )}

              <div className="space-y-2.5">
                {currentItem.question.options.map((opt, idx) => {
                  const isAnswered = selectedOption !== null;
                  const isChosen = selectedOption === idx;
                  const isRightOpt = idx === currentItem.question.correctIndex;

                  let styleClass =
                    'bg-[#131B2C] border-slate-800 hover:border-sky-500/60 text-slate-200';
                  if (isAnswered) {
                    if (isRightOpt) {
                      styleClass =
                        'bg-emerald-950/50 border-emerald-500/70 text-emerald-100';
                    } else if (isChosen) {
                      styleClass =
                        'bg-rose-950/50 border-rose-500/70 text-rose-100';
                    } else {
                      styleClass = 'bg-[#111826] border-slate-800/60 text-slate-500';
                    }
                  }

                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={isAnswered}
                      onClick={() => handleSelectOption(idx)}
                      className={`w-full text-left rounded-2xl border px-4 py-3 text-sm font-medium transition-colors flex items-center justify-between gap-3 ${styleClass}`}
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <span className="font-mono-math text-xs font-bold text-slate-400 mt-0.5 shrink-0">
                          {OPTION_LETTERS[idx]}
                        </span>
                        <span className="leading-snug">{opt}</span>
                      </div>
                      {isAnswered && isRightOpt && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      )}
                      {isAnswered && isChosen && !isRightOpt && (
                        <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>

              {selectedOption !== null && (
                <div className="rounded-2xl bg-[#141D2F] border border-slate-700/80 p-4 space-y-3">
                  {lampoNote && (
                    <div
                      className={`text-xs font-bold ${
                        selectedOption === currentItem.question.correctIndex
                          ? 'text-emerald-400'
                          : 'text-amber-400'
                      }`}
                    >
                      {lampoNote}
                    </div>
                  )}
                  <p className="text-xs sm:text-[13px] text-slate-300 leading-relaxed">
                    {currentItem.question.explanation}
                  </p>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={advanceNext}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold transition-colors"
                    >
                      <span>
                        {cursor + 1 >= queue.length
                          ? copy.miniTestFinishBtn
                          : copy.miniTestNextBtn}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
