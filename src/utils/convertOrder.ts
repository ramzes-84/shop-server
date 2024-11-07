import { AddressInfoResDto } from 'src/shop/dto/address-info.dto';
import { CustomerInfoResDto } from 'src/shop/dto/customer-info.dto';
import { OrderCarrierInfo } from 'src/shop/dto/order-carrier-info.dto';
import { OrderInfoResDto } from 'src/shop/dto/order-info.dto';
import { StatusesInfoResDto } from 'src/shop/dto/statuses-info.dto';
import { CreateYaOrderDto, PlatformStation } from 'src/ya/dto/ya.dto';

export function convertOrder(
  orderDetails: OrderInfoResDto['order'],
  addressDetails: AddressInfoResDto['address'],
  customerDetails: CustomerInfoResDto['customer'],
  shippingDetails: OrderCarrierInfo,
  destination: string,
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
        platform_id:
          orderDetails.current_state === '12'
            ? PlatformStation.RND
            : PlatformStation.TUL,
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

export function getSourcePlatform(
  statuses: StatusesInfoResDto['order_histories'],
) {
  const lastStatus = statuses[0].id_order_state;

  if (lastStatus === '12') {
    return PlatformStation.RND;
  } else if (lastStatus === '13') {
    return PlatformStation.TUL;
  } else {
    throw new Error(`Unknown last order's status: ${lastStatus}`);
  }
}
