import { YaOrderHistoryRes } from 'src/ya/dto/ya.dto';

// const history = {
//   state_history: [
//     {
//       status: 'CREATED',
//       description: 'Заказ создан в операторе',
//       timestamp: 1729516177,
//       timestamp_utc: '2024-10-21T13:09:37.000000Z',
//     },
//     {
//       status: 'SORTING_CENTER_LOADED',
//       description: 'Заказ подтвержден в сортировочном центре',
//       timestamp: 1729516319,
//       timestamp_utc: '2024-10-21T13:11:59.000000Z',
//     },
//     {
//       status: 'SORTING_CENTER_AT_START',
//       description: 'На складе сортировочного центра',
//       timestamp: 1729520859,
//       timestamp_utc: '2024-10-21T14:27:39.000000Z',
//     },
//     {
//       status: 'SORTING_CENTER_PREPARED',
//       description: 'Готов к отправке в службу доставки',
//       timestamp: 1729520859,
//       timestamp_utc: '2024-10-21T14:27:39.000000Z',
//     },
//     {
//       status: 'SORTING_CENTER_TRANSMITTED',
//       description: 'Отправлен в службу доставки',
//       timestamp: 1729590399,
//       timestamp_utc: '2024-10-22T09:46:39.000000Z',
//     },
//     {
//       status: 'DELIVERY_AT_START',
//       description: 'На складе службы доставки',
//       timestamp: 1729728812,
//       timestamp_utc: '2024-10-24T00:13:32.000000Z',
//     },
//     {
//       status: 'DELIVERY_AT_START_SORT',
//       description: 'Заказ готовится к отправке',
//       timestamp: 1729743414,
//       timestamp_utc: '2024-10-24T04:16:54.000000Z',
//     },
//     {
//       status: 'DELIVERY_TRANSPORTATION',
//       description: 'Доставляется в город получателя',
//       timestamp: 1729752435,
//       timestamp_utc: '2024-10-24T06:47:15.000000Z',
//     },
//     {
//       status: 'DELIVERY_ARRIVED_PICKUP_POINT',
//       description: 'В пункте самовывоза',
//       timestamp: 1729774691,
//       timestamp_utc: '2024-10-24T12:58:11.000000Z',
//     },
//     {
//       status: 'CONFIRMATION_CODE_RECEIVED',
//       description: 'Получен код подтверждения',
//       timestamp: 1729774696,
//       timestamp_utc: '2024-10-24T12:58:16.000000Z',
//     },
//   ],
// };

export function parseYaHistoryToHtml(history: YaOrderHistoryRes): string {
  const statuses = history.state_history.reverse();
  const html = statuses
    .map((status) => {
      return `
      <div>
        <h3>${status.description}</h3>
        <p>${new Date(status.timestamp_utc).toLocaleString()}</p>
      </div>
    `;
    })
    .join('');

  return html;
}
