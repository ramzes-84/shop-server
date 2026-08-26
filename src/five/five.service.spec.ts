import { FiveService } from './five.service';
import fetch from 'node-fetch';

jest.mock('node-fetch');
const mockedFetch = fetch as unknown as jest.Mock;

const fakeJwt = 'header.payload.signature';

describe('FiveService', () => {
  let service: FiveService;
  const OLD_API = process.env.FIVE_POST_API_KEY;

  beforeEach(() => {
    process.env.FIVE_POST_API_KEY = 'test-apikey';
    jest.resetAllMocks();
    service = new FiveService();
  });

  afterEach(() => {
    if (OLD_API === undefined) delete process.env.FIVE_POST_API_KEY;
    else process.env.FIVE_POST_API_KEY = OLD_API;
  });

  test('fetches token and caches it', async () => {
    mockedFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ jwt: fakeJwt }),
      status: 200,
    });

    const t1 = await service.getToken();
    expect(t1).toBe(fakeJwt);

    // second call should not call fetch again (cached)
    const t2 = await service.getToken();
    expect(t2).toBe(fakeJwt);
    expect(mockedFetch).toHaveBeenCalledTimes(1);
  });

  test('refreshes token on 401 and retries requestWithAuth', async () => {
    // First token fetch
    mockedFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ jwt: fakeJwt }),
      status: 200,
    });
    // First API call returns 401 with Invalid or Expired token
    mockedFetch.mockResolvedValueOnce({
      status: 401,
      text: async () => 'Invalid or Expired token',
    });
    // Second token fetch after 401
    mockedFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ jwt: 'newJwt' }),
      status: 200,
    });
    // Retry of API call
    mockedFetch.mockResolvedValueOnce({
      status: 200,
      ok: true,
      json: async () => ({ result: 'ok' }),
    });

    const res = await service.requestWithAuth('/some', { method: 'GET' });
    expect(res.ok).toBe(true);
    expect(mockedFetch).toHaveBeenCalled();
  });

  test('getOrderStatus returns results and caches them', async () => {
    // Token
    mockedFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ jwt: fakeJwt }),
      status: 200,
    });
    // getOrderStatus response
    const statusResp = [
      {
        status: 'DONE',
        senderOrderId: 'a1',
        orderId: 'o1',
        executionStatus: 'PICKED_UP',
        changeDate: '2021-01-01T00:00:00Z',
      },
    ];
    mockedFetch.mockResolvedValueOnce({
      status: 200,
      ok: true,
      json: async () => statusResp,
    });

    const res = await service.getOrderStatus(['a1']);
    expect(res).toHaveLength(1);
    expect(res[0].senderOrderId).toBe('a1');

    // Second call should use cache and not call fetch again for status
    const res2 = await service.getOrderStatus(['a1']);
    expect(res2).toHaveLength(1);
  });

  test('getOrderStatus throws on 429', async () => {
    // Token
    mockedFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ jwt: fakeJwt }),
      status: 200,
    });
    // 429 response
    mockedFetch.mockResolvedValueOnce({
      status: 429,
      ok: false,
      text: async () => 'Too Many Requests',
    });

    await expect(service.getOrderStatus(['b1'])).rejects.toThrow(/Rate limit/);
  });
});
