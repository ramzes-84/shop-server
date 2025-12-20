import { Test, TestingModule } from '@nestjs/testing';
import { BxbService } from './bxb.service';
import fetch from 'node-fetch';

jest.mock('node-fetch', () => ({
  __esModule: true,
  default: jest.fn(),
}));

const fetchMock = fetch as jest.MockedFunction<typeof fetch>;

describe('BxbService', () => {
  let service: BxbService;

  beforeEach(async () => {
    process.env.BB_TOKEN = 'bb-token';
    fetchMock.mockReset();
    const module: TestingModule = await Test.createTestingModule({
      providers: [BxbService],
    }).compile();

    service = module.get<BxbService>(BxbService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('builds 30 day window for getParcelsInInterval', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2025-01-31T12:00:00Z'));
    const payload = { requests: [] } as any;
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => payload,
    } as any);

    const result = await service.getParcelsInInterval();

    expect(result).toBe(payload);
    const [urlString] = fetchMock.mock.calls[0];
    const url = new URL(urlString as string);
    expect(url.searchParams.get('method')).toBe('ParselStory');
    expect(url.searchParams.get('token')).toBe('bb-token');
    expect(url.searchParams.get('to')).toBe('20250131');
    expect(url.searchParams.get('from')).toBe('20250101');
  });

  it('passes order data to DeliveryCosts for getParcelCost', async () => {
    const payload = { cost: 123 } as any;
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => payload,
    } as any);
    const order: any = {
      price: '1000',
      payment_sum: '500',
      shop: { name1: 'Москва', name: 'Питер' },
      weights: { weight: '1', z: '2', x: '3', y: '4' },
    };

    const result = await service.getParcelCost(order);

    expect(result).toBe(payload);
    const [urlString] = fetchMock.mock.calls[0];
    const url = new URL(urlString as string);
    expect(url.searchParams.get('method')).toBe('DeliveryCosts');
    expect(url.searchParams.get('ordersum')).toBe('1000');
    expect(url.searchParams.get('paysum')).toBe('500');
    expect(url.searchParams.get('targetstart')).toBe('Москва');
    expect(url.searchParams.get('target')).toBe('Питер');
    expect(url.searchParams.get('token')).toBe('bb-token');
  });

  it('sends POST payload when creating parcel', async () => {
    const payload = { success: true } as any;
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => payload,
    } as any);
    const parcelInfo: any = { reference: 'BB-1' };

    const result = await service.createBoxberryParcel(parcelInfo);

    expect(result).toBe(payload);
    const [, options] = fetchMock.mock.calls[0];
    expect(options?.method).toBe('POST');
    expect(options?.body).toContain('"method":"ParselCreate"');
    expect(options?.body).toContain('"token":"bb-token"');
    expect(options?.body).toContain('"reference":"BB-1"');
  });

  it('throws HttpException when fetchData fails', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 502,
      statusText: 'Bad Gateway',
      text: async () => 'BB down',
    } as any);

    await expect(
      service.fetchData(new URL('https://api.boxberry.ru/json.php')),
    ).rejects.toThrow('Failed to fetch from BB: Bad Gateway - BB down');
  });
});
