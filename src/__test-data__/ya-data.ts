import { YaCostCalculationReqDto, YaOrderHistoryRes } from 'src/ya/dto/ya.dto';

export const yaOrderHistory: YaOrderHistoryRes = {
  state_history: [
    {
      status: 'CREATED',
      description: 'Заказ создан в операторе',
      timestamp: 1729256177,
      timestamp_utc: '2024-10-18T12:56:17.000000Z',
    },
    {
      status: 'SORTING_CENTER_LOADED',
      description: 'Заказ подтвержден в сортировочном центре',
      timestamp: 1729256313,
      timestamp_utc: '2024-10-18T12:58:33.000000Z',
    },
  ],
};

export const yaCostReq: YaCostCalculationReqDto = {
  client_price: 1000,
  payment_method: 'already_paid',
  tariff: 'self_pickup',
  source: {
    platform_station_id: 'c6e86b41-a146-47aa-a619-857832465049',
  },
  destination: {
    platform_station_id: 'ab4ddcb8-1abd-4aac-9277-2e4bd755efeb',
  },
  total_assessed_price: 1000,
  total_weight: 300,
  places: [{ physical_dims: { weight_gross: 300, dx: 5, dy: 10, dz: 15 } }],
};
