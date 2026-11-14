// M4: the playhead survives the app closing; "watched" only grows; an explicit rewind is kept.
import { getDatabase } from './database';
import { loadPlayerProgress, savePlayerProgress } from './playerProgress';

beforeEach(async () => {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM player_progress');
});

describe('player progress', () => {
  it('is empty for a lesson never opened', async () => {
    expect(await loadPlayerProgress('7', 'act-1')).toBeNull();
  });

  it('saves and loads the playhead per learner and lesson', async () => {
    await savePlayerProgress('7', 'act-1', { positionSec: 42, watchedSec: 42 });
    await savePlayerProgress('8', 'act-1', { positionSec: 5, watchedSec: 5 });
    expect(await loadPlayerProgress('7', 'act-1')).toEqual({ positionSec: 42, watchedSec: 42 });
    expect(await loadPlayerProgress('8', 'act-1')).toEqual({ positionSec: 5, watchedSec: 5 });
  });

  it('a rewind moves the playhead back but never shrinks "watched"', async () => {
    await savePlayerProgress('7', 'act-1', { positionSec: 60, watchedSec: 60 });
    await savePlayerProgress('7', 'act-1', { positionSec: 10, watchedSec: 10 });
    expect(await loadPlayerProgress('7', 'act-1')).toEqual({ positionSec: 10, watchedSec: 60 });
  });
});
