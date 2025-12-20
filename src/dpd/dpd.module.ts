import { Module } from '@nestjs/common';
import { DpdService } from './dpd.service';

@Module({
  providers: [DpdService],
  exports: [DpdService],
})
export class DpdModule {}
