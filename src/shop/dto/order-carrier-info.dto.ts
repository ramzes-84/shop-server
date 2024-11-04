export class OrderCarrierInfoResDto {
  order_carriers: OrderCarrierInfo[];
}

export class OrderCarrierInfo {
  id: number;
  id_order: string;
  id_carrier: string;
  id_order_invoice: string;
  weight: string;
  shipping_cost_tax_excl: string;
  shipping_cost_tax_incl: string;
  tracking_number: string;
  date_add: string;
}
