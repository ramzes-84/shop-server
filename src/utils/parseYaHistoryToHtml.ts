import { YaOrderHistoryRes } from 'src/ya/dto/ya.dto';

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
