import { Controller } from '@nestjs/common';
import { FiveService } from './five.service';

@Controller('five')
export class FiveController {
  constructor(private readonly fiveService: FiveService) {}
}
