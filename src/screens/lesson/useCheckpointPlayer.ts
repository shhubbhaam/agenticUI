// The checkpoint player: decides play/pause, seeking and the checkpoint questions; components only render.
// Runs on a real engine (YouTube now, expo-video next) or, with no engine, on a fake clock (demo).
//
// Rules (M4):
//  - playback pauses AT each unanswered checkpoint (time is read every tickMs; on reaching or
//    overshooting a checkpoint the engine is sent back to its exact time) and opens its question;
//  - seeking cannot pass the next unanswered checkpoint (also corrects an engine that drifts past it);
//  - an answered checkpoint never reopens, even after rewinding past it;
//  - "watched" (furthest point) is kept separate from the playhead.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { TimelineCheckpoint } from '../../ui/molecules/player/PlayerTimeline';
import type { QuizStatus, QuizOption } from '../../ui/organisms/player/CheckpointQuizOverlay';
import type { StageStatus } from '../../ui/organisms/player/VideoStage';
import type { EngineEvent, EngineViewProps, PlayerEngine } from './engines/types';

export interface PlayerCheckpoint {
  id: string;
  atSec: number;
  prompt: { title: string; body: string };
  question: string;
  options: QuizOption[];
  /** Demo only: in the real flow the BFF grades (the app never holds answers). */
  correctId: string;
  explanation: string;
}

interface Options {
  checkpoints: PlayerCheckpoint[];
  /** Known duration (demo). With an engine, the engine reports it. */
  durationSec?: number;
  /** true: a real engine will be mounted; false: fake clock. */
  withEngine: boolean;
  tickMs?: number;
}

/** How long after a pause request a "playing" report from the engine is treated as stale. */
export const PAUSE_GUARD_MS = 800;

