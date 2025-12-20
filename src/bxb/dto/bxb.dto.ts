export type ParcelsStoryDTO = OneParselStory[];

export type OneParselStory = {
  track: string;
  label: string;
  date: string;
  send: boolean;
  barcode: string;
  imid: string;
};

export type OrdersOnBalanceDTO = OneOrderOnBalance[];

export type OneOrderOnBalance = {
  ID: string;
  Status: BxbParselStatus;
  Price: string;
  Delivery_sum: string;
  Payment_sum: string;
};

export enum BxbParselStatus {
  LoadedRegistry = 'Загружен реестр ИМ',
  OrderTransferredForDelivery = 'Заказ передан на доставку',
  SentToSortingTerminal = 'Отправлен на сортировочный терминал',
  TransferredForSorting = 'Передано на сортировку',
  SentToDestinationCity = 'Отправлено в город назначения',
  AcceptedForDelivery = 'Принято к доставке',
  TransferredForDeliveryToPickupPoint = 'Передан на доставку до Пункта выдачи',
  InRecipientCity = 'В городе Получателя',
  AtRecipientBranch = 'На отделении-получателе',
  EnRouteToTerminal = 'В пути на терминал',
  EnRouteFromBranchToTerminal = 'В пути из отделения на терминал',
  AtSenderTerminal = 'На терминале-отправителе',
  TransferredForCourierDelivery = 'Передано на курьерскую доставку',
  CourierWillCall = 'Передан на Курьерскую доставку, курьер позвонит за 30-60 минут до доставки',
  ArrivedAtPickupPoint = 'Поступило в пункт выдачи',
  Issued = 'Выдано',
  PreparingForReturn = 'Готовится к возврату',
  SentToReceivingPoint = 'Отправлено в пункт приема',
  ReturnedToReceivingPoint = 'Возвращено в пункт приема',
  ReturnedToIM = 'Возвращено в ИМ',
  CustomProblem = 'Искусственная проблема',
  Unknown = 'Unknown',
}

export type ListStatusesDTO = StatusItem[] | ListStatusesError;

export type StatusItem = {
  Date: string;
  Name: BxbParselStatus;
};

export type ListStatusesError = {
  err: string;
};

export type CreateBxbParcelDto = {
  token: string;
  method: 'ParselCreate';
  sdata: ParcelInfo;
};

type ParcelInfo = {
  order_id: string;
  price: string; //ОЦЕНОЧНАЯ СТОИМОСТЬ
  payment_sum: string;
  delivery_sum: string;
  vid: '1';
  shop: PointsInfo;
  customer: RecipientInfo;
  items: ParcelItem[];
  weights: ParcelWeight;
  issue: 0;
  sender_name: string;
};

export enum BoxberrySourceStation {
  RND = '03560',
  TUL = '03233',
}

type PointsInfo = {
  name: string;
  name1: BoxberrySourceStation;
};

type RecipientInfo = {
  fio: string;
  phone: string;
  email: string;
};

type ParcelItem = {
  id: string;
  name: string;
  nds: '0';
  price: string;
  quantity: string;
};

type ParcelWeight = {
  weight: string;
  x: string;
  y: string;
  z: string;
};

export type BxbOrderCreationRes = {
  track: string;
  label: string;
};

export type ParcelCostResDTO = {
  price: string;
  price_base: string;
  price_service: string;
  delivery_period: number;
};
