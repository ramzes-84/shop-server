import { requestIdStorage, getCurrentRequestId } from './request-id.storage';

describe('request-id.storage', () => {
  it('returns undefined outside of a request context', () => {
    expect(getCurrentRequestId()).toBeUndefined();
  });

  it('exposes the id set by requestIdStorage.run within its callback', () => {
    requestIdStorage.run('abc12345', () => {
      expect(getCurrentRequestId()).toBe('abc12345');
    });
  });

  it('isolates concurrent contexts from one another', async () => {
    const seenIds: string[] = [];

    await Promise.all([
      requestIdStorage.run('first', async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        seenIds.push(getCurrentRequestId() as string);
      }),
      requestIdStorage.run('second', async () => {
        seenIds.push(getCurrentRequestId() as string);
      }),
    ]);

    expect(seenIds.sort()).toEqual(['first', 'second']);
  });
});
