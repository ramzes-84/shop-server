document.addEventListener('DOMContentLoaded', () => {
  const orderActionsNode = document.querySelector('.order-navigation');
  const carrierNode = document.querySelector('td.carrier-name');
  const isYandexDelivery = carrierNode?.textContent === CargoNames.YANDEX;
  const isFivePostDelivery = carrierNode?.textContent === CargoNames.FIVE_POST;

  if (orderActionsNode) {
    const orderId = findOrderId();

    const invoiceButton = document.createElement('button');
    invoiceButton.textContent = '💰';
    invoiceButton.type = 'button';
    invoiceButton.title = 'Создать счёт';
    invoiceButton.className = 'btn btn-success';
    invoiceButton.addEventListener('click', () => {
      void runExclusive(invoiceButton, () => createInvoice(orderId));
    });

    orderActionsNode.before(invoiceButton);

    if (isYandexDelivery) {
      const outerScript = document.createElement('script');
      outerScript.src = 'https://ndd-widget.landpro.site/widget.js';
      document.body.append(outerScript);

      const button = document.createElement('button');
      button.textContent = '🚛';
      button.type = 'button';
      button.title = 'Зарегистрировать отправку';
      button.className = 'btn btn-primary';
      button.addEventListener('click', () => {
        void runExclusive(button, () => createOrder(orderId));
      });

      const mapButton = document.createElement('button');
      mapButton.textContent = '🌍';
      mapButton.type = 'button';
      mapButton.title = 'Посмотреть пункты';
      mapButton.className = 'btn btn-light';
      mapButton.addEventListener('click', () => {
        openMap(CargoNames.YANDEX);
      });

      orderActionsNode.before(mapButton, button);
    } else if (isFivePostDelivery) {
      const outerScript = document.createElement('script');
      outerScript.src = 'https://fivepost.ru/static/5post-widget-v1.0.js';
      document.body.append(outerScript);

      const mapButton = document.createElement('button');
      mapButton.textContent = '🌍';
      mapButton.type = 'button';
      mapButton.title = 'Посмотреть пункты';
      mapButton.className = 'btn btn-light';
      mapButton.addEventListener('click', () => {
        openMap(CargoNames.FIVE_POST);
      });

      orderActionsNode.before(mapButton);
    }
  }
});

enum CargoNames {
  POST = 'Почтоматы: Почта России (ОПЛАТА СЕЙЧАС НА САЙТЕ)',
  DPD = 'Пункты DPD',
  FIVE_POST = '5Post: Пятёрочки и постаматы (ОПЛАТА СЕЙЧАС НА САЙТЕ)',
  YANDEX = 'Пункты Яндекс.Маркет (ОПЛАТА СЕЙЧАС НА САЙТЕ)',
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
  name: string;
  storeId: string;
  partnerName: string;
  type: string;
  fullAddress: string;
  address: {
    country: string;
    zipCode: string;
    region: string;
    city: string;
    regionType: string;
    cityType: string;
    street: string;
    house: string;
    building: string;
    metroStation: string;
    lat: number;
    lng: number;
  };
  additional: string;
  phone: string;
  cashAllowed: boolean;
  cardAllowed: boolean;
  returnAllowed: boolean;
  workHoursBrief: string;
  label: string;
  resultAddress: string;
};

type TransferInterface = {
  ok: boolean;
  data: any;
};

enum Endpoints {
  BXB_CREATE = '/boxberry/create',
  YA_CREATE = '/yandex/create',
  INVOICE = '/cash/create',
}

type RequestParams = {
  orderId: string;
  sms?: boolean;
};

const REQUEST_TIMEOUT_MS = 15_000;

function findOrderId() {
  return document.querySelector('*[data-role=order-id]')?.textContent?.slice(1);
}

// runtime window properties for fivepost instances will be accessed as (window as any)

