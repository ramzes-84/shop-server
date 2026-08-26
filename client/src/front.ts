/**
 * Виджеты пунктов выдачи на шаге доставки в оформлении заказа.
 * Перевозчики и ключи виджетов приходят из модуля PrestaShop
 * через window.shopServerFront.
 */

type FrontCarrier = 'post' | 'dpd' | 'yandex' | 'fivepost';

type ShopServerFrontConfig = {
  /** id_carrier -> тип перевозчика */
  carriers: Record<string, FrontCarrier>;
  fivePostKey: string;
  dpdSid: string;
  pochtaWidgetId: string;
};

// Расширение глобального Window: значения приходят из модуля PrestaShop и из inline-скриптов виджетов.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface Window {
  shopServerFront?: ShopServerFrontConfig;
  __fivepostMaps?: Record<string, { destroy: () => void }>;
  destroyFivepostMap?: (id: string) => void;
}

const WIDGET_SRC: Record<FrontCarrier, string> = {
  post: 'https://widget.pochta.ru/map/widget/widget.js',
  dpd: 'https://chooser.dpd.ru/dpdchooser.js?nocache=1499949132826',
  yandex: 'https://ndd-widget.landpro.site/widget.js',
  fivepost: 'https://fivepost.ru/static/5post-widget-v1.0.js',
};

const MAP_LINK_LABEL: Record<FrontCarrier, string> = {
  post: 'Карта почтоматов Почты России',
  dpd: 'Карта пунктов DPD',
  yandex: 'Карта пунктов Яндекс',
  fivepost: 'Карта пунктов 5Post',
};

const loadedWidgets: Record<string, Promise<void>> = {};

