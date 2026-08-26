const deliveryBlock = document.body.querySelector('.delivery-options');

const cargoNames = {
  POST: 'Почтоматы: Почта России (ОПЛАТА СЕЙЧАС НА САЙТЕ)',
  DPD: 'Пункты DPD',
  YANDEX: 'Пункты Яндекс.Маркет (ОПЛАТА СЕЙЧАС НА САЙТЕ)',
  FIVEPOST: '5Post: Пятёрочки и постаматы (ОПЛАТА СЕЙЧАС НА САЙТЕ)',
};

if (document.URL.includes('/order') && deliveryBlock) {
  const allNameLabels = document.body.querySelectorAll('span.carrier-name');
  allNameLabels.forEach((label) => {
    if (
      label instanceof HTMLSpanElement &&
      Object.values(cargoNames).includes(label.innerText)
    ) {
      const cargoRow = label.closest('.delivery-option');
      const linkToMap = document.createElement('div');
      linkToMap.classList.add('map-link');
      const outerScript = document.createElement('script');

      if (label.innerText === cargoNames.POST) {
        linkToMap.innerHTML = 'Карта почтоматов Почты России';
        outerScript.src = 'https://widget.pochta.ru/map/widget/widget.js';
        linkToMap.addEventListener('click', () =>
          openMapPopup(cargoNames.POST),
        );
      }
      if (label.innerText === cargoNames.DPD) {
        linkToMap.innerHTML = 'Карта пунктов DPD';
        outerScript.src =
          'https://chooser.dpd.ru/dpdchooser.js?nocache=1499949132826';
        linkToMap.addEventListener('click', () => openMapPopup(cargoNames.DPD));
      }
      if (label.innerText === cargoNames.YANDEX) {
        linkToMap.innerHTML = 'Карта пунктов Яндекс';
        outerScript.src = 'https://ndd-widget.landpro.site/widget.js';
        linkToMap.addEventListener('click', () =>
          openMapPopup(cargoNames.YANDEX),
        );
      }
      if (label.innerText === cargoNames.FIVEPOST) {
        linkToMap.innerHTML = 'Карта пунктов 5Post';
        outerScript.src = 'https://fivepost.ru/static/5post-widget-v1.0.js';
        linkToMap.addEventListener('click', () =>
          openMapPopup(cargoNames.FIVEPOST),
        );
      }

      document.body.append(outerScript);
      if (cargoRow) {
        cargoRow.append(linkToMap);
      }
    }
  });
}

// Вызывается по имени из inline-скриптов виджетов — статический анализ этого не видит.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const addAddressToMsg = function (data: CarrierData) {
  const textarea = document.body.querySelector('#delivery_message');
  const btn = document.querySelector('.map-popup-close');

  if (!textarea || !(textarea instanceof HTMLTextAreaElement)) return;

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
    console.log(data);
  }

  const formattedText = Array.from(new Set(textarea.value.split('\n'))).join(
    '\n',
  );

  textarea.value = formattedText;
  if (btn && btn instanceof HTMLButtonElement) {
    btn.innerText = 'Адрес записан в комментарий! Закрыть';
    btn.classList.add('popup-bg-green');
  }
};

const closePopup = function (e: Event) {
  if (e instanceof Event) {
    if (e.target instanceof HTMLButtonElement) e.stopPropagation();
    document.body.classList.remove('freeze-body');
    const popupContainer = document.body.querySelector('.map-popup-container');
    if (popupContainer) {
      popupContainer.remove();
    }
  }
};

const buildPostWidgetScript = (widgetId: string) =>
  `ecomStartWidget({id: 37439, callbackFunction: addAddressToMsg, containerId: '${widgetId}'})`;