function openMap(carrier: CargoNames) {
  const popupContainer = document.createElement('dialog');
  popupContainer.open = true;
  popupContainer.style.position = 'absolute';
  popupContainer.style.top = '150px';
  popupContainer.style.width = '70vw';

  const customScript = document.createElement('script');

  const closePopupBtn = document.createElement('button');
  closePopupBtn.innerText = 'Закрыть';
  const closePopupBtnStyle = {
    display: 'block',
    backgroundColor: '#24b9d7',
    height: '45px',
    width: '100%',
    border: 'none',
    fontFamily: 'Manrope, sans-serif',
    fontSize: '1rem',
    fontWeight: '500',
    textTransform: 'uppercase',
    color: 'white',
    textAlign: 'center',
  };
  Object.assign(closePopupBtn.style, closePopupBtnStyle);
  closePopupBtn.addEventListener('click', () => {
    popupContainer.remove();
  });

  // create containers depending on carrier
  if (carrier === CargoNames.YANDEX) {
    const yaDostavkaContainer = document.createElement('div');
    yaDostavkaContainer.id = 'delivery-widget';
    popupContainer.append(yaDostavkaContainer);

    customScript.innerText = buildYaWidgetBackEndScript(yaDostavkaContainer.id);

    popupContainer.append(closePopupBtn, customScript);
    document.body.append(popupContainer);
    return;
  }

  if (carrier === CargoNames.FIVE_POST) {
    // ensure widget script loaded then initialize
    const fivePostScript = document.createElement('script');
    fivePostScript.src = 'https://fivepost.ru/static/5post-widget-v1.0.js';

    // create unique ids to avoid collisions
    const mapId = `fivepost-map-${Date.now()}`;
    const infoId = `fivepost-info-${Date.now()}`;

    const mapWrapper = document.createElement('div');
    mapWrapper.style.minWidth = '300px';
    mapWrapper.style.minHeight = '300px';
    mapWrapper.style.width = '100%';
    mapWrapper.className = 'fivepost-backend-wrapper';

    const fivePostMapContainer = document.createElement('div');
    fivePostMapContainer.id = mapId;
    fivePostMapContainer.style.width = '100%';
    fivePostMapContainer.style.height = '400px';
    fivePostMapContainer.style.background = '#f7f7f7';

    const fivePostTextContainer = document.createElement('div');
    fivePostTextContainer.id = infoId;
    fivePostTextContainer.innerText = 'Выберите пункт выдачи';

    mapWrapper.append(fivePostMapContainer, fivePostTextContainer);
    popupContainer.append(mapWrapper);

    // after the external script loads, insert the inline init
    fivePostScript.onload = () => {
      customScript.innerText = buildFivePostWidgetBackEndScript(mapId, infoId);
      // ensure that when the close button is clicked we also destroy the fivepost map instance
      closePopupBtn.addEventListener('click', () => {
        try {
          if ((window as any).destroyFivepostMap) {
            (window as any).destroyFivepostMap(mapId);
          }
        } catch (e) {
          console.error('Error destroying backend fivepost map on close', e);
        }
      });

      popupContainer.append(closePopupBtn, customScript);
    };

    fivePostScript.onerror = () => {
      console.error('Failed to load fivepost widget script');
      popupContainer.append(closePopupBtn);
    };

    document.body.append(fivePostScript, popupContainer);
    return;
  }

  // fallback: just append close button
  popupContainer.append(closePopupBtn);
  document.body.append(popupContainer);
}

// Вызывается по имени из inline-скрипта виджета Яндекса — статический анализ этого не видит.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function saveDestination(data: YandexData | FivePostPointData) {
  const messageElement = document.querySelector('#order_message_message');
  if (!(messageElement instanceof HTMLTextAreaElement)) return;

  let message = '';
  if ('detail' in data) {
    message = `Уточните, удобно ли Вам будет получить заказ в пункте Я.Маркет по адресу: ${data.detail.address.full_address} [ID: ${data.detail.id}]?`;
  } else if ('id' in data) {
    message = `Уточните, удобно ли Вам будет получить заказ в пункте Five Post по адресу: ${data.fullAddress} [ID: ${data.id}]?`;
  }
  messageElement.value = message;
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

