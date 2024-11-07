import { Test, TestingModule } from '@nestjs/testing';
import { ShopModule } from './shop.module';
import { ShopService } from './shop.service';
import { ShopController } from './shop.controller';

describe('ShopModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [ShopModule],
    }).compile();
  });

  it('should be defined', () => {
    const shopModule = module.get<ShopModule>(ShopModule);
    expect(shopModule).toBeDefined();
  });

  it('should provide ShopService', () => {
    const shopService = module.get<ShopService>(ShopService);
    expect(shopService).toBeDefined();
  });

  it.skip('should provide ShopController', () => {
    const shopController = module.get<ShopController>(ShopController);
    expect(shopController).toBeDefined();
  });
});
