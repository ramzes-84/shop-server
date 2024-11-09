import { CashInvoiceInfoDto } from 'src/cash/dto/cash.dto';
import { CustomerInfoResDto } from 'src/shop/dto/customer-info.dto';
import { ShopOrderInfo } from 'src/shop/dto/order-info.dto';

export function generateCashInvoiceMessage(
  orderDetails: ShopOrderInfo,
  customerDetails: CustomerInfoResDto['customer'],
  cashInvoiceInfo: CashInvoiceInfoDto,
): string {
  return `Здравствуйте, ${customerDetails.firstname}!
Счёт для заказа №${orderDetails.reference} выставлен. Для оплаты перейдите по ссылке: ${cashInvoiceInfo.delivery_method.url}`;
}
