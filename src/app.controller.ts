import { Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AppService } from './app.service';
import {
  CreateInvoiceQueries,
  CreateOrderQueries,
  OrderIdParams,
} from './validation/yandex';
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

  @Post('cash/create')
  @UseGuards(AuthGuard('bearer'))
  cashInvoiceCreate(@Query() query: CreateInvoiceQueries) {
    return this.appService.createCashInvoice(query);
  }

  @Get('yandex/tracking/:id')
  @UseGuards(AuthGuard('bearer'))
  yaOrderHistory(@Param() params: OrderIdParams) {
    return this.appService.getYaOrderHistory(params.id);
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
  // @Get('test/:order')
  // @UseGuards(AuthGuard('bearer'))
  // testEndpoint(@Param() params: Pick<CreateOrderQueries, 'order'>) {
  //   return this.appService.testEndpoint(params.order);
  // }
}
