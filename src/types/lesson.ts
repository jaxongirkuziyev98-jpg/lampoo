export type AppLanguage = 'uz' | 'ru' | 'en' | 'tr';

export type LessonDepth = 'qisqa' | 'batafsil' | 'chuqur';

export type StudyTrack = 'general' | 'dtm' | 'school';

export type LampoMood =
  | 'happy'
  | 'curious'
  | 'explaining'
  | 'excited'
  | 'annoyed'
  | 'sad'
  | 'surprised'
  | 'playful'
  | 'proud'
  | 'sleepy';

export type LampoQuirk = 'none' | 'bounce' | 'shake' | 'wiggle' | 'jump' | 'wink';

export type AppMode = 'lesson' | 'chat' | 'games';

export type GameId = 'xo' | 'math' | 'memory' | 'riddle';

export interface ChatMessage {
  id: string;
  role: 'user' | 'lampo';
  text: string;
  mood?: LampoMood;
  quirk?: LampoQuirk;
  suggestedGame?: GameId;
  timestamp: number;
}

export type DrawCommandKind =
  | 'text'
  | 'line'
  | 'arrow'
  | 'rect'
  | 'circle'
  | 'ellipse'
  | 'triangle'
  | 'curve'
  | 'axes'
  | 'parabola'
  | 'sine'
  | 'sun'
  | 'tree'
  | 'molecule'
  | 'highlight'
  | 'underline'
  | 'freehand'
  | 'sketch';

export interface DrawCommand {
  kind: DrawCommandKind;
  variant?: string;
  x: number;
  y: number;
  x2?: number;
  y2?: number;
  cx?: number;
  cy?: number;
  width?: number;
  height?: number;
  radius?: number;
  rx?: number;
  ry?: number;
  label?: string;
  points?: string;
  at?: number;
  color?: string;
  fill?: string;
  strokeWidth?: number;
  fontSize?: number;
  dashed?: boolean;
  bold?: boolean;
}

export interface LessonStep {
  stepNumber: number;
  stepTitle: string;
  narration: string;
  writtenNotes: string;
  mood: LampoMood;
  clearBefore: boolean;
  drawCommands: DrawCommand[];
}

export interface GroundingSource {
  title: string;
  url: string;
}

export interface QuestionImageAttachment {
  base64: string;
  mimeType: string;
  previewUrl: string;
  fileName: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: [string, string, string, string];
  correctIndex: number;
  hint: string;
  explanation: string;
  flashcardFront: string;
  flashcardBack: string;
}

export interface SrsCard extends QuizQuestion {
  lessonId: string;
  lessonTitle: string;
  subject: string;
  track: StudyTrack;
  wrongCount: number;
  correctStreak: number;
  intervalMinutes: number;
  nextReviewAt: number;
  lastReviewedAt: number;
}

export interface LessonPlan {
  id: string;
  question: string;
  title: string;
  subject: string;
  language?: AppLanguage;
  track?: StudyTrack;
  depth: LessonDepth;
  summary: string;
  formulaOrFact: string;
  keyTakeaways: string[];
  steps: LessonStep[];
  sources?: GroundingSource[];
  hasImage?: boolean;
  quizQuestions?: QuizQuestion[];
  createdAt: number;
}
