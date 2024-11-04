import { Test, TestingModule } from '@nestjs/testing';
import { ShopController } from './shop.controller';
import { ShopService } from './shop.service';
import { OrderInfoResDto } from './dto/order-info.dto';
import { AddressInfoResDto } from './dto/address-info.dto';
import { CustomerInfoResDto } from './dto/customer-info.dto';
import { OrderCarrierInfoResDto } from './dto/order-carrier-info.dto';
import { StatusesInfoResDto } from './dto/statuses-info.dto';
import {
  addressDetails,
  customerDetails,
  orderDetails,
  shippingDetails,
  statusesDetails,
} from 'src/__test-data__/shop-data';

describe('ShopController', () => {
  let controller: ShopController;
  let service: ShopService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ShopController],
      providers: [
        {
          provide: ShopService,
          useValue: {
            getOrderInfo: jest.fn(),
            getAddressInfo: jest.fn(),
            getCustomerInfo: jest.fn(),
            getOrderCarrierInfo: jest.fn(),
            getOrderStatuses: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<ShopController>(ShopController);
    service = module.get<ShopService>(ShopService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getOrderInfo', () => {
    it('should return order info', async () => {
      const mockOrderInfo: OrderInfoResDto['order'] = { ...orderDetails };
      jest.spyOn(service, 'getOrderInfo').mockResolvedValue(mockOrderInfo);

      const result = await controller.findOne('19979');
      expect(result).toEqual(mockOrderInfo);
    });
  });

  describe('getAddressInfo', () => {
    it('should return address info', async () => {
      const mockAddressInfo: AddressInfoResDto['address'] = {
        ...addressDetails,
      };
      jest.spyOn(service, 'getAddressInfo').mockResolvedValue(mockAddressInfo);

      const result = await controller.findOneAddress('1');
      expect(result).toEqual(mockAddressInfo);
    });
  });

  describe('getCustomerInfo', () => {
    it('should return customer info', async () => {
      const mockCustomerInfo: CustomerInfoResDto['customer'] = {
        ...customerDetails,
      };
      jest
        .spyOn(service, 'getCustomerInfo')
        .mockResolvedValue(mockCustomerInfo);

      const result = await controller.findOneCustomer('1');
      expect(result).toEqual(mockCustomerInfo);
    });
  });

  describe('getOrderCarrierInfo', () => {
    it('should return order carrier info', async () => {
      const mockOrderCarrierInfo: OrderCarrierInfoResDto['order_carriers'][0] =
        {
          ...shippingDetails.order_carriers[0],
        };
      jest
        .spyOn(service, 'getOrderCarrierInfo')
        .mockResolvedValue(mockOrderCarrierInfo);

      const result = await controller.getOrderCarrier('1');
      expect(result).toEqual(mockOrderCarrierInfo);
    });
  });

  describe('getOrderStatuses', () => {
    it('should return order statuses', async () => {
      const mockOrderStatuses: StatusesInfoResDto['order_histories'] = [
        ...statusesDetails,
      ];
      jest
        .spyOn(service, 'getOrderStatuses')
        .mockResolvedValue(mockOrderStatuses);

      const result = await controller.getOrderStatuses('1');
      expect(result).toEqual(mockOrderStatuses);
    });
  });
});
