export interface CreateFivePostOrdersRequest {
  partnerOrders: CreateFivePostOrder[];
}

export interface CreateFivePostOrder {
  senderOrderId: string;
  clientOrderId: string;
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  senderLocation: string;
  receiverLocation: string;
  undeliverableOption: 'RETURN';
  cost: {
    paymentValue: number;
    paymentCurrency: 'RUB';
    paymentType: 'PREPAYMENT';
    price: number;
    priceCurrency: 'RUB';
  };
  cargoes: [
    {
      senderCargoId: string;
      height: number;
      length: number;
      width: number;
      weight: number;
      price: number;
      currency: 'RUB';
      vat: -1;
      productValues: Array<{
        name: string;
        value: number;
        price: number;
        currency: 'RUB';
        vat: -1;
        vendorCode?: string;
      }>;
    },
  ];
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
