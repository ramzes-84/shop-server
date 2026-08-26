export interface GetOrderStatusRequestItem {
  senderOrderId?: string;
  orderId?: string;
}

export interface GetOrderStatusResponseItem {
  status: string;
  orderId?: string;
  senderOrderId?: string;
  executionStatus?: string;
  changeDate?: string;
  errorDesc?: string;
}
