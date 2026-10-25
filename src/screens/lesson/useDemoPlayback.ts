// DEMO playback for the player UI (M4 part 1): a fake clock instead of a real video engine.
// Replaced by useCheckpointPlayer + the YouTube / expo-video adapters in part 2. It already follows
// the rules the real hook will enforce, so the UI can be judged against them:
//  - playback pauses AT each checkpoint and opens its question;
//  - seeking cannot pass the next unanswered checkpoint;
//  - a passed checkpoint does not reopen when you rewind and play past it again.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { TimelineCheckpoint } from '../../ui/molecules/player/PlayerTimeline';
import type { QuizStatus } from '../../ui/organisms/player/CheckpointQuizOverlay';
import type { DownloadState, CaptionsState } from '../../ui/molecules/player/PlayerActions';
import { MOCK_LESSON, type MockCheckpoint } from './mockLesson';

export function useDemoPlayback(lesson = MOCK_LESSON) {
  const [position, setPosition] = useState(0);
  const [watched, setWatched] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [passed, setPassed] = useState<Set<string>>(new Set());
  const [openId, setOpenId] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [quiz, setQuiz] = useState<QuizStatus>('answering');
  const [attempt, setAttempt] = useState(1);
  const [captions, setCaptions] = useState<CaptionsState>('on');
  const [download, setDownload] = useState<DownloadState>({ status: 'idle' });
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const ordered = lesson.checkpoints;
  const nextOpen = ordered.find((c) => !passed.has(c.id));
  const seekableUntil = nextOpen ? nextOpen.atSec : lesson.durationSec;
  const ended = position >= lesson.durationSec;

  // Fake clock: 1 s per s; stop exactly at the next unanswered checkpoint.
  useEffect(() => {
    if (!playing) return;
    timer.current = setInterval(() => {
      setPosition((p) => {
        const next = Math.min(p + 1, lesson.durationSec);
        if (nextOpen && p < nextOpen.atSec && next >= nextOpen.atSec) {
          setPlaying(false);
          setOpenId(nextOpen.id);
          return nextOpen.atSec;
        }
        if (next >= lesson.durationSec) setPlaying(false);
        return next;
      });
    }, 1000);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [playing, nextOpen, lesson.durationSec]);

  useEffect(() => { setWatched((w) => Math.max(w, position)); }, [position]);

  // Fake download progress (demo of the states only).
  useEffect(() => {
    if (download.status !== 'downloading') return;
    const t = setTimeout(() => setDownload(download.progress >= 1 ? { status: 'downloaded' } : { status: 'downloading', progress: download.progress + 0.25 }), 400);
    return () => clearTimeout(t);
  }, [download]);

  const open = useMemo(() => ordered.find((c) => c.id === openId) ?? null, [ordered, openId]);
  const atCheckpoint = !!nextOpen && position >= nextOpen.atSec;

  const timeline: TimelineCheckpoint[] = ordered.map((c) => ({
    id: c.id,
    atSec: c.atSec,
    state: passed.has(c.id) ? 'passed' : c.id === nextOpen?.id ? (atCheckpoint ? 'current' : 'upcoming') : 'locked',
  }));

  const togglePlay = useCallback(() => {
    if (openId) return; // answer first
    if (ended) { setPosition(0); setPlaying(true); return; }
    if (atCheckpoint && nextOpen) { setOpenId(nextOpen.id); return; }
    setPlaying((p) => !p);
  }, [openId, ended, atCheckpoint, nextOpen]);

  const seek = useCallback((sec: number) => setPosition(Math.min(sec, seekableUntil)), [seekableUntil]);

  const submit = useCallback(() => {
    if (!open || !selected) return;
    setQuiz('submitting');
    setTimeout(() => setQuiz(selected === (open as MockCheckpoint).correctId ? 'correct' : 'incorrect'), 500);
  }, [open, selected]);

  return {
    lesson,
    position, watched, playing, ended, seekableUntil, timeline,
    status: (ended ? 'ended' : 'ready') as 'ended' | 'ready',
    prompt: nextOpen?.prompt ?? null,
    canOpenCheckpoint: atCheckpoint && !openId,
    openCheckpoint: () => { if (nextOpen && atCheckpoint) setOpenId(nextOpen.id); },
    quiz: open
      ? {
          checkpointLabel: `Checkpoint ${ordered.indexOf(open) + 1} of ${ordered.length}`,
          question: open.question,
          options: open.options,
          selectedId: selected,
          status: quiz,
          attempt,
          feedback: quiz === 'correct' ? open.explanation : quiz === 'incorrect' ? 'Rewatch the moment just before this checkpoint, then try again.' : undefined,
        }
      : null,
    select: (id: string) => setSelected(id),
    submit,
    tryAgain: () => { setQuiz('answering'); setSelected(null); setAttempt((a) => a + 1); },
    continueWatching: () => {
      if (!open) return;
      setPassed((s) => new Set(s).add(open.id));
      setOpenId(null); setSelected(null); setQuiz('answering'); setAttempt(1);
      setPlaying(true);
    },
    togglePlay, seek,
    captions, toggleCaptions: () => setCaptions((c) => (c === 'on' ? 'off' : 'on')),
    download: lesson.online === 'uploaded' ? download : undefined,
    startDownload: () => setDownload({ status: 'downloading', progress: 0 }),
  };
}
