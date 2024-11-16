export class DpdStatesResDTO {
  return: {
    docId: number;
    docDate: string;
    clientNumber: number;
    resultComplete: boolean;
    states: DpdStateItem[];
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
