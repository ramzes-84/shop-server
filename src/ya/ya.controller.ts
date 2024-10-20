import {
  Controller,
  Get,
  Post,
  // Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { YaService } from './ya.service';
// import { CreateYadDto } from './dto/create-yad.dto';
// import { UpdateYadDto } from './dto/update-yad.dto';

@Controller('ya')
export class YaController {
  constructor(private readonly yaService: YaService) {}

  @Get()
  findAll() {
    return this.yaService.findAll();
  }

  @Get('request/history/:id')
  getHistoryById(@Param('id') id: string) {
    return this.yaService.getHistoryById(id);
  }

  @Post()
  create(/*@Body() createYadDto: CreateYadDto*/) {
    return this.yaService.create(/*createYadDto*/);
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
