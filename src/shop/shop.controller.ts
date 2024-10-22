import { Controller, Get, Param } from '@nestjs/common';
import { ShopService } from './shop.service';

@Controller('shop')
export class ShopController {
  constructor(private readonly shopService: ShopService) {}

  @Get('order/:id')
  findOne(@Param('id') id: string) {
    return this.shopService.getOrderInfo(+id);
  }

  @Get('address/:id')
  findOneAddress(@Param('id') id: string) {
    return this.shopService.getOrderInfo(+id);
  }

  // @Post()
  // create() {
  //   return this.shopService.create();
  // }

  // @Get()
  // findAll() {
  //   return this.shopService.findAll();
  // }

  // @Patch(':id')
  // update(@Param('id') id: string) {
  //   return this.shopService.update(+id);
  // }

  // @Delete(':id')
  // remove(@Param('id') id: string) {
  //   return this.shopService.remove(+id);
  // }
}
