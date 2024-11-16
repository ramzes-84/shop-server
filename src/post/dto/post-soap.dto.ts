export class PostSoapResDTO {
  OperationHistoryData: OperationHistoryData;
}

export class OperationHistoryData {
  historyRecord: HistoryRecord[];
}

export class HistoryRecord {
  AddressParameters: AddressParameters;
  FinanceParameters: FinanceParameters;
  ItemParameters: ItemParameters;
  OperationParameters: OperationParameters;
  UserParameters: UserParameters;
}

export class AddressParameters {
  DestinationAddress: DestinationAddress;
  OperationAddress: OperationAddress;
  MailDirect: MailDirect;
  CountryFrom: CountryFrom;
  CountryOper: CountryOper;
}

export class DestinationAddress {
  Index: string;
  Description: string;
}

export class OperationAddress {
  Index: string;
  Description: string;
}

export class MailDirect {
  Id: number;
  Code2A: string;
  Code3A: string;
  NameRU: string;
  NameEN: string;
}

export class CountryFrom {
  Id: number;
  Code2A: string;
  Code3A: string;
  NameRU: string;
  NameEN: string;
}

export class CountryOper {
  Id: number;
  Code2A: string;
  Code3A: string;
  NameRU: string;
  NameEN: string;
}

export class FinanceParameters {
  Payment?: number;
  Value?: number;
  MassRate?: number;
  InsrRate?: number;
  CustomDuty: number;
}

export class ItemParameters {
  Barcode: string;
  ValidRuType: boolean;
  ValidEnType: boolean;
  ComplexItemName: string;
  MailRank: MailRank;
  PostMark?: PostMark;
  MailType: MailType;
  MailCtg: MailCtg;
  Mass?: number;
}

export class MailRank {
  Id: number;
  Name: string;
}

export class PostMark {
  Id: number;
  Name: string;
}

export class MailType {
  Id: number;
  Name: string;
}

export class MailCtg {
  Id: number;
  Name: string;
}

export class OperationParameters {
  OperType: OperType;
  OperAttr: OperAttr;
  OperDate: string;
}

export class OperType {
  Id: number;
  Name: string;
}

export class OperAttr {
  Id: number;
  Name?: string;
}

export class UserParameters {
  SendCtg?: SendCtg;
  Sndr: string;
  Rcpn: string;
}

export class SendCtg {
  Id: number;
  Name: string;
}

export enum PostParcelStatus {
  Batch = 'Партионный',
  LeftAcceptancePoint = 'Покинуло место приёма',
  ArrivedAtSortingCenter = 'Прибыло в сортировочный центр',
  Sorting = 'Сортировка',
  LeftSortingCenter = 'Покинуло сортировочный центр',
  AwaitingCourierDelivery = 'Ожидает курьерской доставки',
  ParcelLockerReserved = 'Ячейка почтомата забронирована',
  HandedToCourier = 'Передано курьеру (водителю)',
  SentToPickupPoint = 'Направлено в пункт выдачи',
  ArrivedAtDeliveryPoint = 'Прибыло в место вручения',
  ArrivedAtParcelLocker = 'Прибыло в почтомат',
  DeliveredToRecipient = 'Вручение адресату',
  DeliveredViaParcelLocker = 'Выдано адресату через почтомат',
  Undefined = 'undefined',
}
