import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { YaService } from './ya.service';
import { CreateYaOrderDto } from './dto/create-ya.dto';

@Controller('ya')
export class YaController {
  constructor(private readonly yaService: YaService) {}

  @Get('history/:id')
  getHistoryById(@Param('id') id: string) {
    return this.yaService.getHistoryById(id);
  }

  @Post('create')
  createYaOrder(@Body() createYaOrderDto: CreateYaOrderDto) {
    return this.yaService.createYaOrder(createYaOrderDto);
  }

  @Patch(':id')
  update(@Param('id') id: string /*@Body() updateYadDto: UpdateYadDto*/) {
    return this.yaService.update(+id /*updateYadDto*/);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.yaService.remove(+id);
  }
}
