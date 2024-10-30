import { yaOrderHistory } from 'src/__test-data__/ya-data';
import { parseYaHistoryToHtml } from './parseYaHistoryToHtml';

describe('parseYaHistoryToHtml', () => {
  it('should convert history data to HTML format', () => {
    const historyData = { ...yaOrderHistory };

    const expectedHtml = `<div><h3>${historyData.state_history[1].description}</h3><p>${new Date(historyData.state_history[1].timestamp_utc).toLocaleString()}</p></div><div><h3>${historyData.state_history[0].description}</h3><p>${new Date(historyData.state_history[0].timestamp_utc).toLocaleString()}</p></div>`;

    const result = parseYaHistoryToHtml(historyData);
    expect(result).toBe(expectedHtml);
  });

  it('should return an empty list for empty history data', () => {
    const historyData = {
      state_history: [],
    };

    const expectedHtml = '';

    const result = parseYaHistoryToHtml(historyData);
    expect(result).toBe(expectedHtml.trim());
  });
});
