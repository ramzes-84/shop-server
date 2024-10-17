import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { YadService } from './yad.service';
import { CreateYadDto } from './dto/create-yad.dto';
import { UpdateYadDto } from './dto/update-yad.dto';

@Controller('yad')
export class YadController {
  constructor(private readonly yadService: YadService) {}

  @Get()
  findAll() {
    return this.yadService.findAll();
  }

  @Get('request/history/:id')
  getHistoryById(@Param('id') id: string) {
    return this.yadService.getHistoryById(id);
  }

  @Post()
  create(@Body() createYadDto: CreateYadDto) {
    return this.yadService.create(/*createYadDto*/);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateYadDto: UpdateYadDto) {
    return this.yadService.update(+id /*updateYadDto*/);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.yadService.remove(+id);
  }
}
