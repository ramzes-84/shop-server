import { IsDefined, IsString, IsUUID, Length, Matches } from 'class-validator';

export class OrderIdParams {
  @IsDefined({ message: 'id is required' })
  @IsString({ message: 'id must be a string' })
  @Length(36, 36, { message: 'id is incorrect' })
  @Matches(/-udp$/, { message: 'id has incorrect pattern' })
  id: string;
}

export class CreateOrderQueries {
  @IsDefined({ message: 'order is required' })
  @IsString({ message: 'order must be a string' })
  @Length(5, 5, { message: 'order is incorrect' })
  order: string;

  @IsDefined({ message: 'destination is required' })
  @IsString({ message: 'destination must be a string' })
  @IsUUID('4', { message: 'destination is incorrect' })
  destination: string;
}
