import { convertFivePostOrder } from './convert-five-post-order';
import {
  addressDetails,
  customerDetails,
  orderDetails,
  shippingDetails,
} from 'src/__test-data__/shop-data';

const sender = { email: 'shop@example.com', phone: '+7 (900) 111-22-33' };

describe('convertFivePostOrder', () => {
  it('builds a prepaid C2C order without a sender warehouse', () => {
    const request = convertFivePostOrder(
      orderDetails,
      addressDetails,
      customerDetails,
      shippingDetails.order_carriers[0],
      'receiver-location',
      sender,
    );

    expect(request).toEqual({
      senderOrderId: 'TESTREFERENCE',
      clientOrderId: 'TESTREFERENCE',
      receiverLocation: 'receiver-location',
      receiverClientName: 'Doe John',
      receiverClientPhone: '79000000000',
      receiverClientEmail: 'test@test.com',
      senderClientEmail: 'shop@example.com',
      senderClientPhone: '79001112233',
      cargo: {
        senderCargoId: 'TESTREFERENCE',
        height: 50,
        length: 150,
        width: 100,
        weight: 153000,
        price: 2729.97,
        productValues: [
          {
            name: 'Основа',
            value: 1,
            price: 1349.99,
            vat: -1,
            vendorCode: '000001',
          },
          {
            name: 'Румяна',
            value: 1,
            price: 579.99,
            vat: -1,
            vendorCode: '000002',
          },
          {
            name: 'Пудра',
            value: 1,
            price: 799.99,
            vat: -1,
            vendorCode: '000003',
          },
        ],
      },
      cost: {
        paymentType: 'PREPAYMENT',
        price: 2729.97,
      },
    });
    expect(request).not.toHaveProperty('senderLocation');
    expect(request).not.toHaveProperty('partnerOrders');
  });

  it.each([
    ['is missing', undefined],
    ['has no email', { phone: sender.phone }],
    ['has no phone', { email: sender.email }],
    ['has an invalid phone', { email: sender.email, phone: '123' }],
  ])('requires sender contacts when the sender %s', (_, value) => {
    expect(() =>
      convertFivePostOrder(
        orderDetails,
        addressDetails,
        customerDetails,
        shippingDetails.order_carriers[0],
        'receiver-location',
        value,
      ),
    ).toThrow('Не настроены контакты магазина');
  });
});
