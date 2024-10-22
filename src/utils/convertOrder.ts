import { AddressInfoResDto } from 'src/shop/dto/address-info.dto';
import { CustomerInfoResDto } from 'src/shop/dto/customer-info.dto';
import { OrderInfoResDto } from 'src/shop/dto/order-info.dto';
import { StatusesInfoResDto } from 'src/shop/dto/statuses-info.dto';
import { CreateYaOrderDto, PlatformStation } from 'src/ya/dto/create-ya.dto';

export function convertOrder(
  orderDetails: OrderInfoResDto['order'],
  addressDetails: AddressInfoResDto['address'],
  customerDetails: CustomerInfoResDto['customer'],
  statuses: StatusesInfoResDto['order_histories'],
): CreateYaOrderDto {
  const isDevelopment = process.env.NODE_ENV === 'development';

  const goods: CreateYaOrderDto['items'] =
    orderDetails.associations.order_rows.map((row) => ({
      article: row.product_reference,
      billing_details: {
        assessed_unit_price: Math.round(
          parseFloat(row.unit_price_tax_incl) * 100,
        ),
        nds: -1,
        unit_price: Math.round(parseFloat(row.unit_price_tax_excl) * 100),
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

  return {
    info: {
      operator_request_id: orderDetails.reference,
    },
    source: {
      platform_station: {
        platform_id: isDevelopment
          ? PlatformStation.TEST
          : getSourcePlatform(statuses),
      },
    },
    destination: {
      type: 'platform_station',
      platform_station: {
        platform_id: PlatformStation.RND,
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
          weight_gross: 300,
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

function getSourcePlatform(statuses: StatusesInfoResDto['order_histories']) {
  const lastStatus = statuses[0].id_order_state;

  if (lastStatus === '12') {
    return PlatformStation.RND;
  } else if (lastStatus === '13') {
    return PlatformStation.TUL;
  } else {
    throw new Error(`Unknown last order's status: ${lastStatus}`);
  }
}
