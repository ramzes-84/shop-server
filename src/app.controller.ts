import { Controller, Get, Param, Post } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Post('yandex/create/:id')
  createYaOrder(@Param('id') id: string) {
    return this.appService.createYaOrder(+id);
  }
}