export function useCheckpointPlayer({ checkpoints, durationSec: knownDuration = 0, withEngine, tickMs = 250 }: Options) {
  const engineRef = useRef<PlayerEngine | null>(null);
  const [duration, setDuration] = useState(knownDuration);
  const [position, setPosition] = useState(0);
  const [watched, setWatched] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [engineStatus, setEngineStatus] = useState<StageStatus>(withEngine ? 'loading' : 'ready');
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [passed, setPassed] = useState<Set<string>>(new Set());
  const [openId, setOpenId] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [quiz, setQuiz] = useState<QuizStatus>('answering');
  const [attempt, setAttempt] = useState(1);
  /** When the learner last asked to pause: a late "playing" report from the engine must not undo it. */
  const pausedAt = useRef(0);

  const ordered = useMemo(() => [...checkpoints].sort((a, b) => a.atSec - b.atSec), [checkpoints]);
  const nextOpen = ordered.find((c) => !passed.has(c.id)) ?? null;
  const seekableUntil = nextOpen ? Math.min(nextOpen.atSec, duration || nextOpen.atSec) : duration;
  const atCheckpoint = !!nextOpen && position >= nextOpen.atSec;
  const ended = engineStatus === 'ended' || (duration > 0 && position >= duration);

  // Latest values for the ticking callback and engine events.
  const live = useRef({ position, nextOpen, duration, quizOpen: false });
  live.current = { position, nextOpen, duration, quizOpen: openId !== null };

  const pause = useCallback(() => { pausedAt.current = Date.now(); setPlaying(false); }, []);

  const reachCheckpoint = useCallback((cp: PlayerCheckpoint) => {
    pausedAt.current = Date.now();
    setPlaying(false);
    engineRef.current?.seekTo(cp.atSec);
    live.current.position = cp.atSec;
    setPosition(cp.atSec);
    setOpenId(cp.id);
  }, []);

  /** Apply a time reported by the clock/engine, enforcing the checkpoint rules. */
  const applyTime = useCallback((t: number) => {
    const { nextOpen: next, duration: d } = live.current;
    if (!Number.isFinite(t)) return;
    if (next && t >= next.atSec) { reachCheckpoint(next); return; }
    const clamped = d > 0 ? Math.min(t, d) : t;
    live.current.position = clamped; // ticks can run before the next render
    setPosition(clamped);
    if (d > 0 && clamped >= d) setPlaying(false);
  }, [reachCheckpoint]);

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      if (withEngine) {
        const e = engineRef.current;
        if (e) e.getCurrentTime().then(applyTime).catch(() => {});
      } else {
        applyTime(live.current.position + tickMs / 1000);
      }
    }, tickMs);
    return () => clearInterval(id);
  }, [playing, withEngine, tickMs, applyTime]);

  useEffect(() => { setWatched((w) => Math.max(w, position)); }, [position]);

  const seek = useCallback((sec: number) => {
    const target = Math.max(0, Math.min(sec, seekableUntil, duration || sec));
    engineRef.current?.seekTo(target);
    live.current.position = target;
    setPosition(target);
    if (engineStatus === 'ended' && target < duration) setEngineStatus('ready');
  }, [seekableUntil, duration, engineStatus]);

  const togglePlay = useCallback(() => {
    if (openId || engineStatus === 'loading' || engineStatus === 'error') return;
    if (atCheckpoint && nextOpen) { setOpenId(nextOpen.id); return; }
    if (ended) { seek(0); setEngineStatus('ready'); setPlaying(true); return; }
    if (playing) pause(); else setPlaying(true);
  }, [openId, engineStatus, atCheckpoint, nextOpen, ended, seek, playing, pause]);

  const open = ordered.find((c) => c.id === openId) ?? null;

  const submit = useCallback(() => {
    if (!open || !selected) return;
    setQuiz('submitting');
    setTimeout(() => setQuiz(selected === open.correctId ? 'correct' : 'incorrect'), 400);
  }, [open, selected]);

  // Engine -> hook
  const engineView: EngineViewProps = {
    playing,
    engineRef,
    // The engine's reports are the truth about playback: the play/pause state follows them, so the
    // button always does what it shows (the one exception is just below).
    onEvent: useCallback((e: EngineEvent) => {
      if (e === 'ready') setEngineStatus('ready');
      else if (e === 'buffering') setEngineStatus('buffering');
      else if (e === 'playing') {
        setEngineStatus('ready');
        const justPaused = Date.now() - pausedAt.current < PAUSE_GUARD_MS; // late report, pause still on its way
        if (!justPaused && !live.current.quizOpen) setPlaying(true);
      }
      else if (e === 'ended') { setEngineStatus('ended'); setPlaying(false); }
      else if (e === 'paused') setPlaying(false); // e.g. interrupted by the OS
    }, []),
    onDuration: useCallback((d: number) => setDuration(Math.floor(d)), []),
    onError: useCallback((code: string) => { setErrorCode(code); setEngineStatus('error'); setPlaying(false); }, []),
  };

  const timeline: TimelineCheckpoint[] = ordered.map((c) => ({
    id: c.id,
    atSec: c.atSec,
    state: passed.has(c.id) ? 'passed' : c.id === nextOpen?.id ? (atCheckpoint ? 'current' : 'upcoming') : 'locked',
  }));

  return {
    engineView,
    errorCode,
    status: (ended ? 'ended' : engineStatus) as StageStatus,
    position, watched, duration, playing, seekableUntil, timeline,
    prompt: nextOpen?.prompt ?? null,
    /** Checkpoints answered correctly so far, of all of them (gates "Mark as complete"). */
    checkpointsPassed: ordered.filter((c) => passed.has(c.id)).length,
    checkpointsTotal: ordered.length,
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
    select: (id: string) => { if (quiz === 'answering') setSelected(id); },
    submit,
    tryAgain: () => { setQuiz('answering'); setSelected(null); setAttempt((a) => a + 1); },
    continueWatching: () => {
      if (!open) return;
      setPassed((s) => new Set(s).add(open.id));
      setOpenId(null); setSelected(null); setQuiz('answering'); setAttempt(1);
      setPlaying(true);
    },
    togglePlay, seek,
  };
}
