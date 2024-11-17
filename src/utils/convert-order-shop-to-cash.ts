import {
  CartItem,
  CreateCashInvoiceDto,
  CurrenciesTypes,
} from 'src/cash/dto/cash.dto';
import { OrderInfoResDto } from 'src/shop/dto/order-info.dto';
import { calcDiscount } from './convertOrder';
import { CustomerInfoResDto } from 'src/shop/dto/customer-info.dto';

export function convertOrderShopToCash(
  orderDetails: OrderInfoResDto['order'],
  customerDetails: CustomerInfoResDto['customer'],
): CreateCashInvoiceDto {
  const discount = calcDiscount(
    orderDetails.total_products,
    orderDetails.total_discounts,
  );

  const goods = orderDetails.associations.order_rows.map((row) => {
    const item: CartItem = {
      description: `${row.product_reference} - ${row.product_name}`,
      quantity: parseInt(row.product_quantity),
      price: {
        currency: CurrenciesTypes.RUB,
        value: parseFloat(row.unit_price_tax_excl).toFixed(2),
      },
    };
    if (discount) {
      item.discount_price = {
        value: (
          parseFloat(row.unit_price_tax_excl) -
          parseFloat(row.unit_price_tax_excl) * discount
        ).toFixed(2),
        currency: CurrenciesTypes.RUB,
      };
    }

    return item;
  });

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
      type: 'self',
    },
    locale: 'ru_RU',
    expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 4).toISOString(),
    description: `Заказ №${orderDetails.reference}`,
    metadata: {
      order_id: orderDetails.reference,
    },
  };
}
