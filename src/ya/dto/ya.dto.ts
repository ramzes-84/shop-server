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
  places: Place[];
  billing_info: {
    payment_method: PaymentMethod;
  };
  recipient_info: {
    first_name: string;
    last_name: string;
    phone: string;
    email: string;
  };
  last_mile_policy: DeliveryType;
  particular_items_refuse: false;
}

type PaymentMethod = 'already_paid';
type DeliveryType = 'self_pickup';
type PhysicalDims = {
  weight_gross: number;
  dx: 5;
  dy: 10;
  dz: 15;
};
type Place = {
  physical_dims: PhysicalDims;
  barcode: string;
};

export enum PlatformStation {
  // RND = 'c6e86b41-a146-47aa-a619-857832465049', //Gorsov
  RND = '019a8d3ed1b372faaedb6e6075e7fbe5', //Suzd
  // RND = '3a9bea08-e463-49fb-93af-fad094ff3db9', //Selmash
  TUL = '019db9cbdf6c7471aa5a0a2f4df8b261', //Lenina 122
  // TUL = 'cff4e1c7-3d7c-4b8d-877f-26e96da0d466',
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
      interval?: {
        from: number;
        to: number;
      };
      interval_utc?: {
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
    status: YaParcelStatus;
    description: string;
    reason: string;
  };
  full_items_price: number;
  sharing_url: string;
};

export type YaRecentParcelsRes = {
  requests: YaOrderInfoRes[];
};

export type YaTrackInfo = {
  reference: string;
  requestId: string;
  trackNumber: string;
  sharingUrl: string;
  status: YaParcelStatus;
};

export enum YaParcelStatus {
  DRAFT = 'DRAFT',
  VALIDATING = 'VALIDATING',
  CREATED = 'CREATED',
  DELIVERY_PROCESSING_STARTED = 'DELIVERY_PROCESSING_STARTED',
  DELIVERY_TRACK_RECEIVED = 'DELIVERY_TRACK_RECEIVED',
  SORTING_CENTER_PROCESSING_STARTED = 'SORTING_CENTER_PROCESSING_STARTED',
  SORTING_CENTER_TRACK_RECEIVED = 'SORTING_CENTER_TRACK_RECEIVED',
  SORTING_CENTER_TRACK_LOADED = 'SORTING_CENTER_TRACK_LOADED',
  DELIVERY_LOADED = 'DELIVERY_LOADED',
  SORTING_CENTER_LOADED = 'SORTING_CENTER_LOADED',
  SORTING_CENTER_AT_START = 'SORTING_CENTER_AT_START',
  SORTING_CENTER_PREPARED = 'SORTING_CENTER_PREPARED',
  SORTING_CENTER_TRANSMITTED = 'SORTING_CENTER_TRANSMITTED',
  DELIVERY_AT_START = 'DELIVERY_AT_START',
  DELIVERY_AT_START_SORT = 'DELIVERY_AT_START_SORT',
  DELIVERY_TRANSPORTATION = 'DELIVERY_TRANSPORTATION',
  DELIVERY_ARRIVED_PICKUP_POINT = 'DELIVERY_ARRIVED_PICKUP_POINT',
  DELIVERY_STORAGE_PERIOD_EXTENDED = 'DELIVERY_STORAGE_PERIOD_EXTENDED',
  CONFIRMATION_CODE_RECEIVED = 'CONFIRMATION_CODE_RECEIVED',
  VALIDATING_ERROR = 'VALIDATING_ERROR',
  DELIVERY_STORAGE_PERIOD_EXPIRED = 'DELIVERY_STORAGE_PERIOD_EXPIRED',
  DELIVERY_TRANSMITTED_TO_RECIPIENT = 'DELIVERY_TRANSMITTED_TO_RECIPIENT',
  PARTICULARLY_DELIVERED = 'PARTICULARLY_DELIVERED',
  DELIVERY_DELIVERED = 'DELIVERY_DELIVERED',
  FINISHED = 'FINISHED',
  CANCELLED = 'CANCELLED',
  CANCELLED_BY_RECIPIENT = 'CANCELLED_BY_RECIPIENT',
  CANCELLED_USER = 'CANCELLED_USER',
  CANCELLED_IN_PLATFORM = 'CANCELLED_IN_PLATFORM',
  SORTING_CENTER_CANCELLED = 'SORTING_CENTER_CANCELLED',
  CANCELED_IN_PLATFORM = 'CANCELED_IN_PLATFORM',
  SORTING_CENTER_RETURN_PREPARING = 'SORTING_CENTER_RETURN_PREPARING',
  SORTING_CENTER_RETURN_PREPARING_SENDER = 'SORTING_CENTER_RETURN_PREPARING_SENDER',
  SORTING_CENTER_RETURN_ARRIVED = 'SORTING_CENTER_RETURN_ARRIVED',
  SORTING_CENTER_RETURN_RETURNED = 'SORTING_CENTER_RETURN_RETURNED',
  RETURN_TRANSPORTATION_STARTED = 'RETURN_TRANSPORTATION_STARTED',
  RETURN_ARRIVED_DELIVERY = 'RETURN_ARRIVED_DELIVERY',
  RETURN_READY_FOR_PICKUP = 'RETURN_READY_FOR_PICKUP',
  RETURN_RETURNED = 'RETURN_RETURNED',
}

export type YaCostCalculationReqDto = {
  source: { platform_station_id: string };
  destination: { platform_station_id: string };
  tariff: DeliveryType;
  total_weight: number;
  total_assessed_price: number;
  client_price: number;
  payment_method: PaymentMethod;
  places: Pick<Place, 'physical_dims'>[];
};

export type YaCostResDto = {
  pricing_total: string;
};
