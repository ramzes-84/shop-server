export class OrderCarrierInfoResDto {
  order_carrier: OrderCarrierInfo;
}

class OrderCarrierInfo {
  id: number;
  id_order: string;
  id_carrier: string;
  id_order_invoice: string;
  weight: string;
  shipping_cost_tax_excl: string;
  shipping_cost_tax_incl: string;
  date_add: string;
}
