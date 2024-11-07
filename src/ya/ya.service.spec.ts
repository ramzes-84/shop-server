import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, RequestMethod } from '@nestjs/common';
import { YaService } from './ya.service';
import fetch from 'node-fetch';
import {
  CreateYaOrderDto,
  YaOrderCreationRes,
  YaOrderInfoRes,
} from './dto/ya.dto';
import { ErrorYaResDTO } from './dto/ya-errors';
import { yaOrderInfo } from 'src/__test-data__/ya-order-info';
import { orderConverterResult } from 'src/__test-data__/converter-result';

jest.mock('node-fetch');
const { Response } = jest.requireActual('node-fetch');

describe('YaService', () => {
  let service: YaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [YaService],
    }).compile();

    service = module.get<YaService>(YaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('fetchData', () => {
    it('should fetch data successfully for YaOrderCreationRes', async () => {
      const mockResponse: YaOrderCreationRes = {
        request_id: '123',
      };
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(
        new Response(JSON.stringify(mockResponse)),
      );
      const url = new URL('https://example.com/api');
      const headers = { 'Content-Type': 'application/json' };
      const body = JSON.stringify({ key: 'value' });
      const result = await service.fetchData<YaOrderCreationRes>(
        url,
        RequestMethod.POST,
        headers,
        body,
      );
      expect(result).toEqual(mockResponse);
    });

    it('should throw an error if fetch fails', async () => {
      const mockError: ErrorYaResDTO = {
        code: '404',
        message: 'Not Found',
        details: {
          code: '404',
          message: 'Not Found',
          error_details: ['Not Found'],
          details: { details: ['Not Found'] },
        },
      };
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(
        new Response(JSON.stringify(mockError), { status: 400 }),
      );
      const url = new URL('https://example.com/api');
      const headers = { 'Content-Type': 'application/json' };
      const body = JSON.stringify({ key: 'value' });
      await expect(
        service.fetchData<YaOrderCreationRes>(
          url,
          RequestMethod.POST,
          headers,
          body,
        ),
      ).rejects.toThrow(HttpException);
    });

    it('should fetch data successfully for YaOrderInfoRes', async () => {
      const mockResponse: YaOrderInfoRes = {
        ...yaOrderInfo,
      };
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(
        new Response(JSON.stringify(mockResponse)),
      );
      const url = new URL('https://example.com/api');
      const result = await service.fetchData<YaOrderInfoRes>(url);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getHistoryById', () => {
    it('should return history data for a given ID', async () => {
      const mockHistoryData = { id: '1', events: [] };
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(
        new Response(JSON.stringify(mockHistoryData)),
      );

      const result = await service.getHistoryById('1');
      expect(result).toEqual(mockHistoryData);
    });

    it('should throw an error if fetch fails', async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(
        new Response('Not Found', { status: 404 }),
      );

      await expect(service.getHistoryById('1')).rejects.toThrow();
    });
  });

  describe('getOrderInfo', () => {
    it('should return order info for a given ID', async () => {
      const mockOrderInfo: YaOrderInfoRes = {
        ...yaOrderInfo,
      };
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(
        new Response(JSON.stringify(mockOrderInfo)),
      );

      const result = await service.getOrderInfo('1');
      expect(result).toEqual(mockOrderInfo);
    });

    it('should throw an error if fetch fails', async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(
        new Response('Not Found', { status: 404 }),
      );

      await expect(service.getOrderInfo('1')).rejects.toThrow();
    });
  });

  describe('createYaOrder', () => {
    it('should create a new order and return the order ID', async () => {
      const mockOrderCreationRes: YaOrderCreationRes = {
        request_id: '000000000',
      };
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(
        new Response(JSON.stringify(mockOrderCreationRes)),
      );

      const createYaOrderDto: CreateYaOrderDto = {
        ...orderConverterResult,
      };

      const result = await service.createYaOrder(createYaOrderDto);
      expect(result).toEqual(mockOrderCreationRes);
    });

    it('should throw an error if fetch fails', async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(
        new Response('Not Found', { status: 404 }),
      );

      const createYaOrderDto: CreateYaOrderDto = {
        ...orderConverterResult,
      };

      await expect(service.createYaOrder(createYaOrderDto)).rejects.toThrow();
    });
  });
});
