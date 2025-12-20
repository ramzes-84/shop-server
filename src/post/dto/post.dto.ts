export enum PostEndpoints {
  SHIPMENT_SEARCH = '/shipment/search',
}

export type PostParcelResDTO = PostParcelData[];

export class PostParcelData {
  'add-to-mmo': boolean;
  'address-type-from': string;
  'address-type-to': string;
  'area-to': string;
  'arrival-date': string;
  barcode: string;
  'batch-category': string;
  'batch-name': string;
  'batch-status': string;
  'completeness-checking': boolean;
  'delivery-time': DeliveryTime;
  dimension: Dimension;
  'easy-return-recipient-payment': boolean;
  'ground-rate': number;
  'ground-rate-with-vat': number;
  'ground-rate-wo-vat': number;
  'house-from': string;
  'house-to': string;
  'human-operation-name': string;
  id: number;
  'in-mmo': boolean;
  'index-from': string;
  'index-to': number;
  'insr-rate': number;
  'insr-rate-with-vat': number;
  'insr-rate-wo-vat': number;
  'insr-value': number;
  'is-size': number;
  'last-oper-attr': string;
  'last-oper-date': string;
  'last-oper-type': string;
  'legal-hid': string;
  'mail-category': string;
  'mail-direct': number;
  'mail-rank': string;
  'mail-type': string;
  'manual-address-input': boolean;
  mass: number;
  'mass-rate': number;
  'mass-rate-with-vat': number;
  'mass-rate-wo-vat': number;
  'order-num': string;
  payment: number;
  'payment-method': string;
  'place-from': string;
  'place-to': string;
  'pochtaid-hid': string;
  postmarks: string[];
  'postoffice-code': string;
  'pre-postal-preparation': boolean;
  'recipient-name': string;
  'region-from': string;
  'region-to': string;
  'renewal-shelf-life': boolean;
  'returned-partial': boolean;
  'room-to': string;
  'sms-notice-recipient': number;
  'sms-notice-recipient-rate-with-vat': number;
  'sms-notice-recipient-rate-wo-vat': number;
  'str-index-to': string;
  'street-from': string;
  'street-to': string;
  'tariff-type': string;
  'tel-address': number;
  'tel-address-from': number;
  'total-rate-wo-vat': number;
  'total-vat': number;
  'track-by-group': number;
  'transport-type': string;
  version: number;
  'weight-pay': number;
  'weight-volume': number;
}

class DeliveryTime {
  'max-days': number;
}

class Dimension {
  height: number;
  length: number;
  width: number;
}

export enum PostParselStatusType {
  GIVING = 'GIVING',
  PROCESSING = 'PROCESSING',
}
