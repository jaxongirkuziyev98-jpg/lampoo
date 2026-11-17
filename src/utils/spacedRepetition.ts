import type { QuizQuestion, SrsCard, StudyTrack } from '../types/lesson';

const SRS_STORAGE_KEY = 'lampo_srs_cards_v1';

export function loadSrsCards(): SrsCard[] {
  try {
    const raw = localStorage.getItem(SRS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SrsCard[]) : [];
  } catch {
    return [];
  }
}

function saveSrsCards(cards: SrsCard[]): void {
  try {
    localStorage.setItem(SRS_STORAGE_KEY, JSON.stringify(cards.slice(0, 80)));
  } catch {
    // Ignore storage quota errors
  }
}

export function recordSrsAnswer(params: {
  question: QuizQuestion;
  lessonId: string;
  lessonTitle: string;
  subject: string;
  track: StudyTrack;
  isCorrect: boolean;
}): SrsCard[] {
  const now = Date.now();
  const cards = loadSrsCards();
  const existingIdx = cards.findIndex(
    (c) => c.id === params.question.id || c.question.trim() === params.question.question.trim()
  );

  if (existingIdx >= 0) {
    const existing = cards[existingIdx];
    const nextStreak = params.isCorrect ? existing.correctStreak + 1 : 0;
    const nextWrong = params.isCorrect ? existing.wrongCount : existing.wrongCount + 1;
    // Wrong answers come back in 2 minutes; consecutive right answers space out: 12m -> 6h -> 1d -> 3d
    const nextInterval = params.isCorrect
      ? nextStreak <= 1
        ? 12
        : nextStreak === 2
          ? 360
          : nextStreak === 3
            ? 1440
            : 4320
      : 2;

    const updated: SrsCard = {
      ...existing,
      wrongCount: nextWrong,
      correctStreak: nextStreak,
      intervalMinutes: nextInterval,
      nextReviewAt: now + nextInterval * 60 * 1000,
      lastReviewedAt: now,
    };
    cards.splice(existingIdx, 1);
    cards.unshift(updated);
    saveSrsCards(cards);
    return cards;
  }

  // Only prioritize into the active SRS queue immediately if wrong or explicitly reviewed;
  // correct first-time cards are scheduled gently for 24h later so users don't get spammed immediately.
  const intervalMinutes = params.isCorrect ? 1440 : 2;
  const newCard: SrsCard = {
    ...params.question,
    lessonId: params.lessonId,
    lessonTitle: params.lessonTitle,
    subject: params.subject,
    track: params.track,
    wrongCount: params.isCorrect ? 0 : 1,
    correctStreak: params.isCorrect ? 1 : 0,
    intervalMinutes,
    nextReviewAt: now + intervalMinutes * 60 * 1000,
    lastReviewedAt: now,
  };

  cards.unshift(newCard);
  saveSrsCards(cards);
  return cards;
}

export function getDueSrsCards(now = Date.now()): SrsCard[] {
  const cards = loadSrsCards();
  return cards
    .filter((c) => c.nextReviewAt <= now && (c.wrongCount > 0 || c.correctStreak < 3))
    .sort((a, b) => {
      if (b.wrongCount !== a.wrongCount) return b.wrongCount - a.wrongCount;
      return a.nextReviewAt - b.nextReviewAt;
    });
}

export function getSrsSummary(now = Date.now()): {
  dueCount: number;
  wrongCount: number;
  masteredCount: number;
  totalCount: number;
} {
  const cards = loadSrsCards();
  const due = getDueSrsCards(now);
  const wrong = cards.filter((c) => c.wrongCount > 0 && c.correctStreak === 0);
  const mastered = cards.filter((c) => c.correctStreak >= 2);
  return {
    dueCount: due.length,
    wrongCount: wrong.length,
    masteredCount: mastered.length,
    totalCount: cards.length,
  };
}
