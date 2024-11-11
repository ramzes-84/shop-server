import { CashInvoiceInfoDto } from 'src/cash/dto/cash.dto';
import { AddressInfoResDto } from 'src/shop/dto/address-info.dto';
import { CustomerInfoResDto } from 'src/shop/dto/customer-info.dto';
import { ShopOrderInfo } from 'src/shop/dto/order-info.dto';

export function generateCashInvoiceMessage(
  orderDetails: ShopOrderInfo,
  customerDetails: CustomerInfoResDto['customer'],
  cashInvoiceInfo: CashInvoiceInfoDto,
  addressDetails: AddressInfoResDto['address'],
): string {
  return `
Прошу отправить SMS о выставлении счёта ${normalizePhoneNumber(addressDetails.phone_mobile)}
\`\`\`
Здравствуйте, ${customerDetails.firstname}!
Счёт для заказа №${orderDetails.reference} выставлен. Для оплаты перейдите по ссылке: ${cashInvoiceInfo.delivery_method.url}
\`\`\`
`;
}

function normalizePhoneNumber(phone: string): string {
  const cleanedPhone = phone.replace(/\D/g, '');
  return '8' + cleanedPhone.slice(-10);
}
