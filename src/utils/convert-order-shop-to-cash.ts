import {
  CartItem,
  CreateCashInvoiceDto,
  CurrenciesTypes,
} from 'src/cash/dto/cash.dto';
import { ShopOrderInfo } from 'src/shop/dto/order-info.dto';
import { calcDiscount } from './convertOrder';
import { CustomerInfo } from 'src/shop/dto/customer-info.dto';
import { AddressInfo } from 'src/shop/dto/address-info.dto';

function normalizePhoneToE164(phone?: string): string | undefined {
  if (!phone) return undefined;
  const digits = phone.replace(/\D/g, '');

  // Russian-specific common cases:
  // - leading 8 (local) -> replace with 7
  // - 10-digit mobile (e.g. 9000000000) -> prefix with 7
  if (digits.length === 11 && digits.startsWith('8')) {
    return '7' + digits.slice(1);
  }
  if (digits.length === 11 && digits.startsWith('7')) {
    return digits;
  }
  if (digits.length === 10) {
    return '7' + digits;
  }

  // If it already looks like an international number (11-15 digits),
  // return as-is (without a plus). Otherwise return undefined.
  if (digits.length >= 11 && digits.length <= 15) return digits;
  return undefined;
}

export function convertOrderShopToCash(
  orderDetails: ShopOrderInfo,
  customerDetails: CustomerInfo,
  addressDetails: AddressInfo,
  sms: boolean = false,
): CreateCashInvoiceDto {
  const discount =
    calcDiscount(orderDetails.total_products, orderDetails.total_discounts) ||
    0;

  const goods = orderDetails.associations.order_rows.reduce<CartItem[]>(
    (items, row) => {
      const basePrice = parseFloat(row.unit_price_tax_excl);
      const quantity = parseInt(row.product_quantity);

      if (basePrice <= 0) {
        // Cash API rejects positions with non-positive prices (e.g. gift items).
        return items;
      }

      const item: CartItem = {
        description: `${row.product_reference} - ${row.product_name}`,
        quantity,
        price: {
          currency: CurrenciesTypes.RUB,
          value: basePrice.toFixed(2),
        },
      };

      if (discount > 0) {
        const discountedValue = basePrice - basePrice * discount;
        if (discountedValue > 0) {
          item.discount_price = {
            value: discountedValue.toFixed(2),
            currency: CurrenciesTypes.RUB,
          };
        }
      }

      items.push(item);
      return items;
    },
    [],
  );

  goods.push({
    description: 'Доставка',
    price: {
      value: parseFloat(orderDetails.total_shipping).toFixed(2),
      currency: CurrenciesTypes.RUB,
    },
    quantity: 1,
  });

  return {
    payment_data: {
      amount: {
        currency: CurrenciesTypes.RUB,
        value: goods
          .reduce((sum, curr) => {
            const price = curr.discount_price?.value ?? curr.price.value;
            return sum + parseFloat(price) * curr.quantity;
          }, 0)
          .toFixed(2),
      },
      capture: true,
      description: `Оплата заказа №${orderDetails.reference}`,
      metadata: {
        order_id: orderDetails.reference,
      },
      receipt: {
        customer: {
          full_name: `${customerDetails.firstname} ${customerDetails.lastname}`,
          email: customerDetails.email,
        },
        items: goods.map((item) => ({
          description: item.description.slice(0, 128),
          quantity: item.quantity,
          amount: {
            currency: CurrenciesTypes.RUB,
            value: item.discount_price?.value ?? item.price.value,
          },
          vat_code: 1,
          payment_mode: 'full_payment',
          payment_subject:
            item.description === 'Доставка' ? 'service' : 'commodity',
        })),
      },
    },
    cart: goods,
    delivery_method_data: {
      type: sms ? 'sms' : 'self',
      phone: normalizePhoneToE164(addressDetails.phone_mobile) || '79081907675',
    },
    locale: 'ru_RU',
    expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 4).toISOString(),
    description: `Заказ №${orderDetails.reference}`,
    metadata: {
      order_id: orderDetails.reference,
    },
  };
}
