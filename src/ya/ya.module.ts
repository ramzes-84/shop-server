import { Module } from '@nestjs/common';
import { YaService } from './ya.service';
// import { YaController } from './ya.controller';

@Module({
  // controllers: [YaController],
  providers: [YaService],
  exports: [YaService],
})
export class YaModule {}
