import { CashInvoiceInfoDto } from 'src/cash/dto/cash.dto';
import { AddressInfoResDto } from 'src/shop/dto/address-info.dto';
import { CustomerInfoResDto } from 'src/shop/dto/customer-info.dto';
import { ShopOrderInfo } from 'src/shop/dto/order-info.dto';
import { generateCashInvoiceMessage } from './messages';

describe('generateCashInvoiceMessage', () => {
  const orderDetails = { reference: 'REF-42' } as unknown as ShopOrderInfo;
  const customerDetails = {
    firstname: 'Olga',
  } as CustomerInfoResDto['customer'];
  const cashInvoiceInfo = {
    delivery_method: { type: 'sms', url: 'https://pay.example/REF-42' },
  } as CashInvoiceInfoDto;
  const addressDetails = {
    phone_mobile: '+7 (999) 123-45-67',
  } as AddressInfoResDto['address'];

  it('formats sms request with normalized phone and order context', () => {
    const message = generateCashInvoiceMessage(
      orderDetails,
      customerDetails,
      cashInvoiceInfo,
      addressDetails,
    );

    expect(message).toContain(
      'Прошу отправить SMS о выставлении счёта 89991234567',
    );
    expect(message).toContain('Здравствуйте, Olga!');
    expect(message).toContain('Счёт для заказа №REF-42 выставлен');
    expect(message).toContain('https://pay.example/REF-42');
    expect(message).toMatch(/```[\s\S]*```/);
  });

  it('falls back to last 10 digits for shorter phones', () => {
    const shortPhoneAddress = {
      phone_mobile: '1234567890',
    } as AddressInfoResDto['address'];

    const message = generateCashInvoiceMessage(
      orderDetails,
      customerDetails,
      cashInvoiceInfo,
      shortPhoneAddress,
    );

    expect(message).toContain(
      'Прошу отправить SMS о выставлении счёта 81234567890',
    );
  });
});
