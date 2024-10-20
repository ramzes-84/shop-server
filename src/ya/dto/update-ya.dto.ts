import { PartialType } from '@nestjs/mapped-types';
import { CreateYaDto } from './create-ya.dto';

export class UpdateYaDto extends PartialType(CreateYaDto) {}
