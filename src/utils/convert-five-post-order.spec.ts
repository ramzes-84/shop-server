import { convertFivePostOrder } from './convert-five-post-order';
import {
  addressDetails,
  customerDetails,
  orderDetails,
  shippingDetails,
} from 'src/__test-data__/shop-data';

describe('convertFivePostOrder', () => {
  it('builds a prepaid single-cargo order in the documented v3 format', () => {
    expect(
      convertFivePostOrder(
        orderDetails,
        addressDetails,
        customerDetails,
        shippingDetails.order_carriers[0],
        'receiver-location',
        'sender-location',
      ),
    ).toEqual({
      partnerOrders: [
        {
          senderOrderId: 'TESTREFERENCE',
          clientOrderId: 'TESTREFERENCE',
          clientName: 'Doe John',
          clientPhone: '79000000000',
          clientEmail: 'test@test.com',
          senderLocation: 'sender-location',
          receiverLocation: 'receiver-location',
          undeliverableOption: 'RETURN',
          cost: {
            paymentValue: 0,
            paymentCurrency: 'RUB',
            paymentType: 'PREPAYMENT',
            price: 2729.97,
            priceCurrency: 'RUB',
          },
          cargoes: [
            {
              senderCargoId: 'TESTREFERENCE',
              height: 50,
              length: 150,
              width: 100,
              weight: 153000,
              price: 2729.97,
              currency: 'RUB',
              vat: -1,
              productValues: [
                {
                  name: 'Основа',
                  value: 1,
                  price: 1349.99,
                  currency: 'RUB',
                  vat: -1,
                  vendorCode: '000001',
                },
                {
                  name: 'Румяна',
                  value: 1,
                  price: 579.99,
                  currency: 'RUB',
                  vat: -1,
                  vendorCode: '000002',
                },
                {
                  name: 'Пудра',
                  value: 1,
                  price: 799.99,
                  currency: 'RUB',
                  vat: -1,
                  vendorCode: '000003',
                },
              ],
            },
          ],
        },
      ],
    });
  });

  it('requires the configured sender location', () => {
    expect(() =>
      convertFivePostOrder(
        orderDetails,
        addressDetails,
        customerDetails,
        shippingDetails.order_carriers[0],
        'receiver-location',
        '',
      ),
    ).toThrow('Не настроен ID склада отправителя 5Post');
  });
});
