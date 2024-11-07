import { Module } from '@nestjs/common';
import { BxbService } from './bxb.service';

@Module({
  providers: [BxbService],
  exports: [BxbService],
})
export class BxbModule {}
