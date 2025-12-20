import { Test, TestingModule } from '@nestjs/testing';
import { DpdService } from './dpd.service';
import * as soap from 'soap';

jest.mock('soap', () => ({
  createClient: jest.fn(),
}));

const createClientMock = soap.createClient as jest.MockedFunction<
  typeof soap.createClient
>;

describe('DpdService', () => {
  let service: DpdService;

  beforeEach(async () => {
    process.env.DPD_CLIENT = '1234';
    process.env.DPD_TOKEN = 'secret';
    createClientMock.mockReset();
    const module: TestingModule = await Test.createTestingModule({
      providers: [DpdService],
    }).compile();

    service = module.get<DpdService>(DpdService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('creates DPD order through SOAP client', async () => {
    const creationResponse = {
      return: { orderNum: 'DPD-1' },
    } as any;
    createClientMock.mockImplementation((endpoint, options, cb) => {
      const callback = typeof options === 'function' ? options : cb;
      const client = {
        createOrder: (args: any, done: (err: any, res?: any) => void) => {
          expect(args.orders.auth).toEqual({
            clientNumber: 1234,
            clientKey: 'secret',
          });
          done(null, creationResponse);
        },
      } as any;
      callback?.(null, client);
    });

    const result = await service.createOrder({
      header: { datePickup: '2025-01-01' },
      order: { orderNumberInternal: '10' },
    } as any);

    expect(result).toBe(creationResponse);
    expect(createClientMock).toHaveBeenCalledWith(
      service.createEndpoint,
      expect.any(Function),
    );
  });

  it('rejects when createOrder client creation fails', async () => {
    createClientMock.mockImplementation((_endpoint, options, cb) => {
      const callback = typeof options === 'function' ? options : cb;
      callback?.(new Error('soap down'), undefined as any);
    });

    await expect(
      service.createOrder({ header: {}, order: {} } as any),
    ).rejects.toThrow('soap down');
  });

  it('retrieves states via SOAP client', async () => {
    const statesResponse = {
      return: { states: [{ newState: 'Delivered' }] },
    } as any;
    createClientMock.mockImplementation((endpoint, options, cb) => {
      const callback = typeof options === 'function' ? options : cb;
      const client = {
        getStatesByDPDOrder: (
          args: any,
          done: (err: any, res?: any) => void,
        ) => {
          expect(args.request.auth).toEqual({
            clientNumber: 1234,
            clientKey: 'secret',
          });
          expect(args.request.dpdOrderNr).toBe('DPD-123');
          done(null, statesResponse);
        },
      } as any;
      callback?.(null, client);
    });

    const result = await service.getStatesByDPDOrder('DPD-123');

    expect(result).toBe(statesResponse);
    expect(createClientMock).toHaveBeenCalledWith(
      service.trackingEndpoint,
      expect.any(Function),
    );
  });

  it('rejects when getStatesByDPDOrder call errors', async () => {
    createClientMock.mockImplementation((_endpoint, options, cb) => {
      const callback = typeof options === 'function' ? options : cb;
      const client = {
        getStatesByDPDOrder: (_args: any, done: (err: any) => void) => {
          done(new Error('dpd fail'));
        },
      } as any;
      callback?.(null, client);
    });

    await expect(service.getStatesByDPDOrder('DPD-ERR')).rejects.toThrow(
      'dpd fail',
    );
  });
});
