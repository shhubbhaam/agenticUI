// Lesson video lookup, straight from LearnHouse — same direct pattern as
// authApi.ts / progressApi.ts (no middle layer). Uses the signed-in user's
// own JWT from SecureStore, never the org admin token.
//
// GET /api/v1/activities/{activity_uuid} gives the activity's content; this
// file turns it into the player's LessonVideo contract (src/contracts/lessonVideo.ts):
//  - YouTube   -> an 11-character video id (+ optional start/end seconds)
//  - uploaded  -> a file source the native player streams with the user's token
//  - otherwise -> 'unsupported' with a reason the screen can show
import { z } from 'zod';
import { ApiError, request } from './client';
import { getStoredToken } from './secureToken';
import { fetchSession } from './authApi';
import {
  LessonVideoResponseSchema,
  youTubeIdFrom,
  type LessonVideo,
  type LessonVideoResponse,
} from '../../contracts/lessonVideo';

// Only the fields the mapping reads; anything else LearnHouse returns is ignored.
export const lessonActivitySchema = z.object({
  activity_uuid: z.string(),
  name: z.string().nullable().optional(),
  activity_type: z.string(),
  activity_sub_type: z.string().nullable().optional(),
  content: z.record(z.string(), z.unknown()).nullable().optional(),
  details: z.unknown().optional(),
});
export type LessonActivity = z.infer<typeof lessonActivitySchema>;

export interface LessonVideoSource {
  uri: string;
  headers: Record<string, string>;
}

export interface LessonVideoLoad {
  response: LessonVideoResponse;
  /** Set only for an uploaded video the player can stream. */
  fileSource: LessonVideoSource | null;
}

/** LearnHouse's player options arrive as an object or a JSON string; keep sane whole seconds only. */
export function playerWindow(details: unknown): { startSec?: number; endSec?: number } {
  let d: unknown = details;
  if (typeof d === 'string') {
    try { d = JSON.parse(d); } catch { return {}; }
  }
  const o = (d ?? {}) as { startTime?: unknown; endTime?: unknown };
  const sec = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 86400 ? Math.floor(v) : undefined);
  const startSec = sec(o.startTime);
  const endSec = sec(o.endTime);
  return { ...(startSec ? { startSec } : {}), ...(endSec && endSec > (startSec ?? 0) ? { endSec } : {}) };
}

const VIDEO_MIME = { mp4: 'video/mp4', m4v: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime' } as const;
type VideoMime = (typeof VIDEO_MIME)[keyof typeof VIDEO_MIME];

/** An uploaded video's file name, only if it is a plain file name with a known video extension (no paths). */
export function hostedVideoFile(a: LessonActivity): { filename: string; mimeType: VideoMime } | null {
  const f = a.content?.filename;
  if (typeof f !== 'string' || !/^[A-Za-z0-9_-][A-Za-z0-9._-]{0,150}$/.test(f)) return null;
  const ext = f.split('.').pop()!.toLowerCase() as keyof typeof VIDEO_MIME;
  return Object.prototype.hasOwnProperty.call(VIDEO_MIME, ext) ? { filename: f, mimeType: VIDEO_MIME[ext] } : null;
}

/** Map a LearnHouse activity to what the player can play. */
export function toLessonVideo(a: LessonActivity): LessonVideo {
  if (a.activity_type !== 'TYPE_VIDEO') return { kind: 'unsupported', reason: 'not_a_video' };
  if (a.activity_sub_type === 'SUBTYPE_VIDEO_HOSTED') {
    const file = hostedVideoFile(a);
    return file ? { kind: 'hosted', available: true, mimeType: file.mimeType } : { kind: 'hosted', available: false };
  }
  const type = typeof a.content?.type === 'string' ? a.content.type.toLowerCase() : '';
  if (type === 'vimeo') return { kind: 'unsupported', reason: 'vimeo' };
  const videoId = youTubeIdFrom(a.content?.uri);
  return videoId ? { kind: 'youtube', videoId, ...playerWindow(a.details) } : { kind: 'unsupported', reason: 'unrecognized_url' };
}

export function baseUrl(): string {
  let url = process.env.EXPO_PUBLIC_LEARNHOUSE_BASE_URL ?? '';
  while (url.endsWith('/')) url = url.slice(0, -1);
  return url;
}

/**
 * Where LearnHouse serves an uploaded activity video:
 * {origin}/content/orgs/{org_uuid}/courses/{course_uuid}/activities/{activity_uuid}/video/{file}
 */
export function hostedVideoUrl(orgUuid: string, courseUuid: string, activityUuid: string, filename: string): string {
  const e = encodeURIComponent;
  return `${baseUrl()}/content/orgs/${e(orgUuid)}/courses/${e(courseUuid)}/activities/${e(activityUuid)}/video/${e(filename)}`;
}

export async function getLessonVideo(courseUuid: string, activityUuid: string): Promise<LessonVideoLoad> {
  const token = await getStoredToken();
  if (!token) throw new ApiError(401, 'Not signed in');

  const raw = await request(`/api/v1/activities/${encodeURIComponent(activityUuid)}`, { token });
  const activity = lessonActivitySchema.parse(raw);

  const response = LessonVideoResponseSchema.parse({
    activityUuid,
    title: activity.name?.trim().slice(0, 200) || 'Video',
    video: toLessonVideo(activity),
  });

  let fileSource: LessonVideoSource | null = null;
  const file = response.video.kind === 'hosted' && response.video.available ? hostedVideoFile(activity) : null;
  if (file) {
    // The media path needs the org's uuid, which only the session carries.
    const orgUuid = (await fetchSession(token)).roles[0]?.org.org_uuid;
    fileSource = orgUuid
      ? { uri: hostedVideoUrl(orgUuid, courseUuid, activityUuid, file.filename), headers: { Authorization: `Bearer ${token}` } }
      : null;
  }
  return { response, fileSource };
}
