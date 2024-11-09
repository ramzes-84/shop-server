export class CreateCashInvoiceDto {
  payment_data: {
    amount: {
      value: string;
      currency: CurrenciesTypes.RUB;
    };
    capture: true;
    description: string;
    metadata: {
      order_id: string;
    };
  };
  cart: CartItem[];
  delivery_method_data: {
    type: 'self';
  };
  locale: 'ru_RU';
  expires_at: string;
  description: string;
  metadata: {
    order_id: string;
  };
}

export class CartItem {
  description: string;
  price: {
    value: string;
    currency: CurrenciesTypes.RUB;
  };
  discount_price?: {
    value: string;
    currency: CurrenciesTypes.RUB;
  };
  quantity: number;
}

export class CashInvoiceInfoDto extends CreateCashInvoiceDto {
  id: string;
  status: 'pending';
  delivery_method: {
    type: 'self';
    url: string;
  };
  created_at: string;
}

export class ErrorCashResDTO {
  type: string;
  id: string;
  code: string;
  description: string;
  parameter: keyof CreateCashInvoiceDto;
}

export enum CurrenciesTypes {
  RUB = 'RUB',
}
