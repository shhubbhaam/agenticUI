// src/contracts/lessonVideo.ts
// What the BFF tells the app about an activity's video. Platform-neutral (no React Native imports):
// the BFF validates every response against this before sending, the app parses it again.
// The app never receives LearnHouse URLs or ids it could use against LearnHouse directly.
import { z } from 'zod';

/** A YouTube video id: exactly 11 characters from YouTube's alphabet. */
export const YouTubeId = z.string().regex(/^[A-Za-z0-9_-]{11}$/);

const Seconds = z.number().int().min(0).max(24 * 3600);

export const LessonVideoSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('youtube'),
    videoId: YouTubeId,
    startSec: Seconds.optional(),
    endSec: Seconds.optional(),
  }).strict(),
  // Uploaded to LearnHouse; streamed and downloaded through the BFF (offline). Added with the upload.
  z.object({
    kind: z.literal('hosted'),
    available: z.literal(false),
  }).strict(),
  z.object({
    kind: z.literal('unsupported'),
    reason: z.enum(['vimeo', 'unrecognized_url', 'not_a_video']),
  }).strict(),
]);
export type LessonVideo = z.infer<typeof LessonVideoSchema>;

export const LessonVideoResponseSchema = z.object({
  activityUuid: z.string().min(1).max(64).regex(/^[A-Za-z0-9_-]+$/),
  title: z.string().min(1).max(200),
  video: LessonVideoSchema,
}).strict();
export type LessonVideoResponse = z.infer<typeof LessonVideoResponseSchema>;

/**
 * The video id in any common YouTube URL form: watch?v=, youtu.be/, /embed/, /shorts/, /live/,
 * with or without www/m/music. Returns null for anything else (no guessing).
 */
export function youTubeIdFrom(uri: unknown): string | null {
  if (typeof uri !== 'string' || uri.length > 500) return null;
  let url: URL;
  try { url = new URL(uri.trim()); } catch { return null; }
  const host = url.hostname.toLowerCase().replace(/^(www|m|music)\./, '');
  let id: string | null = null;
  if (host === 'youtu.be') id = url.pathname.split('/')[1] ?? null;
  else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    if (url.pathname === '/watch') id = url.searchParams.get('v');
    else {
      const m = /^\/(embed|shorts|live|v)\/([^/?#]+)/.exec(url.pathname);
      id = m ? m[2] : null;
    }
  }
  return id && YouTubeId.safeParse(id).success ? id : null;
}
