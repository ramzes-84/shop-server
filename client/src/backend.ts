/**
 * Скрипт панели shop-server на странице заказа PrestaShop.
 * Всё окружение (адрес сервера, токен, заказ, перевозчик) приходит из модуля
 * через window.shopServerConfig — из DOM ничего не вычитывается.
 */

type ShopServerCarrier = '' | 'yandex' | 'fivepost';

type ShopServerConfig = {
  apiUrl: string;
  token: string;
  orderId: string;
  carrier: ShopServerCarrier;
  fivePostKey: string;
};

// Расширение глобального Window: значения приходят из модуля PrestaShop и из inline-скриптов виджетов.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface Window {
  shopServerConfig?: ShopServerConfig;
  __fivepostMaps?: Record<string, { destroy: () => void }>;
  destroyFivepostMap?: (id: string) => void;
}

type YandexData = {
  detail: {
    address: {
      full_address: string;
    };
    id: string;
  };
};

type FivePostPointData = {
  id: string;
  fullAddress: string;
  additional: string;
  label: string;
  resultAddress: string;
};

type TransferInterface = {
  ok: boolean;
  data: Record<string, unknown>;
};

const enum Endpoints {
  YA_CREATE = '/yandex/create',
  INVOICE = '/cash/create',
}

type RequestParams = {
  orderId: string;
  sms?: boolean;
};

const REQUEST_TIMEOUT_MS = 15_000;
const YA_WIDGET_SRC = 'https://ndd-widget.landpro.site/widget.js';
const FIVEPOST_WIDGET_SRC = 'https://fivepost.ru/static/5post-widget-v1.0.js';

const SESSION_EXPIRED_MESSAGE =
  'Сессия истекла. Обновите страницу заказа и повторите действие.';

const REQUEST_ID_HEADER = 'X-Request-Id';

/** Только то, что безопасно переслать в чат: токен сюда попасть не должен. */
type NoticeDetails = {
  action: string;
  endpoint: string;
  orderId: string;
  status?: number | string;
  requestId?: string | null;
};

type Notice = {
  type: 'success' | 'error';
  message: string;
  value?: string;
  details?: NoticeDetails;
};

class ShopServerError extends Error {
  readonly details: NoticeDetails;

  constructor(message: string, details: NoticeDetails) {
    super(message);
    this.name = 'ShopServerError';
    this.details = details;
  }
}

function showNotice(notice: Notice) {
  const panel = document.querySelector('.shopserver-panel');
  if (!panel) return;

  panel.querySelector('.shopserver-notice')?.remove();

  const box = document.createElement('div');
  box.className = `shopserver-notice shopserver-notice--${notice.type}`;
  box.setAttribute('role', notice.type === 'error' ? 'alert' : 'status');

  const text = document.createElement('p');
  text.className = 'shopserver-notice-text';
  text.textContent = notice.message;
  box.append(text);

  if (notice.value) {
    const value = document.createElement('code');
    value.className = 'shopserver-notice-value';
    value.textContent = notice.value;
    box.append(value);
  }

  if (notice.details) {
    box.append(buildNoticeDetails(notice.details));
  }

  const dismiss = document.createElement('button');
  dismiss.type = 'button';
  dismiss.className = 'shopserver-notice-close';
  dismiss.textContent = '×';
  dismiss.title = 'Скрыть';
  dismiss.addEventListener('click', () => box.remove());
  box.append(dismiss);

  panel.append(box);
}

function buildNoticeDetails(details: NoticeDetails): HTMLElement {
  const report = [
    `Время: ${new Date().toLocaleString()}`,
    `Действие: ${details.action}`,
    `Заказ: ${details.orderId}`,
    `Запрос: POST ${details.endpoint}`,
    `Статус: ${details.status ?? '—'}`,
    `ID запроса: ${details.requestId ?? '—'}`,
  ].join('\n');

  const wrapper = document.createElement('details');
  wrapper.className = 'shopserver-notice-details';

  const summary = document.createElement('summary');
  summary.textContent = 'Детали для разработчика';
  wrapper.append(summary);

  const pre = document.createElement('pre');
  pre.textContent = report;
  wrapper.append(pre);

  const copy = document.createElement('button');
  copy.type = 'button';
  copy.className = 'btn btn-sm btn-outline-secondary';
  copy.textContent = 'Скопировать';
  copy.addEventListener('click', () => {
    void copyToClipboard(report).then(() => {
      copy.textContent = 'Скопировано';
    });
  });
  wrapper.append(copy);

  return wrapper;
}

