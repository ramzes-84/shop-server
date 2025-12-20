import { Test, TestingModule } from '@nestjs/testing';
import { CashService } from './cash.service';
import fetch from 'node-fetch';

jest.mock('node-fetch', () => ({
  __esModule: true,
  default: jest.fn(),
}));

const fetchMock = fetch as jest.MockedFunction<typeof fetch>;

describe('CashService', () => {
  let service: CashService;

  beforeEach(async () => {
    process.env.CASH_TOKEN = 'cash-token';
    fetchMock.mockReset();
    const module: TestingModule = await Test.createTestingModule({
      providers: [CashService],
    }).compile();

    service = module.get<CashService>(CashService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('creates cash invoice with auth and idempotence headers', async () => {
    const invoiceResponse = {
      id: 'inv-1',
      delivery_method: { url: 'https://pay' },
    } as any;
    jest.spyOn(Date, 'now').mockReturnValue(1700000000000);
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => invoiceResponse,
    } as any);

    const dto: any = {
      metadata: { order_id: 'ORD-1' },
    };

    const result = await service.createCashInvoice(dto);

    expect(result).toBe(invoiceResponse);
    const [urlString, options] = fetchMock.mock.calls[0];
    const headers = options?.headers as Record<string, string>;
    expect(urlString).toBe('https://api.yookassa.ru/v3/invoices');
    expect(options?.method).toBe('POST');
    expect(options?.body).toBe(JSON.stringify(dto));
    expect(headers['Idempotence-Key']).toBe('ORD-1-1700000000000');
    expect(headers.Authorization).toBe(
      `Basic ${Buffer.from('cash-token:').toString('base64')}`,
    );
  });

  it('throws HttpException when fetchData receives error response', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ code: 'invalid' }),
    } as any);

    await expect(
      service.fetchData(new URL('https://api.yookassa.ru/v3/invoices')),
    ).rejects.toMatchObject({
      status: 400,
      response: { code: 'invalid' },
    });
  });
});
