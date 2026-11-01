import { useEffect } from 'react';
import { useSettingsStore } from '../../state/useSettingsStore';

export const SAVED_MESSAGE = 'Your updated preference is saved.';
export const FAILED_MESSAGE = "The change didn't save. Your previous preference is still active.";

const NOTICE_MS = 4000;

export interface SaveNotice {
  tone: 'success' | 'error';
  message: string;
}

// The save result for the pill at the top of a settings screen. Starts clean
// when the screen opens (a stale pill from another screen never shows) and
// fades after a few seconds. Errors stay until the next change so they are
// not missed by assistive tech users.
export function useSaveNotice(): SaveNotice | null {
  const notice = useSettingsStore((s) => s.notice);
  const dismissNotice = useSettingsStore((s) => s.dismissNotice);

  useEffect(() => {
    dismissNotice();
    return dismissNotice;
  }, [dismissNotice]);

  useEffect(() => {
    if (notice !== 'saved') return;
    const timer = setTimeout(dismissNotice, NOTICE_MS);
    return () => clearTimeout(timer);
  }, [notice, dismissNotice]);

  if (notice === 'saved') return { tone: 'success', message: SAVED_MESSAGE };
  if (notice === 'failed') return { tone: 'error', message: FAILED_MESSAGE };
  return null;
}
