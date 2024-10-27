import { Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AppService } from './app.service';
import { CreateOrderQueries, OrderIdParams } from './validation/yandex';
import { AuthGuard } from '@nestjs/passport';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @UseGuards(AuthGuard('bearer'))
  getHello() {
    return this.appService.getHello();
  }

  @Post('yandex/create')
  @UseGuards(AuthGuard('bearer'))
  yaOrderCreate(@Query() query: CreateOrderQueries) {
    return this.appService.createYaOrder(query);
  }

  @Get('yandex/tracking/:id')
  @UseGuards(AuthGuard('bearer'))
  yaOrderHistory(@Param() params: OrderIdParams) {
    return this.appService.trackYaOrder(params.id);
  }

  @Get('yandex/info/:id')
  @UseGuards(AuthGuard('bearer'))
  yaOrderInfo(@Param() params: OrderIdParams) {
    return this.appService.getOrderInfo(params.id);
  }
}
