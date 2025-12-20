import { CreateCashInvoiceDto, CurrenciesTypes } from 'src/cash/dto/cash.dto';

export const invoiceRequest: CreateCashInvoiceDto = {
  payment_data: {
    amount: {
      currency: CurrenciesTypes.RUB,
      value: '2603.46',
    },
    capture: true,
    description: 'Оплата заказа №TESTREFERENCE',
    metadata: {
      order_id: 'TESTREFERENCE',
    },
    receipt: {
      customer: {
        full_name: 'Doe John',
        email: 'test@test.com',
      },
      items: [
        {
          description: '000001 - Основа',
          quantity: 1,
          amount: {
            currency: 'RUB',
            value: '1188.53',
          },
          vat_code: 1,
          payment_mode: 'full_payment',
          payment_subject: 'commodity',
        },
        {
          description: '000002 - Румяна',
          quantity: 1,
          amount: {
            currency: 'RUB',
            value: '510.62',
          },
          vat_code: 1,
          payment_mode: 'full_payment',
          payment_subject: 'commodity',
        },
        {
          description: '000003 - Пудра',
          quantity: 1,
          amount: {
            currency: 'RUB',
            value: '704.31',
          },
          vat_code: 1,
          payment_mode: 'full_payment',
          payment_subject: 'commodity',
        },
        {
          description: 'Доставка',
          quantity: 1,
          amount: {
            currency: 'RUB',
            value: '200.00',
          },
          vat_code: 1,
          payment_mode: 'full_payment',
          payment_subject: 'service',
        },
      ],
    },
  },
  cart: [
    {
      description: '000001 - Основа',
      quantity: 1,
      price: {
        currency: CurrenciesTypes.RUB,
        value: '1349.99',
      },
      discount_price: {
        value: '1188.53',
        currency: CurrenciesTypes.RUB,
      },
    },
    {
      description: '000002 - Румяна',
      quantity: 1,
      price: {
        currency: CurrenciesTypes.RUB,
        value: '579.99',
      },
      discount_price: {
        value: '510.62',
        currency: CurrenciesTypes.RUB,
      },
    },
    {
      description: '000003 - Пудра',
      quantity: 1,
      price: {
        currency: CurrenciesTypes.RUB,
        value: '799.99',
      },
      discount_price: {
        value: '704.31',
        currency: CurrenciesTypes.RUB,
      },
    },
    {
      description: 'Доставка',
      price: {
        value: '200.00',
        currency: CurrenciesTypes.RUB,
      },
      quantity: 1,
    },
  ],
  delivery_method_data: {
    type: 'self',
  },
  locale: 'ru_RU',
  expires_at: '2025-01-04T05:58:09.064Z',
  description: 'Заказ №TESTREFERENCE',
  metadata: {
    order_id: 'TESTREFERENCE',
  },
};
