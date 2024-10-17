import { PartialType } from '@nestjs/mapped-types';
import { CreateYadDto } from './create-yad.dto';

export class UpdateYadDto extends PartialType(CreateYadDto) {}
