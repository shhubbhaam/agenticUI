import { useCallback, useEffect, useState } from 'react';
import type { DownloadedLesson, DownloadsRepository } from '../../core/downloads/downloads';
import { mockDownloadsRepository } from '../../data/mock/mockDownloadsRepository';

export const REMOVE_FAILED_MESSAGE = "We couldn't remove that. Please try again.";

export interface DownloadsData {
  status: 'loading' | 'ready';
  items: DownloadedLesson[];
  // True while the "Manage downloaded lessons" edit mode is on.
  managing: boolean;
  errorMessage: string | null;
  toggleManaging: () => void;
  remove: (id: string) => void;
  clearAll: () => void;
}

// Local data for the Manage downloads screen, behind the DownloadsRepository
// interface (mock today; a file-system adapter later).
export function useDownloads(repository: DownloadsRepository = mockDownloadsRepository): DownloadsData {
  const [items, setItems] = useState<DownloadedLesson[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready'>('loading');
  const [managing, setManaging] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setItems(await repository.list());
  }, [repository]);

  useEffect(() => {
    let cancelled = false;
    repository
      .list()
      .then((list) => {
        if (!cancelled) setItems(list);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      })
      .finally(() => {
        if (!cancelled) setStatus('ready');
      });
    return () => {
      cancelled = true;
    };
  }, [repository]);

  const run = (action: () => Promise<void>) => {
    setErrorMessage(null);
    action()
      .then(refresh)
      .catch(() => setErrorMessage(REMOVE_FAILED_MESSAGE));
  };

  return {
    status,
    items,
    managing,
    errorMessage,
    toggleManaging: () => setManaging((m) => !m),
    remove: (id) => run(() => repository.remove(id)),
    clearAll: () => {
      setManaging(false);
      run(() => repository.clear());
    },
  };
}
