import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { YaService } from './ya.service';
import { CreateYaOrderDto } from './dto/ya.dto';
import { OrderIdParams } from 'src/validation/yandex';

@Controller('ya')
export class YaController {
  constructor(private readonly yaService: YaService) {}

  @Get('history/:id')
  getHistoryById(@Param() params: OrderIdParams) {
    return this.yaService.getHistoryById(params.id);
  }

  @Post('create')
  createYaOrder(@Body() createYaOrderDto: CreateYaOrderDto) {
    return this.yaService.createYaOrder(createYaOrderDto);
  }
}
