import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthGuard } from '@nestjs/passport';
import { CreateOrderQueries, OrderIdParams } from './validation/yandex';
import { TransferInterface } from './types/transfer-interface';

describe('AppController', () => {
  let controller: AppController;
  let service: AppService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: AppService,
          useValue: {
            getHello: jest.fn(),
            createYaOrder: jest.fn(),
            getYaOrderHistory: jest.fn(),
            getOrderInfo: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(AuthGuard('bearer'))
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<AppController>(AppController);
    service = module.get<AppService>(AppService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getHello', () => {
    it('should return "Hello World!"', async () => {
      const mockResponse = 'Hello World!';
      jest.spyOn(service, 'getHello').mockResolvedValue(mockResponse);

      const result = await controller.getHello();

      expect(result).toBe(mockResponse);
      expect(service.getHello).toHaveBeenCalled();
    });
  });

  describe('yaOrderCreate', () => {
    it('should create a new Ya order', async () => {
      const mockResponse = { ok: true, data: { id: '123' } };
      jest.spyOn(service, 'createYaOrder').mockResolvedValue(mockResponse);

      const query: CreateOrderQueries = {
        order: '1',
        destination: 'destination',
      };

      const result = await controller.yaOrderCreate(query);

      expect(result).toBe(mockResponse);
      expect(service.createYaOrder).toHaveBeenCalledWith(query);
    });
  });

  describe('yaOrderHistory', () => {
    it('should return order history by id', async () => {
      const mockResponse = '<html></html>';
      jest.spyOn(service, 'getYaOrderHistory').mockResolvedValue(mockResponse);

      const params: OrderIdParams = { id: '1' };
      const result = await controller.yaOrderHistory(params);

      expect(result).toBe(mockResponse);
      expect(service.getYaOrderHistory).toHaveBeenCalledWith('1');
    });
  });

  describe('yaOrderInfo', () => {
    it('should return order info by id', async () => {
      const mockResponse: TransferInterface = {
        ok: true,
        data: { id: '1', info: {} },
      };
      jest.spyOn(service, 'getOrderInfo').mockResolvedValue(mockResponse);

      const params: OrderIdParams = { id: '1' };
      const result = await controller.yaOrderInfo(params);

      expect(result).toBe(mockResponse);
      expect(service.getOrderInfo).toHaveBeenCalledWith('1');
    });
  });
});
