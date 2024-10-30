import { PlatformStation, YaOrderInfoRes } from 'src/ya/dto/ya.dto';

export const yaOrderInfo: YaOrderInfoRes = {
  request_id: '00000000000000009a8f3ad7d35c6ff3-udp',
  request: {
    info: {
      comment: 'Test',
      operator_request_id: 'DDDDDDDDD',
    },
    source: {
      platform_station: {
        platform_id: PlatformStation.RND,
      },
    },
    destination: {
      type: 'custom_location',
      platform_station: {
        platform_id: '11111',
      },
      custom_location: {
        latitude: 59.626441312436235,
        longitude: 58.020987787843396,
        details: {
          comment: 'Test',
          room: '1',
          full_address: 'Test',
        },
      },
      interval: {
        from: 1730444400,
        to: 1730491200,
      },
      interval_utc: {
        from: '2024-11-01T07:00:00+0000',
        to: '2024-11-01T20:00:00+0000',
      },
    },
    items: [
      {
        count: 1,
        name: 'Test',
        article: 'DDDDDDDDD',
        billing_details: {
          nds: -1,
          unit_price: 0,
          assessed_unit_price: 213200,
          inn: '0000000000',
        },
        physical_dims: {
          dx: 0,
          dy: 0,
          dz: 0,
          predefined_volume: 0,
        },
        place_barcode: 'DDDDDDDDD-0',
        uin: '000000',
        marking_code: 'DDDDDDDDD',
      },
    ],
    places: [
      {
        physical_dims: {
          weight_gross: 0,
          dx: 15,
          dy: 7,
          dz: 7,
          predefined_volume: 735,
        },
        barcode: 'DDDDDDDDD-0',
        description: 'Test',
      },
    ],
    billing_info: {
      payment_method: 'already_paid',
      delivery_cost: 0,
    },
    recipient_info: {
      first_name: 'John',
      last_name: 'Doe',
      partonymic: '',
      phone: '00000000000',
      email: 'test@test.com',
    },
    available_actions: {
      update_dates_available: true,
      update_address_available: false,
      update_courier_to_pickup_available: false,
      update_pickup_to_courier_available: false,
      update_pickup_to_pickup_available: false,
      update_items: false,
      update_recipient: true,
      update_places: true,
    },
    particular_items_refuse: false,
    last_mile_policy: 'default',
  },
  state: {
    status: 'SORTING',
    description: 'Sorting',
    reason: 'test',
  },
  full_items_price: 0,
  sharing_url:
    'https://dostavka.yandex.ru/route/cfdd10a3-8622-4195-8721-215ec900daf1',
};
