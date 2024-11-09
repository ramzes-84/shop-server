import { Test, TestingModule } from '@nestjs/testing';
import { AppService } from './app.service';
import { ShopService } from './shop/shop.service';
import { YaService } from './ya/ya.service';
import { MailService } from './mail/mail.service';
import { CreateOrderQueries } from './validation/yandex';
import {
  CreateYaOrderDto,
  YaOrderCreationRes,
  YaOrderInfoRes,
} from './ya/dto/ya.dto';
import { convertOrder } from './utils/convertOrder';
import {
  addressDetails,
  customerDetails,
  orderDetails,
  shippingDetails,
} from 'src/__test-data__/shop-data';
import { orderConverterResult } from './__test-data__/converter-result';
import { yaOrderHistory } from './__test-data__/ya-data';
import { yaOrderInfo } from './__test-data__/ya-order-info';
import { BxbService } from './bxb/bxb.service';
import { CashService } from './cash/cash.service';

jest.mock('./utils/convertOrder');

describe('AppService', () => {
  let service: AppService;
  let shopService: ShopService;
  let yaService: YaService;
  let mailService: MailService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppService,
        {
          provide: ShopService,
          useValue: {
            getOrderInfo: jest.fn(),
            getAddressInfo: jest.fn(),
            getCustomerInfo: jest.fn(),
            getOrderCarrierInfo: jest.fn(),
          },
        },
        {
          provide: YaService,
          useValue: {
            getHistoryById: jest.fn(),
            createYaOrder: jest.fn(),
            getOrderInfo: jest.fn(),
          },
        },
        {
          provide: BxbService,
          useValue: {
            getParcelsInInterval: jest.fn(),
            getInProgressParcels: jest.fn(),
            getParcelStatuses: jest.fn(),
          },
        },
        {
          provide: CashService,
          useValue: {
            createCashInvoice: jest.fn(),
          },
        },
        {
          provide: MailService,
          useValue: {
            emitHealth: jest.fn(),
            sendToAdmin: jest.fn(),
            send: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AppService>(AppService);
    shopService = module.get<ShopService>(ShopService);
    yaService = module.get<YaService>(YaService);
    mailService = module.get<MailService>(MailService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getHello', () => {
    it('should send an email to the admin and return "Hello World!"', async () => {
      jest.spyOn(mailService, 'emitHealth').mockResolvedValue(undefined);

      const result = await service.getHello();

      expect(mailService.emitHealth).toHaveBeenCalled();
      expect(result).toBe('Hello World!');
    });
  });

  describe('createYaOrder', () => {
    it('should create a new Ya order and return the order ID', async () => {
      const mockOrderDetails = { ...orderDetails };
      const mockAddressDetails = { ...addressDetails };
      const mockCustomerDetails = { ...customerDetails };
      const mockShippingDetails = { ...shippingDetails };
      const mockYaOrderData: CreateYaOrderDto = { ...orderConverterResult };
      const mockYaOrderId: YaOrderCreationRes = { request_id: '123' };

      jest
        .spyOn(shopService, 'getOrderInfo')
        .mockResolvedValue(mockOrderDetails);
      jest
        .spyOn(shopService, 'getAddressInfo')
        .mockResolvedValue(mockAddressDetails);
      jest
        .spyOn(shopService, 'getCustomerInfo')
        .mockResolvedValue(mockCustomerDetails);
      jest
        .spyOn(shopService, 'getOrderCarrierInfo')
        .mockResolvedValue(mockShippingDetails.order_carriers[0]);
      jest.spyOn(yaService, 'createYaOrder').mockResolvedValue(mockYaOrderId);
      (convertOrder as jest.Mock).mockReturnValue(mockYaOrderData);

      const createOrderQueries: CreateOrderQueries = {
        order: '1',
        destination: 'destination',
      };

      const result = await service.createYaOrder(createOrderQueries);

      expect(shopService.getOrderInfo).toHaveBeenCalledWith(1);
      expect(shopService.getAddressInfo).toHaveBeenCalledWith(111005);
      expect(shopService.getCustomerInfo).toHaveBeenCalledWith(6190);
      expect(shopService.getOrderCarrierInfo).toHaveBeenCalledWith(1);
      expect(convertOrder).toHaveBeenCalledWith(
        mockOrderDetails,
        mockAddressDetails,
        mockCustomerDetails,
        mockShippingDetails.order_carriers[0],
        'destination',
      );
      expect(yaService.createYaOrder).toHaveBeenCalledWith(mockYaOrderData);
      expect(result).toEqual({ ok: true, data: mockYaOrderId });
    });

    it('should return an error if something goes wrong', async () => {
      const mockError = new Error('Something went wrong');
      jest.spyOn(shopService, 'getOrderInfo').mockRejectedValue(mockError);

      const createOrderQueries: CreateOrderQueries = {
        order: '1',
        destination: 'destination',
      };

      const result = await service.createYaOrder(createOrderQueries);

      expect(result).toEqual({ ok: false, data: mockError });
    });
  });

  describe('getYaOrderHistory', () => {
    it('should return order history for a given ID', async () => {
      const mockHistoryData = { ...yaOrderHistory };
      const expectedHtml = `<div><h3>${yaOrderHistory.state_history[1].description}</h3><p>${new Date(yaOrderHistory.state_history[1].timestamp_utc).toLocaleString()}</p></div><div><h3>${yaOrderHistory.state_history[0].description}</h3><p>${new Date(yaOrderHistory.state_history[0].timestamp_utc).toLocaleString()}</p></div>`;

      jest
        .spyOn(yaService, 'getHistoryById')
        .mockResolvedValue(mockHistoryData);

      const result = await service.getYaOrderHistory('1');
      expect(result).toEqual(expectedHtml);
      expect(yaService.getHistoryById).toHaveBeenCalledWith('1');
    });

    it('should throw an error if fetching history fails', async () => {
      const mockError = new Error('Something went wrong');
      jest.spyOn(yaService, 'getHistoryById').mockRejectedValue(mockError);

      await expect(service.getYaOrderHistory('1')).rejects.toThrow(mockError);
    });
  });

  describe('getOrderInfo', () => {
    it('should return order info for a given ID', async () => {
      const mockOrderInfo: YaOrderInfoRes = { ...yaOrderInfo };
      jest.spyOn(yaService, 'getOrderInfo').mockResolvedValue(mockOrderInfo);

      const result = await service.getOrderInfo('1');
      expect(result).toEqual({
        ok: true,
        data: { sharing_url: yaOrderInfo.sharing_url },
      });
      expect(yaService.getOrderInfo).toHaveBeenCalledWith('1');
    });

    it('should throw an error if fetching order info fails', async () => {
      const mockError = new Error('Something went wrong');
      jest.spyOn(yaService, 'getOrderInfo').mockRejectedValue(mockError);

      const result = await service.getOrderInfo('1');

      expect(result).toEqual({
        ok: false,
        data: mockError,
      });
    });
  });
});