async function createInvoice(orderId: string | null | undefined) {
  if (!orderId) {
    alert('Не удалось корректно получить данные для оформления');
    return;
  }
  if (!confirm('Вы уверены, что хотите создать счёт?')) return;

  const sms = confirm('Направить счёт в SMS?');

  try {
    const result = await fetchFromServer(Endpoints.INVOICE, 'POST', {
      orderId,
      sms,
    });
    if (result.ok && result.data.url) {
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

async function createOrder(orderId: string | null | undefined) {
  if (!orderId) {
    alert('Не удалось корректно получить данные для оформления');
    return;
  }
  if (!confirm('Вы уверены, что хотите создать заказ?')) return;

  const currentEndpoint = Endpoints.YA_CREATE;

  try {
    const result = await fetchFromServer(currentEndpoint, 'POST', {
      orderId,
    });
    if (result.ok) {
      let trackNumber = '';
      if ('sharing_url' in result.data) {
        trackNumber = (result.data.sharing_url as string).replace(
          'https://dostavka.yandex.ru/route/',
          '',
        );
      } else if ('track' in result.data) {
        trackNumber = result.data.track;
      }

      await copyToClipboard(trackNumber);
      alert(
        `Трек-номер для отправки клиенту скопирован в буфер обмена: \n${trackNumber}`,
      );
    } else {
      alert('Не удалось создать заказ');
    }
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
  endpoint: Endpoints,
  method: 'POST',
  params: RequestParams,
): Promise<TransferInterface> {
  const url = new URL('https://shop-server-4y1m.onrender.com' + endpoint);

  const controller = new AbortController();
  const timeoutId = window.setTimeout(
    () => controller.abort(),
    REQUEST_TIMEOUT_MS,
  );

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${btoa(window.location.pathname.split('/')[1])}`,
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

  if (!response.ok) {
    throw new Error(
      `Не удалось выполнить запрос к серверу: ${response.status}`,
    );
  }

  return response.json();
}

const buildYaWidgetBackEndScript = (containerId: string) => `
(function(w){
  function startWidget() {
    w.YaDelivery.createWidget({
      containerId:"${containerId}",
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

const buildFivePostWidgetBackEndScript = (mapId: string, infoId: string) => `
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
  try {
    if (window.__fivepostMaps && window.__fivepostMaps['${mapId}']) {
      try { window.__fivepostMaps['${mapId}'].destroy(); } catch(e){ console.warn('Existing fivepostMap.destroy() failed', e); }
      delete window.__fivepostMaps['${mapId}'];
    }

    const fivepostMap = new fivepost.PickupPointsMap({
      apikey: 'd986ab4c-1a82-443d-b833-706578a4137d',
      target: '#${mapId}',
      onSelectPoint: point => {
        saveDestination(point);
        const pointInfoContainer = document.getElementById('${infoId}');

        if (!pointInfoContainer) {
          return;
        }

        if (point) {
          pointInfoContainer.innerHTML = '<p>' + point.label + '</p>' +
            '<p><b>Адрес:</b> ' + point.resultAddress + '</p>' +
            (point.additional ? '<p><b>Местонахождение:</b> ' + point.additional + '</p>' : '');
        } else {
          pointInfoContainer.innerHTML = 'Выберите точку';
        }
      },
      onLoadYandexApi: () => {
        console.log('onLoadYandexApi');
      },
      onInit: () => {
        console.log('onInit');
      },
      onCancel: point => {
        console.log('canceled', point);
      }
    });

    window.__fivepostMaps['${mapId}'] = fivepostMap;
  } catch (e) {
    console.error('initFivepostWidget error', e);
  }
}, 0);
`;
