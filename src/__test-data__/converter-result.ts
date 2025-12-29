import { CreateYaOrderDto, PlatformStation } from 'src/ya/dto/ya.dto';

export const orderConverterResult: CreateYaOrderDto = {
  info: {
    operator_request_id: 'TESTREFERENCE',
  },
  source: {
    platform_station: {
      platform_id: PlatformStation.TUL,
    },
  },
  destination: {
    type: 'platform_station',
    platform_station: {
      platform_id: 'destination123',
    },
  },
  items: [
    {
      article: '000001',
      billing_details: {
        assessed_unit_price: 134999,
        nds: -1,
        unit_price: 118853,
      },
      count: 1,
      name: 'Основа',
      physical_dims: {
        dx: 1,
        dy: 2,
        dz: 2,
      },
      place_barcode: 'TESTREFERENCE',
    },
    {
      article: '000002',
      billing_details: {
        assessed_unit_price: 57999,
        nds: -1,
        unit_price: 51062,
      },
      count: 1,
      name: 'Румяна',
      physical_dims: {
        dx: 1,
        dy: 2,
        dz: 2,
      },
      place_barcode: 'TESTREFERENCE',
    },
    {
      article: '000003',
      billing_details: {
        assessed_unit_price: 79999,
        nds: -1,
        unit_price: 70431,
      },
      count: 1,
      name: 'Пудра',
      physical_dims: {
        dx: 1,
        dy: 2,
        dz: 2,
      },
      place_barcode: 'TESTREFERENCE',
    },
    {
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
        assessed_unit_price: 20000,
        unit_price: 20000,
      },
      place_barcode: 'TESTREFERENCE',
    },
  ],
  places: [
    {
      barcode: 'TESTREFERENCE',
      physical_dims: {
        dx: 5,
        dy: 10,
        dz: 15,
        weight_gross: 153,
      },
    },
  ],
  billing_info: {
    payment_method: 'already_paid',
  },
  recipient_info: {
    first_name: 'Doe',
    last_name: 'John',
    phone: '00000000000',
    email: 'test@test.com',
  },
  last_mile_policy: 'self_pickup',
  particular_items_refuse: false,
};
