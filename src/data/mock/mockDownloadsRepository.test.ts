import { createMockDownloadsRepository, SEED_DOWNLOADS } from './mockDownloadsRepository';

describe('mockDownloadsRepository', () => {
  it('lists the seeded lessons', async () => {
    const repo = createMockDownloadsRepository();
    await expect(repo.list()).resolves.toEqual(SEED_DOWNLOADS);
  });

  it('removes one lesson', async () => {
    const repo = createMockDownloadsRepository();
    await repo.remove('what-tokens-cost');
    const ids = (await repo.list()).map((i) => i.id);
    expect(ids).toEqual(['context-windows-plainly', 'cost-per-report-brief']);
  });

  it('ignores unknown ids and clears everything', async () => {
    const repo = createMockDownloadsRepository();
    await repo.remove('nope');
    expect(await repo.list()).toHaveLength(3);
    await repo.clear();
    expect(await repo.list()).toEqual([]);
  });

  it('does not let callers mutate stored items', async () => {
    const repo = createMockDownloadsRepository();
    (await repo.list())[0].title = 'hacked';
    expect((await repo.list())[0].title).toBe('Context windows, plainly');
  });
});
