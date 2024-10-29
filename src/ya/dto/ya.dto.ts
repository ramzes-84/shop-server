export class CreateYaOrderDto {
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
      weight_gross: number;
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

export enum PlatformStation {
  RND = 'af1356a6-5b4e-42e2-b85d-2c67a11a1a7c',
  TUL = '8c78c9db-dd0f-45c4-851a-7df333b8c089',
  TEST = 'fbed3aa1-2cc6-4370-ab4d-59c5cc9bb924',
}

export type YaOrderCreationRes = {
  request_id: string;
};

export type YaOrderHistoryRes = {
  state_history: {
    status: string;
    description: string;
    timestamp: number;
    timestamp_utc: string;
  }[];
};

export type YaOrderInfoRes = {
  request_id: string;
  request: {
    info: {
      operator_request_id: string;
      comment: string;
    };
    source: {
      platform_station: {
        platform_id: string;
      };
      interval: {
        from: number;
        to: number;
      };
      interval_utc: {
        from: string;
        to: string;
      };
    };
    destination: {
      type: string;
      platform_station: {
        platform_id: string;
      };
      custom_location: {
        latitude: number;
        longitude: number;
        details: {
          comment: string;
          full_address: string;
          room: string;
        };
      };
      interval: {
        from: number;
        to: number;
      };
      interval_utc: {
        from: string;
        to: string;
      };
    };
    items: [
      {
        count: number;
        name: string;
        article: string;
        marking_code: string;
        uin: string;
        billing_details: {
          inn: string;
          nds: number;
          unit_price: number;
          assessed_unit_price: number;
        };
        physical_dims: {
          dx: number;
          dy: number;
          dz: number;
          predefined_volume: number;
        };
        place_barcode: string;
      },
    ];
    places: [
      {
        physical_dims: {
          weight_gross: number;
          dx: number;
          dy: number;
          dz: number;
          predefined_volume: number;
        };
        barcode: string;
        description: string;
      },
    ];
    billing_info: {
      payment_method: string;
      delivery_cost: number;
    };
    recipient_info: {
      first_name: string;
      last_name: string;
      partonymic: string;
      phone: string;
      email: string;
    };
    last_mile_policy: string;
    particular_items_refuse: boolean;
    available_actions: {
      update_dates_available: boolean;
      update_address_available: boolean;
      update_courier_to_pickup_available: boolean;
      update_pickup_to_courier_available: boolean;
      update_pickup_to_pickup_available: boolean;
      update_items: boolean;
      update_recipient: boolean;
      update_places: boolean;
    };
  };
  state: {
    status: string;
    description: string;
    reason: string;
  };
  full_items_price: number;
  sharing_url: string;
};
