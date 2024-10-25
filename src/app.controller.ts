import { Controller, Get, Param, Post, Query } from '@nestjs/common';
import { AppService } from './app.service';
import { CreateOrderQueries, OrderIdParams } from './validation/yandex';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Post('yandex/create')
  yaOrderCreate(@Query() query: CreateOrderQueries) {
    return this.appService.createYaOrder(query);
  }

  @Get('yandex/tracking/:id')
  yaOrderHistory(@Param() params: OrderIdParams) {
    return this.appService.trackYaOrder(params.id);
  }

  @Get('yandex/info/:id')
  yaOrderInfo(@Param() params: OrderIdParams) {
    return this.appService.getOrderInfo(params.id);
  }
}
