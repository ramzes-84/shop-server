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
      { wsdl_options: { timeout: expect.any(Number) } },
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

  describe('createOrder', () => {
    const orderRequest = {
      auth: { clientNumber: 1234, clientKey: 'secret' },
      header: {
        datePickup: '2026-09-26',
        senderAddress: { name: 'Shop', terminalCode: '2N83' },
        pickupTimePeriod: '9-18',
      },
      order: [
        {
          orderNumberInternal: 'REF-1',
          serviceCode: 'PCL',
          serviceVariant: 'ТТ',
          cargoNumPack: 1,
          cargoWeight: 0.15,
          cargoRegistered: false,
          cargoCategory: 'Косметика',
          receiverAddress: { name: 'Client', terminalCode: 'M91' },
          unitLoad: [{ descript: 'Товар', count: 1 }],
        },
      ],
    } as any;

    it('sends the request under the "orders" tag and normalizes the "return" array', async () => {
      const creationResponse = {
        return: [
          {
            orderNumberInternal: 'REF-1',
            orderNum: '01010001MOW',
            status: 'OK',
          },
        ],
      } as any;
      createClientMock.mockImplementation((endpoint, options, cb) => {
        const callback = typeof options === 'function' ? options : cb;
        const client = {
          createOrder2: (args: any, done: (err: any, res?: any) => void) => {
            expect(args).toEqual({ orders: orderRequest });
            done(null, creationResponse);
          },
        } as any;
        callback?.(null, client);
      });

      const result = await service.createOrder(orderRequest);

      expect(result).toEqual({
        orderNumberInternal: 'REF-1',
        orderNum: '01010001MOW',
        status: 'OK',
      });
      expect(createClientMock).toHaveBeenCalledWith(
        service.createEndpoint,
        { wsdl_options: { timeout: expect.any(Number) } },
        expect.any(Function),
      );
    });

    it('normalizes a bare object "return" (single order) into an array', async () => {
      const creationResponse = {
        return: { orderNumberInternal: 'REF-1', status: 'OrderPending' },
      } as any;
      createClientMock.mockImplementation((_endpoint, options, cb) => {
        const callback = typeof options === 'function' ? options : cb;
        const client = {
          createOrder2: (_args: any, done: (err: any, res?: any) => void) => {
            done(null, creationResponse);
          },
        } as any;
        callback?.(null, client);
      });

      const result = await service.createOrder(orderRequest);

      expect(result).toEqual({
        orderNumberInternal: 'REF-1',
        status: 'OrderPending',
      });
    });

    it('rejects when createOrder2 call errors', async () => {
      createClientMock.mockImplementation((_endpoint, options, cb) => {
        const callback = typeof options === 'function' ? options : cb;
        const client = {
          createOrder2: (_args: any, done: (err: any) => void) => {
            done(new Error('dpd create fail'));
          },
        } as any;
        callback?.(null, client);
      });

      await expect(service.createOrder(orderRequest)).rejects.toThrow(
        'dpd create fail',
      );
    });
  });
});
