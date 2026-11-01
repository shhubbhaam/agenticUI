import type { DownloadedLesson, DownloadsRepository } from '../../core/downloads/downloads';

// Matches the "Your downloads" frame: 3 lessons, 18 MB.
export const SEED_DOWNLOADS: readonly DownloadedLesson[] = [
  { id: 'context-windows-plainly', title: 'Context windows, plainly', kind: 'article', sizeMb: 6 },
  { id: 'what-tokens-cost', title: 'What tokens cost', kind: 'slides', sizeMb: 8 },
  { id: 'cost-per-report-brief', title: 'Your cost-per-report brief', kind: 'worksheet', sizeMb: 4 },
];

// In-memory stand-in for an offline-lesson store (mock-first rule). Module
// state survives screen navigation within a session, like a real cache would.
export function createMockDownloadsRepository(seed: readonly DownloadedLesson[] = SEED_DOWNLOADS): DownloadsRepository {
  let items = seed.map((item) => ({ ...item }));
  return {
    async list() {
      return items.map((item) => ({ ...item }));
    },
    async remove(id) {
      items = items.filter((item) => item.id !== id);
    },
    async clear() {
      items = [];
    },
  };
}

export const mockDownloadsRepository: DownloadsRepository = createMockDownloadsRepository();
