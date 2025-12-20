import { Test, TestingModule } from '@nestjs/testing';
import { PostService } from './post.service';
import fetch from 'node-fetch';
import * as soap from 'soap';

jest.mock('node-fetch', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('soap', () => ({
  createClient: jest.fn(),
}));

const fetchMock = fetch as jest.MockedFunction<typeof fetch>;
const createClientMock = soap.createClient as jest.MockedFunction<
  typeof soap.createClient
>;

describe('PostService', () => {
  let service: PostService;

  beforeEach(async () => {
    process.env.POST_TOKEN = 'post-token';
    process.env.POST_BASIC_TOKEN = 'basic-token';
    process.env.POST_PERSONAL_LOGIN = 'login';
    process.env.POST_PERSONAL_PASSWORD = 'password';
    fetchMock.mockReset();
    createClientMock.mockReset();
    const module: TestingModule = await Test.createTestingModule({
      providers: [PostService],
    }).compile();

    service = module.get<PostService>(PostService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('fetches parcel data with authorization headers', async () => {
    const payload = { data: [] } as any;
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => payload,
    } as any);

    const result = await service.getPostParcelData('TRACK-1');

    expect(result).toBe(payload);
    const [urlString, options] = fetchMock.mock.calls[0];
    const url = new URL(urlString as string);
    expect(url.searchParams.get('query')).toBe('TRACK-1');
    const headers = options?.headers as Record<string, string>;
    expect(headers.Authorization).toBe('AccessToken post-token');
    expect(headers['X-User-Authorization']).toBe('Basic basic-token');
  });

  it('throws HttpException when fetchData fails', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({}),
    } as any);

    await expect(
      service.fetchData(new URL('https://otpravka-api.pochta.ru/1.0/test')),
    ).rejects.toMatchObject({ status: 403 });
  });

  it('retrieves operation history via SOAP client', async () => {
    const soapResponse = { OperationHistoryData: {} } as any;
    const addHeader = jest.fn();
    createClientMock.mockImplementation((endpoint, options, cb) => {
      const callback = typeof options === 'function' ? options : cb;
      const client = {
        addSoapHeader: addHeader,
        getOperationHistory: (
          args: any,
          done: (err: any, res?: any) => void,
        ) => {
          expect(args.AuthorizationHeader).toEqual({
            login: 'login',
            password: 'password',
          });
          expect(args.OperationHistoryRequest.Barcode).toBe('TRACK-2');
          done(null, soapResponse);
        },
      } as any;
      callback?.(null, client);
    });

    const result = await service.getOperationHistory('TRACK-2');

    expect(result).toBe(soapResponse);
    expect(addHeader).toHaveBeenCalledWith(
      {
        'soapenv:mustUnderstand': '1',
      },
      '',
      'soapenv',
      'http://schemas.xmlsoap.org/soap/envelope/',
    );
  });

  it('rejects when SOAP getOperationHistory errors', async () => {
    createClientMock.mockImplementation((endpoint, options, cb) => {
      const callback = typeof options === 'function' ? options : cb;
      const client = {
        addSoapHeader: jest.fn(),
        getOperationHistory: (_args: any, done: (err: any) => void) => {
          done(new Error('soap fail'));
        },
      } as any;
      callback?.(null, client);
    });

    await expect(service.getOperationHistory('TRACK-ERR')).rejects.toThrow(
      'soap fail',
    );
  });

  it('rejects when SOAP client creation fails', async () => {
    createClientMock.mockImplementation((endpoint, options, cb) => {
      const callback = typeof options === 'function' ? options : cb;
      callback?.(new Error('creation error'), undefined as any);
    });

    await expect(service.getOperationHistory('TRACK-ERR')).rejects.toThrow(
      'creation error',
    );
  });
});
