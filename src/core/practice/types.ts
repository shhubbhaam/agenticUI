// Practice-tab domain types. No React Native / network imports (core/ rule),
// so icons are named by key; the UI layer maps them onto its IconType.
export type PracticeIconKey = 'refresh' | 'brief' | 'layers';

export interface RevisitItem {
  id: string;
  title: string;
  subtitle: string;
  icon: PracticeIconKey;
}

export interface FlashCardData {
  id: string;
  question: string;
  answer: string;
  answerNote: string;
}

export interface PracticeDeck {
  title: string;
  cards: FlashCardData[];
}

export interface PracticeData {
  hasStartedLearning: boolean;
  dueItems: RevisitItem[];
  downloadedCount: number;
  strengthen: { title: string; subtitle: string };
}
