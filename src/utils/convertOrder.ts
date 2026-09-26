import { CreatingOrderRequest, DpdUnitLoad } from 'src/dpd/dto/dpd.dto';
import { AddressInfoResDto } from 'src/shop/dto/address-info.dto';
import { CustomerInfoResDto } from 'src/shop/dto/customer-info.dto';
import { OrderCarrierInfo } from 'src/shop/dto/order-carrier-info.dto';
import { OrderInfoResDto } from 'src/shop/dto/order-info.dto';
import { CreateYaOrderDto, YaCostCalculationReqDto } from 'src/ya/dto/ya.dto';
import { normalizePhoneToE164 } from './normalize-phone';

export function convertOrder(
  orderDetails: OrderInfoResDto['order'],
  addressDetails: AddressInfoResDto['address'],
  customerDetails: CustomerInfoResDto['customer'],
  shippingDetails: OrderCarrierInfo,
  destination: string,
  sourcePlatformId: string,
): CreateYaOrderDto {
  const discount = calcDiscount(
    orderDetails.total_products,
    orderDetails.total_discounts,
  );

  const goods: CreateYaOrderDto['items'] =
    orderDetails.associations.order_rows.map((row) => ({
      article: row.product_reference,
      billing_details: {
        assessed_unit_price: Math.round(
          parseFloat(row.unit_price_tax_incl) * 100,
        ),
        nds: -1,
        unit_price: Math.round(
          (parseFloat(row.unit_price_tax_excl) -
            parseFloat(row.unit_price_tax_excl) * discount) *
            100,
        ),
      },
      count: parseInt(row.product_quantity),
      name: row.product_name,
      physical_dims: {
        dx: 1,
        dy: 2,
        dz: 2,
      },
      place_barcode: orderDetails.reference,
    }));

  goods.push({
    article: 'ship',
    count: 1,
    name: 'Доставка',
    physical_dims: {
      dx: 1,
      dy: 2,
      dz: 2,
    },
    billing_details: {
      nds: -1,
      assessed_unit_price: parseFloat(orderDetails.total_shipping) * 100,
      unit_price: parseFloat(orderDetails.total_shipping) * 100,
    },
    place_barcode: orderDetails.reference,
  });

  return {
    info: {
      operator_request_id: orderDetails.reference,
    },
    source: {
      platform_station: {
        platform_id: sourcePlatformId,
      },
    },
    destination: {
      type: 'platform_station',
      platform_station: {
        platform_id: destination,
      },
    },
    items: goods,
    places: [
      {
        barcode: orderDetails.reference,
        physical_dims: {
          dx: 5,
          dy: 10,
          dz: 15,
          weight_gross: parseFloat(shippingDetails.weight) * 1000 + 80,
        },
      },
    ],
    billing_info: {
      payment_method: 'already_paid',
    },
    recipient_info: {
      first_name: addressDetails.firstname,
      last_name: addressDetails.lastname,
      phone: addressDetails.phone_mobile,
      email: customerDetails.email,
    },
    last_mile_policy: 'self_pickup',
    particular_items_refuse: false,
  };
}

export function calcDiscount(total: string, discount: string) {
  return parseFloat((parseFloat(discount) / parseFloat(total)).toFixed(5));
}

export function convertYaOrderToCostReq(
  order: CreateYaOrderDto,
): YaCostCalculationReqDto {
  return {
    client_price: 0,
    destination: {
      platform_station_id: order.destination.platform_station.platform_id,
    },
    source: { platform_station_id: order.source.platform_station.platform_id },
    payment_method: order.billing_info.payment_method,
    tariff: order.last_mile_policy,
    total_weight: order.places[0].physical_dims.weight_gross,
    total_assessed_price: order.items.reduce((acc, item) => {
      return acc + item.billing_details.assessed_unit_price;
    }, 0),
    places: order.places,
  };
}

function roundMoney(value: string, field: string): number {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Некорректная сумма ${field} в заказе`);
  }

  return Math.round(parsed * 100) / 100;
}

export function convertOrderToDpd(
  orderDetails: OrderInfoResDto['order'],
  addressDetails: AddressInfoResDto['address'],
  customerDetails: CustomerInfoResDto['customer'],
  shippingDetails: OrderCarrierInfo,
  destination: string,
  sourceTerminalId: string,
): Pick<CreatingOrderRequest, 'header' | 'order'> {
  const receiverName = `${addressDetails.firstname} ${addressDetails.lastname}`;
  const receiverPhone =
    normalizePhoneToE164(addressDetails.phone_mobile) ||
    normalizePhoneToE164(addressDetails.phone);

  if (!receiverPhone) {
    throw new Error('В заказе отсутствует телефон получателя');
  }

  const weightKg = Number.parseFloat(shippingDetails.weight);

  if (!Number.isFinite(weightKg) || weightKg <= 0) {
    throw new Error('Некорректный вес отправления в заказе');
  }

  const unitLoad: DpdUnitLoad[] = orderDetails.associations.order_rows.map(
    (row) => ({
      descript: row.product_name,
      count: Number.parseInt(row.product_quantity, 10),
      declared_value: roundMoney(
        row.unit_price_tax_incl,
        `товара ${row.product_name}`,
      ).toString(),
    }),
  );

  if (
    unitLoad.some((item) => !Number.isInteger(item.count) || item.count <= 0)
  ) {
    throw new Error('Некорректное количество товара в заказе');
  }

  const cargoValue =
    Math.round(
      unitLoad.reduce(
        (total, item) => total + Number(item.declared_value) * item.count,
        0,
      ) * 100,
    ) / 100;

  // DPD — единственный подключённый перевозчик, поддерживающий наложенный платёж (НПП):
  // если клиент оплатил заказ не полностью, разницу должен собрать курьер при вручении.
  const outstandingAmount =
    Math.round(
      (roundMoney(orderDetails.total_paid, 'заказа') -
        roundMoney(orderDetails.total_paid_real, 'заказа')) *
        100,
    ) / 100;
  const codAmount = outstandingAmount > 0.01 ? outstandingAmount : 0;

  return {
    header: {
      datePickup: new Date().toISOString().split('T')[0],
      senderAddress: {
        name: process.env.SHOP_NAME!,
        terminalCode: sourceTerminalId,
        contactFio: process.env.SHOP_OWNER!,
        contactPhone: process.env.SHOP_PHONE!,
        contactEmail: process.env.MAIL_ADMIN,
      },
      pickupTimePeriod: '9-18',
    },
    order: [
      {
        orderNumberInternal: orderDetails.reference,
        serviceCode: 'PCL',
        serviceVariant: 'ТТ',
        cargoNumPack: 1,
        cargoWeight: Math.round((weightKg + 0.08) * 1000) / 1000,
        cargoVolume: 0.01,
        cargoRegistered: false,
        cargoValue,
        cargoCategory: process.env.DPD_CARGO_CATEGORY || 'Косметика',
        receiverAddress: {
          name: receiverName,
          terminalCode: destination,
          contactFio: receiverName,
          contactPhone: receiverPhone,
          contactEmail: customerDetails.email,
        },
        ...(codAmount > 0
          ? {
              extraService: [
                {
                  esCode: 'НПП',
                  param: [{ name: 'sum_npp', value: codAmount.toFixed(2) }],
                },
              ],
            }
          : {}),
        unitLoad,
      },
    ],
  };
}
