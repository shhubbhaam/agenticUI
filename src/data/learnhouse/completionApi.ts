// Mark an activity complete for the signed-in learner, the same call LearnHouse's web app makes for
// its "Mark as complete" button. Uses the learner's own token (progress reads use the admin token,
// but completion must be recorded as the learner).
//   POST /api/v1/trail/add_activity/{activity_uuid}
import { ApiError, request } from './client';
import { getStoredToken } from './secureToken';
import { clearTrailCache } from './trailCache';

export async function markActivityComplete(activityUuid: string): Promise<void> {
  const token = await getStoredToken();
  if (!token) throw new ApiError(401, 'Not signed in');
  await request(`/api/v1/trail/add_activity/${encodeURIComponent(activityUuid)}`, { method: 'POST', token });
  // Progress changed: Path / Home / streak re-read the trail (and Path may celebrate a finished stage).
  clearTrailCache();
}
