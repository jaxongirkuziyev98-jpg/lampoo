import { useState, useEffect, useCallback, useRef } from 'react';
import type { AppLanguage, LessonDepth, LessonPlan } from './types/lesson';
import { HomeScreen } from './components/HomeScreen';
import { LessonPlayer } from './components/LessonPlayer';
import { HistoryDrawer } from './components/HistoryDrawer';

const HISTORY_STORAGE_KEY = 'lampo_lesson_history_v1';
const LANGUAGE_STORAGE_KEY = 'lampo_language_v1';

export default function App() {
  const [language, setLanguage] = useState<AppLanguage>(() => {
    try {
      const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (saved === 'uz' || saved === 'ru' || saved === 'en' || saved === 'tr') {
        return saved;
      }
    } catch {
      // ignore
    }
    return 'uz';
  });

  const [activeLesson, setActiveLesson] = useState<LessonPlan | null>(null);
  const [history, setHistory] = useState<LessonPlan[]>(() => {
    try {
      const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
      return raw ? (JSON.parse(raw) as LessonPlan[]) : [];
    } catch {
      return [];
    }
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isContinuingLecture, setIsContinuingLecture] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const activeLessonRef = useRef<LessonPlan | null>(null);
  activeLessonRef.current = activeLesson;
  const continuingRef = useRef(false);
  const generatingRef = useRef(false);

  useEffect(() => {
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    } catch {
      // ignore
    }
  }, [language]);

  useEffect(() => {
    try {
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history.slice(0, 25)));
    } catch {
      // Ignore storage quota errors
    }
  }, [history]);

  const generateLesson = useCallback(
    async (
      question: string,
      depth: LessonDepth = 'batafsil',
      useInternet = false,
      previousContext?: string
    ) => {
      if (generatingRef.current) return;
      generatingRef.current = true;
      setIsLoading(true);
      setErrorMessage(null);
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 45000);
      try {
        const res = await fetch('/api/lesson', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            question,
            depth,
            language,
            useInternet,
            previousContext,
          }),
        });

        const raw = await res.text();
        let data: Record<string, unknown> = {};
        try {
          data = raw ? JSON.parse(raw) : {};
        } catch {
          data = {};
        }
        if (!res.ok) {
          const errMsg =
            typeof data?.error === 'string'
              ? data.error
              : "Server bilan bog'lanishda xatolik yuz berdi. Qayta urinib ko'ring.";
          throw new Error(errMsg);
        }

        const lesson = data as unknown as LessonPlan;
        if (!lesson || !Array.isArray(lesson.steps) || lesson.steps.length === 0) {
          throw new Error("Dars ma'lumotlari to'liq kelmadi. Iltimos, qayta urinib ko'ring.");
        }
        setActiveLesson(lesson);
        setHistory((prev) => [lesson, ...prev.filter((item) => item.id !== lesson.id)]);
      } catch (err) {
        const isAbort = err instanceof Error && err.name === 'AbortError';
        const msg = isAbort
          ? "Javob kutish vaqti tugadi. Iltimos, qayta urinib ko'ring."
          : err instanceof Error
            ? err.message
            : "Tarmoq xatosi. Qaytadan urinib ko'ring.";
        setErrorMessage(msg);
      } finally {
        window.clearTimeout(timeoutId);
        generatingRef.current = false;
        setIsLoading(false);
      }
    },
    [language]
  );

  const requestContinuation = useCallback(async (): Promise<boolean> => {
    const current = activeLessonRef.current;
    if (!current || continuingRef.current) return false;
    // Cap continuous expansion cleanly at ~48 scenes (~30-60 minutes of spoken lecture)
    if (current.steps.length >= 48) return false;

    continuingRef.current = true;
    setIsContinuingLecture(true);
    try {
      const res = await fetch('/api/lesson', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: current.question,
          depth: current.depth || 'batafsil',
          language: current.language || language,
          previousContext: current.summary,
          continuation: true,
          coveredTitles: current.steps.map((s) => s.stepTitle),
        }),
      });

      if (!res.ok) return false;
      const nextPart = (await res.json()) as LessonPlan;
      if (!nextPart?.steps?.length) return false;

      setActiveLesson((prev) => {
        if (!prev || prev.id !== current.id) return prev;
        const baseCount = prev.steps.length;
        const appended = nextPart.steps.map((s, idx) => ({
          ...s,
          stepNumber: baseCount + idx + 1,
        }));
        const updated: LessonPlan = {
          ...prev,
          steps: [...prev.steps, ...appended],
          keyTakeaways:
            nextPart.keyTakeaways?.length > 0
              ? nextPart.keyTakeaways
              : prev.keyTakeaways,
        };
        setHistory((h) => h.map((item) => (item.id === updated.id ? updated : item)));
        return updated;
      });
      return true;
    } catch {
      return false;
    } finally {
      continuingRef.current = false;
      setIsContinuingLecture(false);
    }
  }, [language]);

  const handleDeleteLesson = useCallback((id: string) => {
    setHistory((prev) => prev.filter((item) => item.id !== id));
  }, []);

  return (
    <>
      {activeLesson ? (
        <LessonPlayer
          key={activeLesson.id}
          lesson={activeLesson}
          language={language}
          onChangeLanguage={setLanguage}
          isMuted={isMuted}
          onToggleMute={() => setIsMuted((m) => !m)}
          onGoHome={() => {
            setActiveLesson(null);
            setErrorMessage(null);
          }}
          onOpenHistory={() => setHistoryOpen(true)}
          onAskFollowUp={(q) =>
            generateLesson(
              q,
              activeLesson.depth || 'batafsil',
              false,
              `${activeLesson.title}: ${activeLesson.summary}`
            )
          }
          onRequestContinuation={requestContinuation}
          isGeneratingFollowUp={isLoading}
          isContinuingLecture={isContinuingLecture}
          errorMessage={errorMessage}
        />
      ) : (
        <HomeScreen
          language={language}
          onChangeLanguage={setLanguage}
          onAskQuestion={(q, depth, useInternet) =>
            generateLesson(q, depth, useInternet)
          }
          onOpenHistory={() => setHistoryOpen(true)}
          isLoading={isLoading}
          isMuted={isMuted}
          onToggleMute={() => setIsMuted((m) => !m)}
          historyCount={history.length}
          errorMessage={errorMessage}
        />
      )}

      <HistoryDrawer
        language={language}
        history={history}
        isOpen={historyOpen}
        onClose={() => setHistoryOpen(false)}
        onSelectLesson={(lesson) => {
          setActiveLesson(lesson);
          setErrorMessage(null);
        }}
        onDeleteLesson={handleDeleteLesson}
      />
    </>
  );
}