function initShopServerPanel() {
  const config = window.shopServerConfig;
  const panel = document.querySelector('.shopserver-panel');

  if (!config || !panel) return;

  panel.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    const button = target.closest<HTMLButtonElement>(
      'button[data-shopserver-action]',
    );
    if (!button) return;

    switch (button.dataset.shopserverAction) {
      case 'invoice':
        void runExclusive(button, () => createInvoice(config));
        break;
      case 'create-order':
        void runExclusive(button, () => createOrder(config));
        break;
      case 'map':
        openMap(config);
        break;
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initShopServerPanel);
} else {
  initShopServerPanel();
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Не удалось загрузить ${src}`));
    document.body.append(script);
  });
}

function openMap(config: ShopServerConfig) {
  if (config.carrier === 'yandex') {
    void openYandexMap();
    return;
  }

  if (config.carrier === 'fivepost') {
    void openFivePostMap(config.fivePostKey);
  }
}

function buildDialog(): {
  dialog: HTMLDialogElement;
  closeButton: HTMLButtonElement;
} {
  const dialog = document.createElement('dialog');
  dialog.className = 'shopserver-dialog';
  dialog.open = true;

  const closeButton = document.createElement('button');
  closeButton.type = 'button';
  closeButton.className = 'shopserver-dialog-close';
  closeButton.textContent = 'Закрыть';
  closeButton.addEventListener('click', () => dialog.remove());

  return { dialog, closeButton };
}

async function openYandexMap() {
  const { dialog, closeButton } = buildDialog();

  const container = document.createElement('div');
  container.id = `ya-map-${Date.now()}`;
  container.className = 'shopserver-dialog-map shopserver-dialog-map--auto';
  dialog.append(container, closeButton);
  document.body.append(dialog);

  try {
    await loadScript(YA_WIDGET_SRC);
  } catch {
    container.textContent = 'Не удалось загрузить виджет Яндекс.Доставки';
    return;
  }

  const script = document.createElement('script');
  script.text = buildYaWidgetAdminScript(container.id);
  dialog.append(script);
}

async function openFivePostMap(apiKey: string) {
  const { dialog, closeButton } = buildDialog();

  const mapId = `fivepost-map-${Date.now()}`;
  const infoId = `fivepost-info-${Date.now()}`;

  const mapContainer = document.createElement('div');
  mapContainer.id = mapId;
  mapContainer.className = 'shopserver-dialog-map';

  const infoContainer = document.createElement('div');
  infoContainer.id = infoId;
  infoContainer.className = 'shopserver-dialog-info';
  infoContainer.textContent = 'Выберите пункт выдачи';

  dialog.append(mapContainer, infoContainer, closeButton);
  document.body.append(dialog);

  closeButton.addEventListener('click', () => {
    window.destroyFivepostMap?.(mapId);
  });

  if (!apiKey) {
    infoContainer.textContent =
      'Ключ виджета 5Post не задан в настройках модуля';
    return;
  }

  try {
    await loadScript(FIVEPOST_WIDGET_SRC);
  } catch {
    infoContainer.textContent = 'Не удалось загрузить виджет 5Post';
    return;
  }

  const script = document.createElement('script');
  script.text = buildFivePostWidgetAdminScript(mapId, infoId, apiKey);
  dialog.append(script);
}

// Вызывается по имени из inline-скриптов виджетов — статический анализ этого не видит.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function saveDestination(data: YandexData | FivePostPointData) {
  const messageElement = document.querySelector('#order_message_message');
  if (!(messageElement instanceof HTMLTextAreaElement)) return;

  if ('detail' in data) {
    messageElement.value = `Уточните, удобно ли Вам будет получить заказ в пункте Я.Маркет по адресу: ${data.detail.address.full_address} [ID: ${data.detail.id}]?`;
  } else if ('id' in data) {
    messageElement.value = `Уточните, удобно ли Вам будет получить заказ в пункте Five Post по адресу: ${data.fullAddress} [ID: ${data.id}]?`;
  }
}

// Блокирует кнопку на время операции, чтобы повторный клик не создал дубль счёта или отправки.
async function runExclusive(
  button: HTMLButtonElement,
  action: () => Promise<void>,
) {
  if (button.disabled) return;

  const originalText = button.textContent;
  button.disabled = true;
  button.setAttribute('aria-busy', 'true');
  button.textContent = '⏳';

  try {
    await action();
  } finally {
    button.disabled = false;
    button.removeAttribute('aria-busy');
    button.textContent = originalText;
  }
}

async function createInvoice(config: ShopServerConfig) {
  if (!confirm('Вы уверены, что хотите создать счёт?')) return;

  const sms = confirm('Направить счёт в SMS?');

  await runAction(config, 'Создание счёта', Endpoints.INVOICE, {
    orderId: config.orderId,
    sms,
  });
}

async function createOrder(config: ShopServerConfig) {
  if (!confirm('Вы уверены, что хотите создать заказ?')) return;

  await runAction(config, 'Регистрация отправки', Endpoints.YA_CREATE, {
    orderId: config.orderId,
  });
}

async function runAction(
  config: ShopServerConfig,
  action: string,
  endpoint: Endpoints,
  params: RequestParams,
) {
  try {
    const { body, requestId } = await fetchFromServer(
      config,
      endpoint,
      params,
      action,
    );

    if (!body.ok) {
      showNotice({
        type: 'error',
        message: serverMessage(body) ?? `${action}: сервер отклонил запрос`,
        details: {
          action,
          endpoint,
          status: 200,
          requestId,
          orderId: config.orderId,
        },
      });
      return;
    }

    await showSuccess(action, body);
  } catch (error) {
    showNotice({
      type: 'error',
      message: error instanceof Error ? error.message : `${action}: ошибка`,
      details:
        error instanceof ShopServerError
          ? error.details
          : { action, endpoint, orderId: config.orderId },
    });
  }
}

function serverMessage(body: TransferInterface): string | null {
  const message = (body.data as { message?: unknown } | undefined)?.message;
  return typeof message === 'string' && message ? message : null;
}

async function showSuccess(action: string, body: TransferInterface) {
  if (typeof body.data.url === 'string') {
    await copyToClipboard(body.data.url);
    showNotice({
      type: 'success',
      message: 'Счёт создан, ссылка скопирована в буфер обмена.',
      value: body.data.url,
    });
    return;
  }

  if (body.data.type === 'sms') {
    showNotice({ type: 'success', message: 'Счёт направлен в SMS.' });
    return;
  }

  let trackNumber = '';
  if (typeof body.data.sharing_url === 'string') {
    trackNumber = body.data.sharing_url.replace(
      'https://dostavka.yandex.ru/route/',
      '',
    );
  } else if (typeof body.data.track === 'string') {
    trackNumber = body.data.track;
  }

  if (trackNumber) {
    await copyToClipboard(trackNumber);
    showNotice({
      type: 'success',
      message: 'Трек-номер скопирован в буфер обмена.',
      value: trackNumber,
    });
    return;
  }

  showNotice({ type: 'success', message: `${action}: выполнено.` });
}

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch (err) {
    console.error('Failed to copy text: ', err);
  }
}

async function fetchFromServer(
  config: ShopServerConfig,
  endpoint: Endpoints,
  params: RequestParams,
  action: string,
): Promise<{ body: TransferInterface; requestId: string | null }> {
  const url = new URL(config.apiUrl + endpoint);
  const details: NoticeDetails = { action, endpoint, orderId: config.orderId };

  const controller = new AbortController();
  const timeoutId = window.setTimeout(
    () => controller.abort(),
    REQUEST_TIMEOUT_MS,
  );

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.token}`,
      },
      body: JSON.stringify(params),
      signal: controller.signal,
    });
  } catch {
    if (controller.signal.aborted) {
      throw new ShopServerError(
        'Сервер не ответил за отведённое время. Операция могла всё же выполниться — проверьте заказ перед повторной попыткой.',
        { ...details, status: 'timeout' },
      );
    }
    throw new ShopServerError(
      'Не удалось связаться с сервером. Проверьте подключение.',
      { ...details, status: 'network' },
    );
  } finally {
    window.clearTimeout(timeoutId);
  }

  const requestId = response.headers.get(REQUEST_ID_HEADER);
  const failure: NoticeDetails = {
    ...details,
    status: response.status,
    requestId,
  };

  if (response.status === 401) {
    throw new ShopServerError(SESSION_EXPIRED_MESSAGE, failure);
  }

  if (!response.ok) {
    throw new ShopServerError(
      (await readErrorMessage(response)) ??
        `Сервер вернул ошибку ${response.status}`,
      failure,
    );
  }

  return { body: (await response.json()) as TransferInterface, requestId };
}

