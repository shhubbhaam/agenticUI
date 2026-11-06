import type { PracticeData, PracticeDeck } from './types';

// Port for practice content. data/mock implements it today; a LearnHouse
// adapter replaces it once real spaced-repetition data exists.
export interface PracticeRepository {
  getPracticeData(): Promise<PracticeData>;
  getDeck(): Promise<PracticeDeck>;
}
