/** Тело запроса POST /api/v1/orders/c2c — сдача заказа в пункте 5Post, без склада отправителя. */
export interface CreateFivePostC2COrderRequest {
  senderOrderId: string;
  clientOrderId: string;
  receiverLocation: string;
  receiverClientName: string;
  receiverClientPhone: string;
  receiverClientEmail?: string;
  senderClientEmail: string;
  senderClientPhone: string;
  cargo: {
    senderCargoId: string;
    height: number;
    length: number;
    width: number;
    weight: number;
    price: number;
    productValues: Array<{
      name: string;
      value: number;
      price: number;
      vat: -1;
      vendorCode?: string;
    }>;
  };
  cost: {
    paymentType: 'PREPAYMENT';
    price: number;
  };
}

export interface CreateFivePostOrderResponse {
  created: boolean;
  orderId?: string;
  senderOrderId: string;
  cargoes: Array<{
    cargoId?: string;
    senderCargoId: string;
    barcode: string;
  }>;
  // Присутствует, когда 5Post отвечает 200, но created: false (см. раздел 7.2 API 5Post).
  errors?: Array<{
    code: number;
    message: string;
  }>;
}
