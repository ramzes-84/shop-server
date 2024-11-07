import { Test, TestingModule } from '@nestjs/testing';
import { YaController } from './ya.controller';
import { YaService } from './ya.service';
import {
  CreateYaOrderDto,
  YaOrderCreationRes,
  YaOrderHistoryRes,
} from './dto/ya.dto';
import { OrderIdParams } from 'src/validation/yandex';
import { yaOrderHistory } from 'src/__test-data__/ya-data';
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
});
