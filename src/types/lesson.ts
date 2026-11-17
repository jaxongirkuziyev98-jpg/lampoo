export type AppLanguage = 'uz' | 'ru' | 'en' | 'tr';

export type LessonDepth = 'qisqa' | 'batafsil' | 'chuqur';

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

export type GameId = 'rps' | 'math' | 'guess' | 'riddle';

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

export interface LessonPlan {
  id: string;
  question: string;
  title: string;
  subject: string;
  language?: AppLanguage;
  depth: LessonDepth;
  summary: string;
  formulaOrFact: string;
  keyTakeaways: string[];
  steps: LessonStep[];
  sources?: GroundingSource[];
  createdAt: number;
}
