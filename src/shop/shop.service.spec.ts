import { Test, TestingModule } from '@nestjs/testing';
import { HttpException } from '@nestjs/common';
import { ShopService } from './shop.service';
import fetch from 'node-fetch';

jest.mock('node-fetch');
const { Response } = jest.requireActual('node-fetch');

describe('ShopService', () => {
  let service: ShopService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ShopService],
    }).compile();

    service = module.get<ShopService>(ShopService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getOrderInfo', () => {
    it('should return order info', async () => {
      const mockOrderInfo = { order: { id: 1, reference: 'TESTREFERENCE' } };
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(
        new Response(JSON.stringify(mockOrderInfo)),
      );

      const result = await service.getOrderInfo(1);
      expect(result).toEqual(mockOrderInfo.order);
    });

    it('should throw an error if fetch fails', async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(
        new Response('Not Found', { status: 404 }),
      );

      await expect(service.getOrderInfo(1)).rejects.toThrow(HttpException);
    });
  });

  describe('getAddressInfo', () => {
    it('should return address info', async () => {
      const mockAddressInfo = { address: { id: 1, city: 'Москва' } };
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(
        new Response(JSON.stringify(mockAddressInfo)),
      );

      const result = await service.getAddressInfo(1);
      expect(result).toEqual(mockAddressInfo.address);
    });

    it('should throw an error if fetch fails', async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(
        new Response('Not Found', { status: 404 }),
      );

      await expect(service.getAddressInfo(1)).rejects.toThrow(HttpException);
    });
  });

  describe('getCustomerInfo', () => {
    it('should return customer info', async () => {
      const mockCustomerInfo = { customer: { id: 1, email: 'test@test.com' } };
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(
        new Response(JSON.stringify(mockCustomerInfo)),
      );

      const result = await service.getCustomerInfo(1);
      expect(result).toEqual(mockCustomerInfo.customer);
    });

    it('should throw an error if fetch fails', async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(
        new Response('Not Found', { status: 404 }),
      );

      await expect(service.getCustomerInfo(1)).rejects.toThrow(HttpException);
    });
  });

  describe('getOrderCarrierInfo', () => {
    it('should return order carrier info', async () => {
      const mockOrderCarrierInfo = {
        order_carriers: [{ id: 1, tracking_number: '12345' }],
      };
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(
        new Response(JSON.stringify(mockOrderCarrierInfo)),
      );

      const result = await service.getOrderCarrierInfo(1);
      expect(result).toEqual(mockOrderCarrierInfo.order_carriers[0]);
    });

    it('should throw an error if fetch fails', async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(
        new Response('Not Found', { status: 404 }),
      );

      await expect(service.getOrderCarrierInfo(1)).rejects.toThrow(
        HttpException,
      );
    });
  });

  describe('getOrderStatuses', () => {
    it('should return order statuses', async () => {
      const mockOrderStatuses = { order_histories: [{ id_order_state: 1 }] };
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(
        new Response(JSON.stringify(mockOrderStatuses)),
      );

      const result = await service.getOrderStatuses(1);
      expect(result).toEqual(mockOrderStatuses.order_histories);
    });

    it('should throw an error if fetch fails', async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(
        new Response('Not Found', { status: 404 }),
      );

      await expect(service.getOrderStatuses(1)).rejects.toThrow(HttpException);
    });
  });
});
