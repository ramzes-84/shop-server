import { Test, TestingModule } from '@nestjs/testing';
import { YaController } from './ya.controller';
import { YaService } from './ya.service';
import {
  CreateYaOrderDto,
  YaOrderCreationRes,
  YaOrderHistoryRes,
} from './dto/ya.dto';
import { OrderIdParams } from 'src/validation/yandex';
import { yaOrderHistory, yaRecentParcels } from 'src/__test-data__/ya-data';
import { orderConverterResult } from 'src/__test-data__/converter-result';

describe('YaController', () => {
  let controller: YaController;
  let service: YaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [YaController],
      providers: [
        {
          provide: YaService,
          useValue: {
            getHistoryById: jest.fn(),
            createYaOrder: jest.fn(),
            findTrackByOrderReference: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<YaController>(YaController);
    service = module.get<YaService>(YaService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getHistoryById', () => {
    it('should return history by id', async () => {
      const mockHistory: YaOrderHistoryRes = { ...yaOrderHistory };
      jest.spyOn(service, 'getHistoryById').mockResolvedValue(mockHistory);

      const params: OrderIdParams = { id: '1' };
      const result = await controller.getHistoryById(params);

      expect(result).toEqual(mockHistory);
      expect(service.getHistoryById).toHaveBeenCalledWith('1');
    });
  });

  describe('createYaOrder', () => {
    it('should create a new order', async () => {
      const mockOrder: YaOrderCreationRes = { request_id: '1' };
      jest.spyOn(service, 'createYaOrder').mockResolvedValue(mockOrder);

      const createYaOrderDto: CreateYaOrderDto = {
        ...orderConverterResult,
      };
      const result = await controller.createYaOrder(createYaOrderDto);

      expect(result).toEqual(mockOrder);
      expect(service.createYaOrder).toHaveBeenCalledWith(createYaOrderDto);
    });
  });

  describe('getTrackByOrder', () => {
    it('should return YA track info by order reference', async () => {
      const mockTrackInfo = {
        reference: '0001',
        requestId: yaRecentParcels.requests[0].request_id,
        trackNumber: 'TRACK-0001',
        sharingUrl: yaRecentParcels.requests[0].sharing_url,
        status: yaRecentParcels.requests[0].state.status,
      };

      jest
        .spyOn(service, 'findTrackByOrderReference')
        .mockResolvedValue(mockTrackInfo);

      const params: OrderIdParams = { id: '0001' };
      const result = await controller.getTrackByOrder(params);

      expect(result).toEqual(mockTrackInfo);
      expect(service.findTrackByOrderReference).toHaveBeenCalledWith('0001');
    });
  });
});
