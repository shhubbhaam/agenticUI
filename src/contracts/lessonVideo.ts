// src/contracts/lessonVideo.ts
// What the app knows about an activity's video, built from the LearnHouse activity by
// src/data/learnhouse/lessonApi.ts and checked against this schema. Platform-neutral (no React Native imports).
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
  // Uploaded to LearnHouse; lessonApi.ts builds the stream URL separately (never part of this object).
  // available:false = no playable file (missing or unsupported file type).
  z.object({
    kind: z.literal('hosted'),
    available: z.boolean(),
    mimeType: z.enum(['video/mp4', 'video/webm', 'video/quicktime']).optional(),
  }).strict().refine((v) => !v.available || !!v.mimeType, { message: 'available hosted video needs a mimeType' }),
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
