// What the checkpoint player needs from a playback engine (YouTube embed now; expo-video for the
// uploaded/offline video next). Engines render inside VideoStage's slot and report through these.
export type EngineEvent = 'ready' | 'playing' | 'paused' | 'buffering' | 'ended';

export interface PlayerEngine {
  getCurrentTime(): Promise<number>;
  seekTo(sec: number): void;
}

export interface EngineViewProps {
  /** The player hook decides; the engine follows. */
  playing: boolean;
  onEvent: (e: EngineEvent) => void;
  onDuration: (sec: number) => void;
  onError: (code: string) => void;
  /** Filled by the engine so the hook can read time and seek. */
  engineRef: React.MutableRefObject<PlayerEngine | null>;
}
