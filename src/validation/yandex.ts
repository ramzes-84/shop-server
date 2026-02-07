import {
  IsDefined,
  IsString,
  Length,
  Matches,
  IsOptional,
  IsBoolean,
} from 'class-validator';

export class OrderIdParams {
  @IsDefined({ message: 'id is required' })
  @IsString({ message: 'id must be a string' })
  @Length(36, 36, { message: 'id is incorrect' })
  @Matches(/-udp$/, { message: 'id has incorrect pattern' })
  id: string;
}

export class CreateOrderQueries {
  @IsDefined({ message: 'orderId is required' })
  @IsString({ message: 'orderId must be a string' })
  @Length(5, 5, { message: 'orderId is incorrect' })
  orderId: string;
}

export class CreateCashRequest {
  @IsDefined({ message: 'orderId is required' })
  @IsString({ message: 'orderId must be a string' })
  @Length(5, 5, { message: 'orderId is incorrect' })
  orderId: string;

  @IsOptional()
  @IsBoolean({ message: 'sms must be boolean' })
  sms?: boolean;
}
