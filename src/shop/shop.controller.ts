import { Controller, Get, Param } from '@nestjs/common';
import { ShopService } from './shop.service';

@Controller('shop')
export class ShopController {
  constructor(private readonly shopService: ShopService) {}

  @Get('order/:id')
  findOne(@Param('id') id: string) {
    return this.shopService.getOrderInfo(+id);
  }

  @Get('customer/:id')
  findOneCustomer(@Param('id') id: string) {
    return this.shopService.getCustomerInfo(+id);
  }

  @Get('address/:id')
  findOneAddress(@Param('id') id: string) {
    return this.shopService.getAddressInfo(+id);
  }

  @Get('history/:id')
  getOrderStatuses(@Param('id') id: string) {
    return this.shopService.getOrderStatuses(+id);
  }

  @Get('carrier/:id')
  getOrderCarrier(@Param('id') id: string) {
    return this.shopService.getOrderCarrierInfo(+id);
  }
}
