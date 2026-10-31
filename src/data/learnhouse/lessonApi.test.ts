import { getLessonVideo, toLessonVideo, playerWindow, hostedVideoFile, type LessonActivity } from './lessonApi';
import { getStoredToken } from './secureToken';

jest.mock('./secureToken', () => ({ getStoredToken: jest.fn() }));

const YT = 'dQw4w9WgXcQ';
const activity = (over: Partial<LessonActivity> = {}): LessonActivity => ({
  activity_uuid: 'activity_1',
  name: 'Intro video',
  activity_type: 'TYPE_VIDEO',
  activity_sub_type: 'SUBTYPE_VIDEO_YOUTUBE',
  content: { uri: `https://www.youtube.com/watch?v=${YT}`, type: 'youtube' },
  details: { startTime: 10, endTime: 90 },
  ...over,
});

function mockFetchOnce(status: number, body: unknown) {
  (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: status >= 200 && status < 300, status, json: async () => body });
}

describe('toLessonVideo', () => {
  it('YouTube activity -> video id with start/end window', () => {
    expect(toLessonVideo(activity())).toEqual({ kind: 'youtube', videoId: YT, startSec: 10, endSec: 90 });
  });
  it('non-video activity -> not_a_video', () => {
    expect(toLessonVideo(activity({ activity_type: 'TYPE_DYNAMIC' }))).toEqual({ kind: 'unsupported', reason: 'not_a_video' });
  });
  it('vimeo -> unsupported', () => {
    expect(toLessonVideo(activity({ content: { uri: 'https://vimeo.com/1', type: 'vimeo' } }))).toEqual({ kind: 'unsupported', reason: 'vimeo' });
  });
  it('unparseable link -> unrecognized_url', () => {
    expect(toLessonVideo(activity({ content: { uri: 'https://example.com/x' } }))).toEqual({ kind: 'unsupported', reason: 'unrecognized_url' });
  });
  it('uploaded mp4 -> hosted, available', () => {
    const a = activity({ activity_sub_type: 'SUBTYPE_VIDEO_HOSTED', content: { filename: 'lesson.mp4' } });
    expect(toLessonVideo(a)).toEqual({ kind: 'hosted', available: true, mimeType: 'video/mp4' });
  });
  it('uploaded file with a path or unknown type -> hosted, unavailable', () => {
    expect(hostedVideoFile(activity({ content: { filename: '../etc/passwd.mp4' } }))).toBeNull();
    const a = activity({ activity_sub_type: 'SUBTYPE_VIDEO_HOSTED', content: { filename: 'notes.pdf' } });
    expect(toLessonVideo(a)).toEqual({ kind: 'hosted', available: false });
  });
});

describe('playerWindow', () => {
  it('accepts a JSON string and drops bad values', () => {
    expect(playerWindow('{"startTime":5,"endTime":3}')).toEqual({ startSec: 5 });
    expect(playerWindow('not json')).toEqual({});
    expect(playerWindow({ startTime: -1, endTime: 'x' })).toEqual({});
  });
});

describe('getLessonVideo', () => {
  beforeEach(() => {
    process.env.EXPO_PUBLIC_LEARNHOUSE_BASE_URL = 'https://lh.example.com/';
    global.fetch = jest.fn();
    (getStoredToken as jest.Mock).mockResolvedValue('user-jwt');
  });

  it('reads the activity with the user token and returns a YouTube video', async () => {
    mockFetchOnce(200, activity());
    const load = await getLessonVideo('course_1', 'activity_1');
    const [url, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toBe('https://lh.example.com/api/v1/activities/activity_1');
    expect(init.headers.Authorization).toBe('Bearer user-jwt');
    expect(load.response).toEqual({ activityUuid: 'activity_1', title: 'Intro video', video: { kind: 'youtube', videoId: YT, startSec: 10, endSec: 90 } });
    expect(load.fileSource).toBeNull();
  });

  it('uploaded video -> stream URL from the session org, with the user token', async () => {
    mockFetchOnce(200, activity({ activity_sub_type: 'SUBTYPE_VIDEO_HOSTED', content: { filename: 'lesson.mp4' } }));
    mockFetchOnce(200, {
      user: { id: 1, user_uuid: 'u', username: 'u', first_name: 'A', last_name: 'B', email: 'a@b.c' },
      roles: [{ role: { name: 'user' }, org: { id: 1, org_uuid: 'org_9', slug: 'default', name: 'Org' } }],
    });
    const load = await getLessonVideo('course_1', 'activity_1');
    expect(load.fileSource).toEqual({
      uri: 'https://lh.example.com/content/orgs/org_9/courses/course_1/activities/activity_1/video/lesson.mp4',
      headers: { Authorization: 'Bearer user-jwt' },
    });
  });

  it('signed out -> 401 without calling LearnHouse', async () => {
    (getStoredToken as jest.Mock).mockResolvedValue(null);
    await expect(getLessonVideo('c', 'a')).rejects.toMatchObject({ status: 401 });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('passes LearnHouse 403 through (screen shows "not available to you")', async () => {
    mockFetchOnce(403, { detail: 'Forbidden' });
    await expect(getLessonVideo('c', 'a')).rejects.toMatchObject({ status: 403 });
  });
});
