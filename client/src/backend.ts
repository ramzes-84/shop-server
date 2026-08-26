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
  script.text = buildYaWidgetScript(container.id);
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
  script.text = buildFivePostWidgetScript(mapId, infoId, apiKey);
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

  try {
    const result = await fetchFromServer(config, Endpoints.INVOICE, {
      orderId: config.orderId,
      sms,
    });

    if (result.ok && typeof result.data.url === 'string') {
      await copyToClipboard(result.data.url);
      alert('Счёт успешно создан. Ссылка: ' + result.data.url);
    } else if (result.ok && result.data.type === 'sms') {
      alert('Счёт успешно направлен в SMS');
    } else {
      alert('Не удалось создать счёт');
    }
  } catch (error) {
    alert(error instanceof Error ? error.message : 'Не удалось создать счёт');
  }
}

async function createOrder(config: ShopServerConfig) {
  if (!confirm('Вы уверены, что хотите создать заказ?')) return;

  try {
    const result = await fetchFromServer(config, Endpoints.YA_CREATE, {
      orderId: config.orderId,
    });

    if (!result.ok) {
      alert('Не удалось создать заказ');
      return;
    }

    let trackNumber = '';
    if (typeof result.data.sharing_url === 'string') {
      trackNumber = result.data.sharing_url.replace(
        'https://dostavka.yandex.ru/route/',
        '',
      );
    } else if (typeof result.data.track === 'string') {
      trackNumber = result.data.track;
    }

    await copyToClipboard(trackNumber);
    alert(
      `Трек-номер для отправки клиенту скопирован в буфер обмена: \n${trackNumber}`,
    );
  } catch (error) {
    alert(error instanceof Error ? error.message : 'Не удалось создать заказ');
  }
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
): Promise<TransferInterface> {
  const url = new URL(config.apiUrl + endpoint);

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
      throw new Error(
        'Сервер не ответил за отведённое время. Операция могла всё же выполниться — проверьте заказ перед повторной попыткой.',
      );
    }
    throw new Error('Не удалось связаться с сервером. Проверьте подключение.');
  } finally {
    window.clearTimeout(timeoutId);
  }

  if (response.status === 401) {
    throw new Error(SESSION_EXPIRED_MESSAGE);
  }

  if (!response.ok) {
    throw new Error(
      `Не удалось выполнить запрос к серверу: ${response.status}`,
    );
  }

  return response.json();
}

const buildYaWidgetScript = (containerId: string) => `
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

const buildFivePostWidgetScript = (
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
