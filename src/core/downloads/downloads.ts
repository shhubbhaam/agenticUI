// Pure model + copy for the Manage downloads screen. Zero RN / storage imports.

export type DownloadKind = 'article' | 'slides' | 'worksheet';

export interface DownloadedLesson {
  id: string;
  title: string;
  kind: DownloadKind;
  sizeMb: number;
}

// Contract the screen depends on (rulebook mock-first rule): swap the
// in-memory mock for a real file-system adapter without touching the UI.
export interface DownloadsRepository {
  list(): Promise<DownloadedLesson[]>;
  remove(id: string): Promise<void>;
  clear(): Promise<void>;
}

export const KIND_LABELS: Record<DownloadKind, string> = {
  article: 'Article',
  slides: 'Slides',
  worksheet: 'Worksheet',
};

export function totalSizeMb(items: readonly DownloadedLesson[]): number {
  return items.reduce((sum, item) => sum + item.sizeMb, 0);
}

function lessonCount(count: number): string {
  return `${count} ${count === 1 ? 'lesson' : 'lessons'}`;
}

// Settings row subtitle: "18 MB · 3 lessons"
export function downloadsRowSubtitle(items: readonly DownloadedLesson[]): string {
  if (items.length === 0) return 'Nothing downloaded yet';
  return `${totalSizeMb(items)} MB · ${lessonCount(items.length)}`;
}

// Downloads screen alert: "3 lessons available offline · 18 MB used"
export function downloadsSummary(items: readonly DownloadedLesson[]): string {
  if (items.length === 0) return 'No lessons are available offline yet.';
  return `${lessonCount(items.length)} available offline · ${totalSizeMb(items)} MB used`;
}

export function itemSubtitle(item: DownloadedLesson): string {
  return `${KIND_LABELS[item.kind]} · Downloaded`;
}
