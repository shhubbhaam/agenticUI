// Mark an activity complete for the signed-in learner, through the BFF's completion route
// (POST /me/courses/:c/activities/:a/complete). The BFF checks enrollment + publication, writes to
// LearnHouse's progress API and reads it back; the idempotency key makes a retried tap one effect.
import { markActivityComplete as bffComplete } from '../../core/api/learnhouse/client';
import { clearTrailCache } from './trailCache';

export const newIdempotencyKey = () => `k${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;

/** received = the BFF accepted it; applied = LearnHouse already shows it complete. Both count as done. */
export async function markActivityComplete(courseUuid: string, activityUuid: string, idempotencyKey = newIdempotencyKey()): Promise<'applied' | 'received'> {
  const r = await bffComplete(activityUuid, idempotencyKey, courseUuid);
  // Progress changed: Path / Home / streak re-read the trail (and Path may celebrate a finished stage).
  clearTrailCache();
  return r.status;
}