async function readErrorMessage(response: Response): Promise<string | null> {
  try {
    return serverMessage((await response.json()) as TransferInterface);
  } catch {
    return null;
  }
}

const buildYaWidgetAdminScript = (containerId: string) => `
(function(w){
  function startWidget() {
    w.YaDelivery.createWidget({
      containerId: ${JSON.stringify(containerId)},
      params:{
        city:"Москва",
        size:{"height":"450px","width":"100%"},
        delivery_price:"от 100 руб.",
        delivery_term:"от 2 дней",
        show_select_button: true,
        filter:{
          type: ["pickup_point","terminal"],
          is_yandex_branded: true,
          payment_methods:["already_paid","card_on_receipt","cash_on_receipt"],
          payment_methods_filter:"or"
        }
      }
    });
  }
  w.YaDelivery ? startWidget() : document.addEventListener("YaNddWidgetLoad", startWidget);
})(window);
document.addEventListener("YaNddWidgetPointSelected", function (data) {
  saveDestination(data);
}, true);
`;

const buildFivePostWidgetAdminScript = (
  mapId: string,
  infoId: string,
  apiKey: string,
) => `
window.__fivepostMaps = window.__fivepostMaps || {};
window.destroyFivepostMap = window.destroyFivepostMap || function (id) {
  try {
    if (window.__fivepostMaps && window.__fivepostMaps[id]) {
      window.__fivepostMaps[id].destroy();
      delete window.__fivepostMaps[id];
    }
  } catch (e) {
    console.error('destroyFivepostMap error', e);
  }
};

setTimeout(function initFivepostWidget() {
  var mapId = ${JSON.stringify(mapId)};
  var infoId = ${JSON.stringify(infoId)};

  try {
    window.destroyFivepostMap(mapId);

    window.__fivepostMaps[mapId] = new fivepost.PickupPointsMap({
      apikey: ${JSON.stringify(apiKey)},
      target: '#' + mapId,
      onSelectPoint: function (point) {
        saveDestination(point);
        var pointInfoContainer = document.getElementById(infoId);

        if (!pointInfoContainer) {
          return;
        }

        if (!point) {
          pointInfoContainer.textContent = 'Выберите точку';
          return;
        }

        pointInfoContainer.textContent = '';
        [point.label, 'Адрес: ' + point.resultAddress, point.additional ? 'Местонахождение: ' + point.additional : '']
          .filter(Boolean)
          .forEach(function (line) {
            var p = document.createElement('p');
            p.textContent = line;
            pointInfoContainer.appendChild(p);
          });
      }
    });
  } catch (e) {
    console.error('initFivepostWidget error', e);
  }
}, 0);
`;
