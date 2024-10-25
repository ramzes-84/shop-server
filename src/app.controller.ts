import { Controller, Get, Param, Post, Query } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Post('yandex/create')
  createYaOrder(@Query() query) {
    return this.appService.createYaOrder(query);
  }

  @Get('yandex/tracking/:id')
  trackYaOrder(@Param('id') id: string) {
    return this.appService.trackYaOrder(id);
  }
}