function loadWidgetScript(carrier: FrontCarrier): Promise<void> {
  const src = WIDGET_SRC[carrier];

  if (!loadedWidgets[src]) {
    loadedWidgets[src] = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Не удалось загрузить ${src}`));
      document.body.append(script);
    });
  }

  return loadedWidgets[src];
}

/** Витрина знает перевозчика по значению радиокнопки вида "493," — это id_carrier. */
function findCarrierType(
  option: Element,
  config: ShopServerFrontConfig,
): FrontCarrier | null {
  const input = option.querySelector('input[type=radio]');

  if (!(input instanceof HTMLInputElement)) return null;

  const idCarrier = input.value.split(',')[0].trim();

  return config.carriers[idCarrier] ?? null;
}

function initDeliveryMaps() {
  const config = window.shopServerFront;

  if (!config) return;

  document.querySelectorAll('.delivery-option').forEach((option) => {
    const carrier = findCarrierType(option, config);

    if (!carrier || option.querySelector('.map-link')) return;

    const nameContainer = option.querySelector('.carrier-name');
    const linkToMap = document.createElement('div');
    linkToMap.className = 'map-link';
    linkToMap.textContent = MAP_LINK_LABEL[carrier];
    linkToMap.addEventListener('click', () => {
      void openMapPopup(carrier, config);
    });

    (nameContainer?.parentElement ?? option).append(linkToMap);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDeliveryMaps);
} else {
  initDeliveryMaps();
}

// Шаг доставки перерисовывается аяксом при смене адреса или перевозчика.
document.addEventListener('click', (event) => {
  if (
    event.target instanceof HTMLElement &&
    event.target.closest('.delivery-options, .js-address-selector')
  ) {
    window.setTimeout(initDeliveryMaps, 500);
  }
});

const closePopup = function (e: Event) {
  if (e.target instanceof HTMLButtonElement) e.stopPropagation();
  document.body.classList.remove('freeze-body');
  document.body.querySelector('.map-popup-container')?.remove();
};

async function openMapPopup(
  carrier: FrontCarrier,
  config: ShopServerFrontConfig,
) {
  const textArea = document.body.querySelector('#delivery_message');
  const isTextareaEmpty =
    textArea instanceof HTMLTextAreaElement && textArea.value.length === 0;
  document.body.classList.add('freeze-body');

  const popupContainer = document.createElement('div');
  popupContainer.className = 'map-popup-container';

  const popupContent = document.createElement('div');
  popupContent.className = 'map-popup-content';

  const mapContainer = document.createElement('div');

  const closePopupBtn = document.createElement('button');
  closePopupBtn.type = 'button';
  closePopupBtn.className = 'map-popup-close';
  closePopupBtn.textContent = isTextareaEmpty
    ? 'Закрыть без сохранения пункта'
    : 'Закрыть';
  closePopupBtn.addEventListener('click', closePopup);

  popupContent.append(mapContainer, closePopupBtn);
  popupContainer.append(popupContent);
  document.body.append(popupContainer);

  try {
    await loadWidgetScript(carrier);
  } catch {
    mapContainer.textContent = 'Не удалось загрузить карту пунктов выдачи';
    return;
  }

  const customScript = document.createElement('script');

  switch (carrier) {
    case 'post': {
      popupContainer.addEventListener('click', closePopup);
      mapContainer.id = 'ecom-widget';
      customScript.text = buildPostWidgetScript(
        mapContainer.id,
        config.pochtaWidgetId,
      );
      break;
    }
    case 'dpd': {
      popupContainer.addEventListener('click', closePopup);
      mapContainer.id = 'dpdchooser';
      const mapConsole = document.createElement('div');
      mapConsole.id = 'console';
      closePopupBtn.before(mapConsole);
      customScript.text = buildDpdWidgetScript(
        mapContainer.id,
        mapConsole.id,
        config.dpdSid,
      );
      break;
    }
    case 'yandex': {
      const yaContainer = document.createElement('div');
      yaContainer.id = 'delivery-widget';
      mapContainer.className = 'ya-content';
      mapContainer.append(yaContainer);
      customScript.text = buildYaWidgetScript(yaContainer.id);
      break;
    }
    case 'fivepost': {
      mapContainer.className = 'five-post-content';

      const stamp = Date.now();
      const mapNode = document.createElement('div');
      mapNode.id = `fivepost-map-${stamp}`;
      mapNode.className = 'fivepost-map';

      const infoNode = document.createElement('div');
      infoNode.id = `fivepost-info-${stamp}`;
      infoNode.textContent = 'Выберите пункт выдачи';

      mapContainer.append(mapNode, infoNode);
      customScript.text = buildFivePostWidgetScript(
        mapNode.id,
        infoNode.id,
        config.fivePostKey,
      );
      break;
    }
  }

  mapContainer.append(customScript);
}

// Вызывается по имени из inline-скриптов виджетов — статический анализ этого не видит.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const addAddressToMsg = function (data: CarrierData) {
  const textarea = document.body.querySelector('#delivery_message');
  const btn = document.querySelector('.map-popup-close');

  if (!(textarea instanceof HTMLTextAreaElement)) return;

  const firstLetter = textarea.value.length > 0 ? '\n' : '';
  if (isPostData(data)) {
    textarea.value += `${firstLetter}Почтомат №${data.indexTo} Адрес: ${data.cityTo}, ${data.addressTo}`;
  } else if (isDpdData(data)) {
    const isPayable = data.filterServices['НПП'] || data.filterServices['CARD'];
    textarea.value += `${firstLetter}Пункт DPD: ${
      data.addressString
    }, наложенный платёж ${isPayable ? 'возможен' : 'невозможен'}, [ID: ${
      data.departmentCode
    }]`;
  } else if (isYaData(data)) {
    textarea.value += `${firstLetter}Пункт Я.Маркет: ${data.detail.address.full_address} [ID: ${data.detail.id}]`;
  } else if (isFivePostData(data)) {
    textarea.value += `${firstLetter}Пункт Five Post: ${data.fullAddress} [ID: ${data.id}]`;
  } else {
    return;
  }

  textarea.value = Array.from(new Set(textarea.value.split('\n'))).join('\n');

  if (btn instanceof HTMLButtonElement) {
    btn.textContent = 'Адрес записан в комментарий! Закрыть';
    btn.classList.add('popup-bg-green');
  }
};

const buildPostWidgetScript = (widgetId: string, pochtaWidgetId: string) =>
  `ecomStartWidget({id: ${Number(pochtaWidgetId) || 0}, callbackFunction: addAddressToMsg, containerId: ${JSON.stringify(widgetId)}})`;

const buildDpdWidgetScript = (
  chooserId: string,
  consoleId: string,
  sid: string,
) => `
var chooser = new DPDChooser(${JSON.stringify(chooserId)}, {type: "dpdclient", address: "Тула", choose: 1, sid: ${JSON.stringify(sid)}});
chooser.onError(function (error, code) {
  document.getElementById(${JSON.stringify(consoleId)}).textContent = "Ошибка чузера (" + error + ") код " + code;
});
chooser.onReady(function (address) {
  document.getElementById(${JSON.stringify(consoleId)}).textContent = "Чузер готов. Адрес: " + address;
});
chooser.onChoose(function (dep) {
  addAddressToMsg(dep);
});
`;

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
  addAddressToMsg(data);
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
        addAddressToMsg(point);
        var pointInfoContainer = document.getElementById(infoId);

        if (!pointInfoContainer) {
          return;
        }

        if (!point) {
          pointInfoContainer.textContent = 'Выберите точку';
          return;
        }

        pointInfoContainer.textContent = point.label + ' Адрес: ' + point.resultAddress +
          (point.additional ? ' Местонахождение: ' + point.additional : '');
      }
    });
  } catch (e) {
    console.error('initFivepostWidget error', e);
  }
}, 0);
`;

type PostData = {
  indexTo: string;
  cityTo: string;
  addressTo: string;
};

type DpdData = {
  addressString: string;
  departmentCode: string;
  filterServices: Partial<Record<string, boolean>>;
};

type YaData = {
  detail: {
    address: {
      full_address: string;
    };
    id: string;
  };
};

type FivePostData = {
  id: string;
  name: string;
  fullAddress: string;
  additional: string;
  label: string;
  resultAddress: string;
};

type CarrierData = PostData | DpdData | YaData | FivePostData;

type UnknownRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === 'object' && value !== null;

function isPostData(data: unknown): data is PostData {
  if (!isRecord(data)) return false;
  return (
    typeof data.indexTo === 'string' &&
    typeof data.cityTo === 'string' &&
    typeof data.addressTo === 'string'
  );
}

function isDpdData(data: unknown): data is DpdData {
  if (!isRecord(data) || !isRecord(data.filterServices)) return false;
  return (
    typeof data.addressString === 'string' &&
    typeof data.departmentCode === 'string'
  );
}

function isYaData(data: unknown): data is YaData {
  if (!isRecord(data) || !isRecord(data.detail)) return false;
  const detail = data.detail as UnknownRecord;
  if (!isRecord(detail.address)) return false;
  return (
    typeof detail.address.full_address === 'string' &&
    typeof detail.id === 'string'
  );
}

function isFivePostData(data: unknown): data is FivePostData {
  if (!isRecord(data)) return false;
  return (
    typeof data.id === 'string' &&
    typeof data.name === 'string' &&
    typeof data.fullAddress === 'string'
  );
}
