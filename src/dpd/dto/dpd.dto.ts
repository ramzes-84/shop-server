export class DpdStatesResDTO {
  return: {
    docId: number;
    docDate: string;
    clientNumber: number;
    resultComplete: boolean;
    states: DpdStateItem[];
  };
}

export class DpdCreationResDTO {
  return: DpdOrderResult | DpdOrderResult[];
}

export class DpdOrderResult {
  orderNumberInternal?: string;
  orderNum?: string;
  status: string;
  errorMessage?: string;
  // Только у createOrder2: см. dpdOrderStatus2 в WSDL (order2?xsd=1)
  pickupDate?: string;
  dateFlag?: number;
}

export class DpdStateItem {
  clientOrderNr: string;
  clientParcelNr: string;
  dpdOrderNr: string;
  dpdParcelNr: string;
  pickupDate: string;
  planDeliveryDate: string;
  orderPhysicalWeight: number;
  orderVolume: number;
  orderVolumeWeight: number;
  orderPayWeight: number;
  orderCost: number;
  parcelPhysicalWeight: number;
  parcelVolume: number;
  parcelVolumeWeight: number;
  parcelPayWeight: number;
  parcelLength: number;
  parcelWidth: number;
  parcelHeight: number;
  newState: DpdParselStatus;
  transitionTime: string;
  terminalCode: string;
  terminalCity: string;
  // Соответствуют stateParcel из tracing1-1?xsd=1. Без isReturn нельзя отличить
  // движение к получателю от движения того же newState обратно в магазин.
  dpdOrderReNr?: string;
  dpdParcelReNr?: string;
  isReturn?: boolean;
}

export enum DpdParselStatus {
  OnTerminal = 'OnTerminal',
  OnRoad = 'OnRoad',
  OnTerminalPickup = 'OnTerminalPickup',
  Delivering = 'Delivering',
  OnTerminalDelivery = 'OnTerminalDelivery',
  Delivered = 'Delivered',
  NewOrderByDPD = 'NewOrderByDPD',
  ReturnedFromDelivery = 'ReturnedFromDelivery',
  NotDone = 'NotDone',
  NewOrderByClient = 'NewOrderByClient',
  Lost = 'Lost',
  Problem = 'Problem',
}

export class DpdRequestDTO<T> {
  request: T;
}

export class TrackingRequest {
  auth: { clientNumber: number; clientKey: string };
  dpdOrderNr: string;
}

// Соответствует complexType "dpdOrdersData" из order2?xsd=1 — внешний тег запроса "orders".
export class CreatingOrderRequest {
  auth: { clientNumber: number; clientKey: string };
  header: {
    datePickup: string;
    senderAddress: DpdAddress;
    pickupTimePeriod?: string;
  };
  order: DpdOrder[];
}

export type DpdOrder = {
  orderNumberInternal: string;
  serviceCode: string;
  serviceVariant: string;
  cargoNumPack: number;
  cargoWeight: number;
  cargoVolume?: number;
  cargoRegistered: boolean;
  cargoValue?: number;
  cargoCategory: string;
  receiverAddress: DpdAddress;
  extraService?: DpdExtraService[];
  // Обязателен по 54-ФЗ для отправлений внутри России — без него DPD не сформирует фискальный чек.
  unitLoad: DpdUnitLoad[];
};

type DpdAddress = {
  code?: string;
  name: string;
  terminalCode?: string;
  addressString?: string;
  countryName?: string;
  index?: string;
  region?: string;
  city?: string;
  street?: string;
  streetAbbr?: string;
  house?: string;
  houseKorpus?: string;
  str?: string;
  vlad?: string;
  extraInfo?: string;
  office?: string;
  flat?: string;
  workTimeFrom?: string;
  workTimeTo?: string;
  dinnerTimeFrom?: string;
  dinnerTimeTo?: string;
  contactFio?: string;
  contactPhone?: string;
  contactEmail?: string;
  instructions?: string;
  needPass?: boolean;
};

export type DpdParameter = { name: string; value: string };

export type DpdExtraService = {
  esCode: string;
  param?: DpdParameter[];
};

// Позиция вложения (unitload) — товарная строка заказа для фискального чека DPD.
export type DpdUnitLoad = {
  descript: string;
  count: number;
  article?: string;
  client_code?: string;
  declared_value?: string;
  parcel_num?: string;
  npp_amount?: string;
  vat_percent?: number;
  without_vat?: boolean;
  country_code?: string;
};
