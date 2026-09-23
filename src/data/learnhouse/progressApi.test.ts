import { getMyTrail } from './progressApi';

function mockFetchOnce(status: number, body: unknown) {
  (global.fetch as jest.Mock).mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });
}

const RAW_COURSE = {
  course_uuid: 'course-1',
  course_id: 5,
  course_name: 'Applied AI',
  status: 'STATUS_IN_PROGRESS',
  enrolled_at: '2026-09-01T00:00:00',
  total_activities: 2,
  completed_activities: 1,
  completion_percentage: 50,
  chapters: [
    {
      chapter_uuid: 'chapter-1',
      chapter_id: 9,
      name: 'Foundations',
      order: 0,
      total_activities: 2,
      completed_activities: 1,
      activities: [
        {
          activity_uuid: 'activity-1',
          activity_id: 59,
          name: 'Intro video',
          activity_type: 'TYPE_VIDEO',
          activity_sub_type: 'SUBTYPE_VIDEO_HOSTED',
          order: 0,
          published: true,
          completed: true,
          teacher_verified: false,
          grade: '',
          completed_at: '2026-09-02T00:00:00',
        },
        {
          activity_uuid: 'activity-2',
          activity_id: 60,
          name: 'Read the brief',
          activity_type: 'TYPE_DOCUMENT',
          activity_sub_type: 'SUBTYPE_DOCUMENT_PDF',
          order: 1,
          published: true,
          completed: false,
          teacher_verified: false,
          grade: '',
          completed_at: null,
        },
      ],
    },
  ],
};

describe('getMyTrail', () => {
  beforeEach(() => {
    process.env.EXPO_PUBLIC_LEARNHOUSE_BASE_URL = 'https://lh.example.com';
    process.env.EXPO_PUBLIC_LEARNHOUSE_ADMIN_TOKEN_TESTING_ONLY = 'lh_test123';
    global.fetch = jest.fn();
  });

  it('maps a raw trail response into CourseProgress[]', async () => {
    mockFetchOnce(200, { courses: [RAW_COURSE] });
    const result = await getMyTrail('my-org', 3);
    expect(result).toEqual([
      {
        courseUuid: 'course-1',
        courseName: 'Applied AI',
        status: 'STATUS_IN_PROGRESS',
        enrolledAt: new Date('2026-09-01T00:00:00'),
        totalActivities: 2,
        completedActivities: 1,
        completionPercentage: 50,
        chapters: [
          {
            id: 'chapter-1',
            name: 'Foundations',
            order: 0,
            totalActivities: 2,
            completedActivities: 1,
            activities: [
              {
                id: 'activity-1',
                name: 'Intro video',
                type: 'video',
                order: 0,
                completed: true,
                completedAt: new Date('2026-09-02T00:00:00'),
              },
              {
                id: 'activity-2',
                name: 'Read the brief',
                type: 'document',
                order: 1,
                completed: false,
                completedAt: null,
              },
            ],
          },
        ],
      },
    ]);
    const [url, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toBe('https://lh.example.com/api/v1/admin/my-org/trails/3');
    expect(init.headers.Authorization).toBe('Bearer lh_test123');
  });

  it('returns an empty array when the user has no trail', async () => {
    mockFetchOnce(200, { courses: [] });
    expect(await getMyTrail('my-org', 3)).toEqual([]);
  });

  it('throws an ApiError on a 401 (e.g. an invalid/expired admin token)', async () => {
    mockFetchOnce(401, { detail: 'Invalid token' });
    await expect(getMyTrail('my-org', 3)).rejects.toMatchObject({ status: 401 });
  });
});
