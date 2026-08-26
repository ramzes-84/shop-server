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
  getHello() {
    return this.appService.getHello();
  }

  @Post('yandex/create')
  @UseGuards(AuthGuard('jwt'))
  async yaOrderCreate(@Body() body: CreateOrderQueries) {
    return this.appService.createYaOrder(body);
  }

  @Post('cash/create')
  @UseGuards(AuthGuard('jwt'))
  async cashInvoiceCreate(@Body() body: CreateCashRequest) {
    return this.appService.createCashInvoice(body);
  }

  @Get('yandex/tracking/:id')
  @UseGuards(AuthGuard('jwt'))
  yaOrderHistory(@Param() params: OrderIdParams) {
    return this.appService.getYaOrderHistory(params.id);
  }

  @Get('yandex/info/:id')
  @UseGuards(AuthGuard('jwt'))
  yaOrderInfo(@Param() params: OrderIdParams) {
    return this.appService.getOrderInfo(params.id);
  }

  @Get('revise')
  @UseGuards(AuthGuard('jwt'))
  reviseOrdersStatuses() {
    return this.appService.reviseOrders();
  }

  @Get('test')
  @UseGuards(AuthGuard('jwt'))
  testEndpoint() {
    return this.appService.testEndpoint();
  }
}
