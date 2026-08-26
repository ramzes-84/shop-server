import { Module } from '@nestjs/common';
import { FiveService } from './five.service';

@Module({
  providers: [FiveService],
  exports: [FiveService],
})
export class FiveModule {}
