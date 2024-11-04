import { InTransitOrderItem } from 'src/shop/dto/in-transit-orders.dto';
import {
  YaOrderInfoRes,
  YaParcelStatus,
  YaRecentParcelsRes,
} from 'src/ya/dto/ya.dto';

export function reviseOrders(
  inTransitOrders: InTransitOrderItem[],
  recentParcels: YaRecentParcelsRes,
): string[] {
  const message: string[] = [];
  const unifiedInTransitOrders = unifyOrderStatus(inTransitOrders);
  const unifiedRecentParcelsData = unifyRecentParcelsData([
    ...recentParcels.requests,
  ]);

  unifiedInTransitOrders.forEach((order) => {
    const currReference = order.reference;
    if (currReference in unifiedRecentParcelsData) {
      if (order.current_state !== unifiedRecentParcelsData[order.reference]) {
        message.push(
          `${order.reference}: ${order.current_state} ⏩ ${unifiedRecentParcelsData[order.reference]}.`,
        );
      }
    }
  });

  return message;
}

function unifyRecentParcelsData(
  data: (YaOrderInfoRes | { other_cargo: string })[],
): Record<string, UnifiedOrdersStateData> {
  const unifiedData: Record<string, UnifiedOrdersStateData> = {};
  data.forEach((order) => {
    if ('request_id' in order) {
      const reference = order.request.info.operator_request_id;
      let state: UnifiedOrdersStateData;

      switch (order.state.status) {
        case YaParcelStatus.DRAFT:
        case YaParcelStatus.VALIDATING:
        case YaParcelStatus.CREATED:
        case YaParcelStatus.DELIVERY_PROCESSING_STARTED:
        case YaParcelStatus.DELIVERY_TRACK_RECEIVED:
        case YaParcelStatus.SORTING_CENTER_PROCESSING_STARTED:
        case YaParcelStatus.SORTING_CENTER_TRACK_RECEIVED:
        case YaParcelStatus.SORTING_CENTER_TRACK_LOADED:
        case YaParcelStatus.DELIVERY_LOADED:
        case YaParcelStatus.SORTING_CENTER_LOADED:
        case YaParcelStatus.SORTING_CENTER_AT_START:
        case YaParcelStatus.SORTING_CENTER_PREPARED:
        case YaParcelStatus.SORTING_CENTER_TRANSMITTED:
        case YaParcelStatus.DELIVERY_AT_START:
        case YaParcelStatus.DELIVERY_TRANSPORTATION:
          state = UnifiedOrdersStateData.IN_TRANSIT;
          break;

        case YaParcelStatus.DELIVERY_ARRIVED_PICKUP_POINT:
        case YaParcelStatus.DELIVERY_STORAGE_PERIOD_EXTENDED:
        case YaParcelStatus.CONFIRMATION_CODE_RECEIVED:
          state = UnifiedOrdersStateData.WAITING;
          break;

        case YaParcelStatus.DELIVERY_TRANSMITTED_TO_RECIPIENT:
        case YaParcelStatus.PARTICULARLY_DELIVERED:
        case YaParcelStatus.DELIVERY_DELIVERED:
        case YaParcelStatus.FINISHED:
          state = UnifiedOrdersStateData.DELIVERED;
          break;

        case YaParcelStatus.VALIDATING_ERROR:
        case YaParcelStatus.DELIVERY_STORAGE_PERIOD_EXPIRED:
        case YaParcelStatus.CANCELLED:
        case YaParcelStatus.CANCELLED_BY_RECIPIENT:
        case YaParcelStatus.CANCELLED_USER:
        case YaParcelStatus.CANCELLED_IN_PLATFORM:
        case YaParcelStatus.SORTING_CENTER_CANCELLED:
        case YaParcelStatus.CANCELED_IN_PLATFORM:
        case YaParcelStatus.SORTING_CENTER_RETURN_PREPARING:
        case YaParcelStatus.SORTING_CENTER_RETURN_PREPARING_SENDER:
        case YaParcelStatus.SORTING_CENTER_RETURN_ARRIVED:
        case YaParcelStatus.SORTING_CENTER_RETURN_RETURNED:
        case YaParcelStatus.RETURN_TRANSPORTATION_STARTED:
        case YaParcelStatus.RETURN_ARRIVED_DELIVERY:
        case YaParcelStatus.RETURN_READY_FOR_PICKUP:
        case YaParcelStatus.RETURN_RETURNED:
          state = UnifiedOrdersStateData.PROBLEM;
          break;

        default:
          break;
      }

      unifiedData[reference] = state;
    }
  });
  return unifiedData;
}

function unifyOrderStatus(inTransitOrders: InTransitOrderItem[]) {
  return inTransitOrders.map((order) => {
    switch (order.current_state) {
      case '4':
        return { ...order, current_state: UnifiedOrdersStateData.IN_TRANSIT };
      case '908':
        return { ...order, current_state: UnifiedOrdersStateData.WAITING };
      default:
        return;
    }
  });
}

enum UnifiedOrdersStateData {
  DELIVERED = 'DELIVERED',
  WAITING = 'WAITING',
  IN_TRANSIT = 'IN_TRANSIT',
  PROBLEM = 'PROBLEM',
}
