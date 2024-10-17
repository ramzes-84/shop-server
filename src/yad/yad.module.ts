import { Module } from '@nestjs/common';
import { YadService } from './yad.service';
import { YadController } from './yad.controller';

@Module({
  controllers: [YadController],
  providers: [YadService],
})
export class YadModule {}
