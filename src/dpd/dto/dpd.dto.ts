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
  return: {
    orderNumberInternal?: string;
    orderNum?: string;
    status?: string;
    pickupDate?: string;
    dateFlag?: number;
    errorMessage?: string;
  };
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

export enum DpdSourceTerminal {
  RND = '2N83',
  TUL = '095H',
}

export class DpdRequestDTO<T> {
  request: T;
}

export class TrackingRequest {
  auth: { clientNumber: number; clientKey: string };
  dpdOrderNr: string;
}

export class CreatingOrderRequest {
  auth: { clientNumber: number; clientKey: string };
  header: {
    datePickup: string;
    senderAddress: DpdAddress;
    pickupTimePeriod: string;
  };
  order: {
    orderNumberInternal: string;
    serviceCode: string;
    serviceVariant: string;
    cargoNumPack: number;
    cargoWeight: string;
    cargoVolume: string;
    cargoRegistered: boolean;
    cargoValue?: number;
    cargoCategory: string;
    receiverAddress: DpdAddress;
    extraService: ExtraService[];
  }[];
}

type DpdAddress = {
  code?: string;
  name: string;
  terminalCode: DpdSourceTerminal | string;
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
  contactFio: string;
  contactPhone: string;
  contactEmail: string;
  instructions: string;
  needPass: string;
};

export type ExtraService = Record<string, Record<string, string>>;
