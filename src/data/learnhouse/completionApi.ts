// Mark an activity complete for the signed-in learner. M5: the completion is written to the SQLite
// outbox FIRST (so it survives no network, an app kill or a BFF restart), then the sync engine sends
// it to the BFF (POST /api/me/events), which applies it in LearnHouse and reads it back. The event id
// is created once and reused on every retry, so a retried send is one effect.
import { getLearnerId } from '../../core/auth/session';
import { enqueueCompletion } from '../local/outbox';
import { flushOutbox } from '../sync/syncEngine';
import { clearTrailCache } from './trailCache';
import { ApiError } from './client';

/**
 * Resolves once the completion is safely queued on the device ('queued'). Home / Path show it as done
 * straight away (the trail overlay reads the outbox); the send happens in the background.
 */
export async function markActivityComplete(courseUuid: string, activityUuid: string): Promise<'queued'> {
  const learnerId = getLearnerId();
  if (!learnerId) throw new ApiError(401, 'Not signed in');
  await enqueueCompletion(learnerId, courseUuid, activityUuid);
  // Progress changed: Path / Home / streak re-read the trail (with the queued completion applied).
  clearTrailCache();
  void flushOutbox();
  return 'queued';
}
