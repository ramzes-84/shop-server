import fetch from 'node-fetch';
import {
  ExternalRequestTimeoutError,
  fetchWithTimeout,
} from './fetch-with-timeout';

jest.mock('node-fetch', () => ({
  __esModule: true,
  default: jest.fn(),
}));

const fetchMock = fetch as unknown as jest.Mock;

describe('fetchWithTimeout', () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  it('passes an abort signal to fetch and returns the response', async () => {
    const response = { ok: true } as never;
    fetchMock.mockResolvedValue(response);

    await expect(fetchWithTimeout('https://example.test')).resolves.toBe(
      response,
    );

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://example.test');
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect(init.signal.aborted).toBe(false);
  });

  it('throws ExternalRequestTimeoutError when the request is aborted', async () => {
    fetchMock.mockImplementation(
      (_url: string, init: { signal: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          init.signal.addEventListener('abort', () =>
            reject(new Error('aborted')),
          );
        }),
    );

    await expect(fetchWithTimeout('https://slow.test', {}, 10)).rejects.toThrow(
      ExternalRequestTimeoutError,
    );
  });

  it('rethrows network errors unchanged', async () => {
    fetchMock.mockRejectedValue(new Error('ECONNREFUSED'));

    await expect(fetchWithTimeout('https://down.test')).rejects.toThrow(
      'ECONNREFUSED',
    );
  });

  it('clears the timer so a slow-but-successful call does not abort later', async () => {
    jest.useFakeTimers();
    fetchMock.mockResolvedValue({ ok: true } as never);

    await fetchWithTimeout('https://example.test', {}, 50);
    const [, init] = fetchMock.mock.calls[0];

    jest.advanceTimersByTime(100);
    expect(init.signal.aborted).toBe(false);

    jest.useRealTimers();
  });
});
