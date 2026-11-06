// Mock-first adapter for the Practice tab until a real practice backend exists.
// Card 1 and the due rows are the copy from the Figma frames; cards 2-5 are
// placeholders (Figma only shows card 1's content).
import type { PracticeRepository } from '../../core/practice/PracticeRepository';
import type { PracticeData, PracticeDeck } from '../../core/practice/types';

export const MOCK_PRACTICE_DATA: PracticeData = {
  hasStartedLearning: true,
  dueItems: [
    { id: '1', title: 'Rewriting a weak prompt', subtitle: 'Prompting at Work · ~3 min', icon: 'refresh' },
    { id: '2', title: 'Your first reusable brief', subtitle: 'Prompting at Work · ~4 min', icon: 'brief' },
  ],
  downloadedCount: 0,
  strengthen: { title: 'What belongs in context?', subtitle: 'Flashcards · ~2 min' },
};

export const MOCK_DECK: PracticeDeck = {
  title: 'Context essentials',
  cards: [
    {
      id: 'c1',
      question: 'What three things make a\nuseful AI brief?',
      answer: 'The task.\nThe sources.\nThe constraints.',
      answerNote: 'Together, they give an answer a direction you can evaluate.',
    },
    {
      id: 'c2',
      question: 'Why does context\nmatter to an AI?',
      answer: 'It can only use\nwhat it is given.',
      answerNote: 'Relevant context narrows the answer toward what you actually need.',
    },
    {
      id: 'c3',
      question: 'What is a context\nwindow?',
      answer: 'The text a model\ncan consider at once.',
      answerNote: 'Anything outside the window is invisible to the model.',
    },
    {
      id: 'c4',
      question: 'When should you\nadd constraints?',
      answer: 'When “good” has a\nspecific shape.',
      answerNote: 'Length, tone and format turn a vague ask into a checkable one.',
    },
    {
      id: 'c5',
      question: 'How do you check\nan AI answer?',
      answer: 'Against your sources\nand constraints.',
      answerNote: 'A clear brief gives you something concrete to compare with.',
    },
  ],
};

export class MockPracticeRepository implements PracticeRepository {
  async getPracticeData(): Promise<PracticeData> {
    return MOCK_PRACTICE_DATA;
  }

  async getDeck(): Promise<PracticeDeck> {
    return MOCK_DECK;
  }
}
