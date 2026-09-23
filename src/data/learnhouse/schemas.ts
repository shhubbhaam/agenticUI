import { z } from 'zod';

// Trimmed to the fields useSessionStore actually needs, not the full
// UserSession/OrganizationRead/RoleRead shapes from docs.learnhouse.app/reference/users
// (which also carries the full per-resource rights/permissions matrix —
// not global client state, and not needed here). Unknown extra fields are
// ignored rather than rejected, so an additive API change doesn't break login.

export const organizationSchema = z.object({
  id: z.number(),
  org_uuid: z.string(),
  slug: z.string(),
  name: z.string(),
  logo_image: z.string().nullable().optional(),
});

export const userRoleSchema = z.object({
  role: z.object({ name: z.string() }),
  org: organizationSchema,
});

export const userSchema = z.object({
  id: z.number(),
  user_uuid: z.string(),
  username: z.string(),
  first_name: z.string(),
  last_name: z.string(),
  email: z.string(),
  avatar_image: z.string().nullable().optional(),
});

export const userSessionSchema = z.object({
  user: userSchema,
  roles: z.array(userRoleSchema),
});

export type UserSession = z.infer<typeof userSessionSchema>;

// Neither /auth/login nor /auth/oauth's success-response shape is pinned
// down in the docs beyond "returns the user profile and tokens" (the
// reference only documents their error responses). Stay lenient and let
// authApi.ts pull the token out of whichever key the backend actually
// used — the same defensive lookup scripts/test-learnhouse-api.mjs already
// validated against a real instance.
export const authResponseSchema = z.record(z.string(), z.unknown());
export type AuthResponse = z.infer<typeof authResponseSchema>;

// Trail/progress response (GET /api/v1/admin/{org_slug}/trails/{user_id}) —
// only the fields progressApi.ts's mapper actually consumes are required;
// everything else the real API returns (published, teacher_verified,
// grade, chapter_id, activity_id, activity_sub_type, ...) is simply not
// declared here and ignored by .parse(), not rejected.
export const trailActivitySchema = z.object({
  activity_uuid: z.string(),
  name: z.string(),
  activity_type: z.string(),
  order: z.number(),
  completed: z.boolean(),
  completed_at: z.string().nullable(),
});

export const trailChapterSchema = z.object({
  chapter_uuid: z.string(),
  name: z.string(),
  order: z.number(),
  total_activities: z.number(),
  completed_activities: z.number(),
  activities: z.array(trailActivitySchema),
});

export const trailCourseSchema = z.object({
  course_uuid: z.string(),
  course_name: z.string(),
  status: z.string().nullable(),
  enrolled_at: z.string().nullable(),
  total_activities: z.number(),
  completed_activities: z.number(),
  completion_percentage: z.number(),
  chapters: z.array(trailChapterSchema),
});

export const trailResponseSchema = z.object({
  courses: z.array(trailCourseSchema),
});

export type TrailCourse = z.infer<typeof trailCourseSchema>;
export type TrailResponse = z.infer<typeof trailResponseSchema>;
