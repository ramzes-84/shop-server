import { CreateFivePostOrdersRequest } from 'src/five/dto/create-order.dto';
import { AddressInfoResDto } from 'src/shop/dto/address-info.dto';
import { CustomerInfoResDto } from 'src/shop/dto/customer-info.dto';
import { OrderCarrierInfo } from 'src/shop/dto/order-carrier-info.dto';
import { OrderInfoResDto } from 'src/shop/dto/order-info.dto';
import { normalizePhoneToE164 } from './normalize-phone';

const CARGO_LENGTH_MM = 150;
const CARGO_WIDTH_MM = 100;
const CARGO_HEIGHT_MM = 50;
const PACKAGE_WEIGHT_MG = 80_000;

function money(value: string, field: string): number {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Некорректная сумма ${field} в заказе`);
  }

  return Math.round(parsed * 100) / 100;
}

export function convertFivePostOrder(
  orderDetails: OrderInfoResDto['order'],
  addressDetails: AddressInfoResDto['address'],
  customerDetails: CustomerInfoResDto['customer'],
  shippingDetails: OrderCarrierInfo,
  receiverLocation: string,
  senderLocation: string,
): CreateFivePostOrdersRequest {
  if (!senderLocation) {
    throw new Error('Не настроен ID склада отправителя 5Post');
  }

  const productValues = orderDetails.associations.order_rows.map((row) => ({
    name: row.product_name,
    value: Number.parseInt(row.product_quantity, 10),
    price: money(row.unit_price_tax_incl, `товара ${row.product_name}`),
    currency: 'RUB' as const,
    vat: -1 as const,
    ...(row.product_reference ? { vendorCode: row.product_reference } : {}),
  }));

  if (
    productValues.some(
      (product) => !Number.isInteger(product.value) || product.value <= 0,
    )
  ) {
    throw new Error('Некорректное количество товара в заказе');
  }

  const cargoPrice =
    Math.round(
      productValues.reduce(
        (total, product) => total + product.price * product.value,
        0,
      ) * 100,
    ) / 100;
  const weightKg = Number.parseFloat(shippingDetails.weight);

  if (!Number.isFinite(weightKg) || weightKg <= 0) {
    throw new Error('Некорректный вес отправления в заказе');
  }

  const clientName = [addressDetails.firstname, addressDetails.lastname]
    .filter(Boolean)
    .join(' ');
  const clientPhone =
    normalizePhoneToE164(addressDetails.phone_mobile) ||
    normalizePhoneToE164(addressDetails.phone);

  if (!clientName || !clientPhone) {
    throw new Error('В заказе отсутствуют имя или телефон получателя');
  }

  return {
    partnerOrders: [
      {
        senderOrderId: orderDetails.reference,
        clientOrderId: orderDetails.reference,
        clientName,
        clientPhone,
        ...(customerDetails.email
          ? { clientEmail: customerDetails.email }
          : {}),
        senderLocation,
        receiverLocation,
        undeliverableOption: 'RETURN',
        cost: {
          paymentValue: 0,
          paymentCurrency: 'RUB',
          paymentType: 'PREPAYMENT',
          price: cargoPrice,
          priceCurrency: 'RUB',
        },
        cargoes: [
          {
            senderCargoId: orderDetails.reference,
            height: CARGO_HEIGHT_MM,
            length: CARGO_LENGTH_MM,
            width: CARGO_WIDTH_MM,
            weight: Math.round(weightKg * 1_000_000) + PACKAGE_WEIGHT_MG,
            price: cargoPrice,
            currency: 'RUB',
            vat: -1,
            productValues,
          },
        ],
      },
    ],
  };
}
