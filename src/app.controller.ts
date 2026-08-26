import { Controller, Get, Param, Body, Post, UseGuards } from '@nestjs/common';
import { AppService } from './app.service';
import {
  CreateOrderQueries,
  OrderIdParams,
  CreateCashRequest,
} from './validation/yandex';
import { AuthGuard } from '@nestjs/passport';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  // @UseGuards(AuthGuard('bearer'))
  getHello() {
    return this.appService.getHello();
  }

  @Post('yandex/create')
  @UseGuards(AuthGuard('bearer'))
  async yaOrderCreate(@Body() body: CreateOrderQueries) {
    return this.appService.createYaOrder(body);
  }

  @Post('cash/create')
  @UseGuards(AuthGuard('bearer'))
  async cashInvoiceCreate(@Body() body: CreateCashRequest) {
    return this.appService.createCashInvoice(body);
  }

  @Get('yandex/tracking/:id')
  @UseGuards(AuthGuard('bearer'))
  yaOrderHistory(@Param() params: OrderIdParams) {
    return this.appService.getYaOrderHistory(params.id);
  }

  @Get('yandex/info/:id')
  @UseGuards(AuthGuard('bearer'))
  yaOrderInfo(@Param() params: OrderIdParams) {
    return this.appService.getOrderInfo(params.id);
  }

  @Get('revise')
  @UseGuards(AuthGuard('bearer'))
  reviseOrdersStatuses() {
    return this.appService.reviseOrders();
  }

  @Get('test')
  @UseGuards(AuthGuard('bearer'))
  testEndpoint() {
    return this.appService.testEndpoint();
  }
}
