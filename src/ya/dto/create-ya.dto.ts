export class CreateYaOrderDto {
  shop_order_id: string;
  info: {
    operator_request_id: string;
  };
  source: {
    platform_station: {
      platform_id: PlatformStation;
    };
  };
  destination: {
    type: 'platform_station';
    platform_station: {
      platform_id: string;
    };
  };
  items: Array<{
    count: number;
    name: string;
    article: string;
    billing_details: {
      nds: -1;
      unit_price: number;
      assessed_unit_price: number;
    };
    physical_dims: {
      dx: 1;
      dy: 2;
      dz: 2;
    };
    place_barcode: string;
  }>;
  places: Array<{
    physical_dims: {
      weight_gross: 300;
      dx: 5;
      dy: 10;
      dz: 15;
    };
    barcode: string;
  }>;
  billing_info: {
    payment_method: 'already_paid';
  };
  recipient_info: {
    first_name: string;
    last_name: string;
    phone: string;
    email: string;
  };
  last_mile_policy: 'self_pickup';
  particular_items_refuse: false;
}

enum PlatformStation {
  RND = 'af1356a6-5b4e-42e2-b85d-2c67a11a1a7c',
  TUL = '8c78c9db-dd0f-45c4-851a-7df333b8c089',
  TEST = 'fbed3aa1-2cc6-4370-ab4d-59c5cc9bb92',
}

export type YaOrderCreationRes = {
  request_id: string;
};
