// Full-screen controls: visible while paused; while playing they hide after `delayMs` without
// interaction. A tap on the video toggles them; using any control keeps them up (poke).
import { useCallback, useEffect, useRef, useState } from 'react';

export function useAutoHideControls({ playing, enabled, delayMs = 3000 }: { playing: boolean; enabled: boolean; delayMs?: number }) {
  const [shown, setShown] = useState(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clear = () => { if (timer.current) clearTimeout(timer.current); timer.current = null; };

  const schedule = useCallback(() => {
    clear();
    if (enabled && playing) timer.current = setTimeout(() => setShown(false), delayMs);
  }, [enabled, playing, delayMs]);

  // Paused, or not in full screen: always shown. Playing: (re)start the countdown.
  useEffect(() => {
    if (!enabled || !playing) { clear(); setShown(true); return; }
    schedule();
    return clear;
  }, [enabled, playing, schedule]);

  const poke = useCallback(() => { setShown(true); schedule(); }, [schedule]);
  const toggle = useCallback(() => {
    setShown((s) => { if (s) { clear(); return false; } schedule(); return true; });
  }, [schedule]);

  return { visible: !enabled || !playing || shown, poke, toggle };
}