const buildDpdWidgetScript = (chooserId: string, consoleId: string) => `
var chooser = new DPDChooser("${chooserId}", {type: "dpdclient", address: "Тула", choose: 1, sid: "JCUlLSUlLSElLGkkUSJXUyUlJSZQVlNQUCImJVciIyMgLVdWIVYjJlQnIywkJS1RJCEiEg=="});
chooser.onError(function (error, code) {
  document.getElementById("${consoleId}").innerHTML = "Ошибка чузера (" + error + ") код " + code + "<br>";
});
chooser.onReady(function (address) {
  document.getElementById("${consoleId}").innerHTML = "Чузер готов. Адрес: " + address + "<br>";
});
chooser.onChoose(function (dep) {
  addAddressToMsg(dep);
});
`;

const buildYaWidgetScript = (containerId: string) => `
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
  addAddressToMsg(data);
}, true);
`;

const buildFivePostWidgetScript = (mapId: string, infoId: string) => `
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
        addAddressToMsg(point);
        const pointInfoContainer = document.getElementById('${infoId}');

        if (!pointInfoContainer) {
          return;
        }

        if (point) {
          pointInfoContainer.innerHTML = '<span>' + point.label + ' <b> Адрес:</b> ' + point.resultAddress + '</span>' +
            (point.additional ? '<span> <b>Местонахождение:</b> ' + point.additional + '</span>' : '');
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

const openMapPopup = function (carrierName: string) {
  const textArea = document.body.querySelector('#delivery_message');
  const isTextareaEmpty =
    textArea instanceof HTMLTextAreaElement && textArea.value.length === 0;
  document.body.classList.add('freeze-body');

  const popupContainer = document.createElement('div');
  popupContainer.className = 'map-popup-container';

  const popupContent = document.createElement('div');
  popupContent.className = 'map-popup-content';

  const mapContainer = document.createElement('div');

  const customScript = document.createElement('script');

  switch (carrierName) {
    case cargoNames.POST: {
      popupContainer.addEventListener('click', (e) => closePopup(e));
      mapContainer.id = 'ecom-widget';
      customScript.innerText = buildPostWidgetScript(mapContainer.id);
      break;
    }
    case cargoNames.DPD: {
      popupContainer.addEventListener('click', (e) => closePopup(e));
      mapContainer.id = 'dpdchooser';
      customScript.innerText = buildDpdWidgetScript(mapContainer.id, 'console');
      break;
    }
    case cargoNames.YANDEX: {
      const yaDostavkaContainer = document.createElement('div');
      yaDostavkaContainer.id = 'delivery-widget';
      mapContainer.className = 'ya-content';
      mapContainer.append(yaDostavkaContainer);
      customScript.innerText = buildYaWidgetScript(yaDostavkaContainer.id);
      break;
    }
    case cargoNames.FIVEPOST: {
      mapContainer.className = 'five-post-content';
      const fivePostMapContainer = document.createElement('div');
      fivePostMapContainer.id = `fivepost-map-${Date.now()}`;
      fivePostMapContainer.style.width = '100%';
      fivePostMapContainer.style.height = '500px';
      const fivePostTextContainer = document.createElement('div');
      fivePostTextContainer.id = `fivepost-info-${Date.now()}`;
      fivePostTextContainer.innerText = 'Выберите пункт выдачи';
      mapContainer.append(fivePostMapContainer, fivePostTextContainer);
      customScript.innerText = buildFivePostWidgetScript(
        fivePostMapContainer.id,
        fivePostTextContainer.id,
      );
      break;
    }
    default:
      break;
  }

  const closePopupBtn = document.createElement('button');
  closePopupBtn.className = 'map-popup-close';
  closePopupBtn.innerText = isTextareaEmpty
    ? 'Закрыть без сохранения пункта'
    : 'Закрыть';
  closePopupBtn.addEventListener('click', (e) => closePopup(e));

  mapContainer.append(customScript);
  popupContent.append(mapContainer, closePopupBtn);
  popupContainer.append(popupContent);
  document.body.append(popupContainer);

  if (carrierName === cargoNames.DPD) {
    const mapConsole = document.createElement('div');
    mapConsole.id = 'console';
    closePopupBtn.before(mapConsole);
  }
};

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
