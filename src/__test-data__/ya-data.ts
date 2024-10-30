import { YaOrderHistoryRes } from 'src/ya/dto/ya.dto';

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
