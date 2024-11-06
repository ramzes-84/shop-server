export class InTransitOrders {
  'orders': InTransitOrderItem[];
}

export class InTransitOrderItem {
  id: number;
  current_state: '4' | '908';
  reference: string;
  date_upd: string;
}
