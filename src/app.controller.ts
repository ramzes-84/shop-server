import { Controller, Get, Param, Post, Query } from '@nestjs/common';
import { AppService } from './app.service';
import { CreateOrderQueries, TrackIdParams } from './validation/yandex';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Post('yandex/create')
  createYaOrder(@Query() query: CreateOrderQueries) {
    return this.appService.createYaOrder(query);
  }

  @Get('yandex/tracking/:id')
  trackYaOrder(@Param() params: TrackIdParams) {
    return this.appService.trackYaOrder(params.id);
  }
}
