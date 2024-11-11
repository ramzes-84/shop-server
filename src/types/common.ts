import { StatusItem } from 'src/bxb/dto/bxb.dto';

export type RecentBxbParcelsType = {
  imId: string;
  status: StatusItem;
};

export class TransferInterface {
  ok: boolean;
  data: any;
}

export class RevisingOrderData {
  id: number;
  reference: string;
  track: string;
  cargo: Cargos;
  unifiedShopState: UnifiedOrderState;
  shopStateUpdatedAt: number;
  unifiedCargoState?: UnifiedOrderState;
  actualCargoState?: string;
  client?: {
    name: string;
    phone: number;
    email: string;
  };
}

export enum UnifiedOrderState {
  DELIVERED = 'DELIVERED',
  WAITING = 'WAITING',
  IN_TRANSIT = 'IN_TRANSIT',
  PROBLEM = 'PROBLEM',
  RETURNING = 'RETURNING',
  UNKNOWN = 'UNKNOWN',
}

export enum Cargos {
  YA = 'YA',
  POST = 'POST',
  BXB = 'BXB',
  DPD = 'DPD',
}
