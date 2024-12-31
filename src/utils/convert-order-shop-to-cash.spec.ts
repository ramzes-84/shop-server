import { convertOrderShopToCash } from './convert-order-shop-to-cash';
import { OrderInfoResDto } from 'src/shop/dto/order-info.dto';
import { CustomerInfoResDto } from 'src/shop/dto/customer-info.dto';
import { CreateCashInvoiceDto } from 'src/cash/dto/cash.dto';
import { customerDetails, orderDetails } from 'src/__test-data__/shop-data';
import { invoiceRequest } from 'src/__test-data__/kassa-data';

describe('convertOrderShopToCash', () => {
  it('should convert order and customer details to CreateCashInvoiceDto', () => {
    const testOrderDetails: OrderInfoResDto['order'] = { ...orderDetails };
    const testCustomerDetails: CustomerInfoResDto['customer'] = {
      ...customerDetails,
    };
    const expected: CreateCashInvoiceDto = {
      ...invoiceRequest,
    };

    const result = convertOrderShopToCash(
      testOrderDetails,
      testCustomerDetails,
    );
    expected.expires_at = result.expires_at;

    expect(result).toEqual(expected);
  });
});
