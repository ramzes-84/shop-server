import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { AppService } from './app.service';
import {
  CreateOrderQueries,
  OrderIdParams,
  CreateCashRequest,
} from './validation/yandex';
import { AuthGuard } from '@nestjs/passport';
import { CronReviseJwtGuard, EmployeeJwtGuard } from './auth/jwt-scope.guard';
import { AuthenticatedEmployee } from './auth/jwt-claims';

type AuthenticatedRequest = Request & { user: AuthenticatedEmployee };

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello() {
    return this.appService.getHello();
  }

  @Post('yandex/create')
  @UseGuards(AuthGuard('jwt'), EmployeeJwtGuard)
  async yaOrderCreate(
    @Body() body: CreateOrderQueries,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.appService.createYaOrder(
      body,
      request.user.yaSourcePlatformIds,
    );
  }

  @Post('cash/create')
  @UseGuards(AuthGuard('jwt'), EmployeeJwtGuard)
  async cashInvoiceCreate(@Body() body: CreateCashRequest) {
    return this.appService.createCashInvoice(body);
  }

  @Get('yandex/tracking/:id')
  @UseGuards(AuthGuard('jwt'), EmployeeJwtGuard)
  yaOrderHistory(@Param() params: OrderIdParams) {
    return this.appService.getYaOrderHistory(params.id);
  }

  @Get('yandex/info/:id')
  @UseGuards(AuthGuard('jwt'), EmployeeJwtGuard)
  yaOrderInfo(@Param() params: OrderIdParams) {
    return this.appService.getOrderInfo(params.id);
  }

  @Post('revise')
  @UseGuards(AuthGuard('jwt'), CronReviseJwtGuard)
  reviseOrdersStatuses() {
    return this.appService.reviseOrders();
  }

  @Get('test')
  @UseGuards(AuthGuard('jwt'), EmployeeJwtGuard)
  testEndpoint() {
    return this.appService.testEndpoint();
  }
}
