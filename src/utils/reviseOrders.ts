import { BxbParselStatus } from 'src/bxb/dto/bxb.dto';
import { InTransitOrderItem } from 'src/shop/dto/in-transit-orders.dto';
import { RecentBxbParcelsType, UnifiedOrderState } from 'src/types/common';
import {
  YaOrderInfoRes,
  YaParcelStatus,
  YaRecentParcelsRes,
} from 'src/ya/dto/ya.dto';

// deprecated
export function reviseOrders(
  inTransitOrders: InTransitOrderItem[],
  recentYaParcels: YaRecentParcelsRes,
  recentBxbParcels: RecentBxbParcelsType[],
): string[] {
  const updates: string[] = [];
  const warnings: string[] = [];
  const errors: string[] = [];
  const unifiedInTransitOrders = unifyOrderStatus(inTransitOrders);
  const unifiedRecentParcelsData = unifyRecentParcelsData([
    ...recentYaParcels.requests,
    ...recentBxbParcels,
  ]);

  unifiedInTransitOrders.forEach((order) => {
    const currReference = order.reference;
    if (currReference in unifiedRecentParcelsData) {
      if (order.current_state !== unifiedRecentParcelsData[order.reference]) {
        updates.push(
          `${order.reference}:  ${order.current_state}  ⏩  ${unifiedRecentParcelsData[order.reference]}.`,
        );
      }
    }

    if (
      order.current_state === UnifiedOrderState.WAITING &&
      Date.now() - 86400000 * 5 > order.date_upd
    ) {
      warnings.push(
        `⌛ ${order.reference} is waiting more than 5 days (since ${new Date(order.date_upd).toDateString()}).`,
      );
    }
  });

  const problems = Object.entries(unifiedRecentParcelsData)
    .filter(([, state]) => state === UnifiedOrderState.PROBLEM)
    .map(([ref]) => ref);
  if (problems.length) {
    errors.push(
      `❌ There might be problems with following parcels: ${problems.join(', ')}.`,
    );
  }

  return [...updates, ...warnings, ...errors];
}

// deprecated
function unifyRecentParcelsData(
  data: (YaOrderInfoRes | RecentBxbParcelsType)[],
): Record<string, UnifiedOrderState> {
  const unifiedData: Record<string, UnifiedOrderState> = {};
  data.forEach((order) => {
    if ('request_id' in order) {
      const reference = order.request.info.operator_request_id;
      let state: UnifiedOrderState;

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
        case YaParcelStatus.DELIVERY_AT_START_SORT:
        case YaParcelStatus.DELIVERY_TRANSPORTATION:
          state = UnifiedOrderState.IN_TRANSIT;
          break;

        case YaParcelStatus.DELIVERY_ARRIVED_PICKUP_POINT:
        case YaParcelStatus.DELIVERY_STORAGE_PERIOD_EXTENDED:
        case YaParcelStatus.CONFIRMATION_CODE_RECEIVED:
          state = UnifiedOrderState.WAITING;
          break;

        case YaParcelStatus.DELIVERY_TRANSMITTED_TO_RECIPIENT:
        case YaParcelStatus.PARTICULARLY_DELIVERED:
        case YaParcelStatus.DELIVERY_DELIVERED:
        case YaParcelStatus.FINISHED:
          state = UnifiedOrderState.DELIVERED;
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
          state = UnifiedOrderState.PROBLEM;
          break;

        default:
          state = UnifiedOrderState.UNKNOWN;

          break;
      }

      unifiedData[reference] = state;
    } else if ('imId' in order) {
      const reference = order.imId;
      let state: UnifiedOrderState;

      switch (order.status.Name) {
        case BxbParselStatus.LoadedRegistry:
        case BxbParselStatus.OrderTransferredForDelivery:
        case BxbParselStatus.SentToSortingTerminal:
        case BxbParselStatus.TransferredForSorting:
        case BxbParselStatus.SentToDestinationCity:
        case BxbParselStatus.AcceptedForDelivery:
        case BxbParselStatus.TransferredForDeliveryToPickupPoint:
        case BxbParselStatus.InRecipientCity:
        case BxbParselStatus.AtRecipientBranch:
        case BxbParselStatus.EnRouteFromBranchToTerminal:
        case BxbParselStatus.EnRouteToTerminal:
        case BxbParselStatus.AtSenderTerminal:
        case BxbParselStatus.TransferredForCourierDelivery:
        case BxbParselStatus.CourierWillCall:
          state = UnifiedOrderState.IN_TRANSIT;
          break;

        case BxbParselStatus.ArrivedAtPickupPoint:
          state = UnifiedOrderState.WAITING;
          break;

        case BxbParselStatus.Issued:
          state = UnifiedOrderState.DELIVERED;
          break;

        case BxbParselStatus.PreparingForReturn:
        case BxbParselStatus.SentToReceivingPoint:
        case BxbParselStatus.ReturnedToReceivingPoint:
        case BxbParselStatus.ReturnedToIM:
        case BxbParselStatus.CustomProblem:
          state = UnifiedOrderState.PROBLEM;
          break;

        default:
          state = UnifiedOrderState.UNKNOWN;
          break;
      }

      unifiedData[reference] = state;
    }
  });
  return unifiedData;
}

// deprecated
function unifyOrderStatus(inTransitOrders: InTransitOrderItem[]) {
  return inTransitOrders.map((order) => {
    switch (order.current_state) {
      case '4':
        return {
          ...order,
          current_state: UnifiedOrderState.IN_TRANSIT,
          date_upd: Date.parse(order.date_upd),
        };
      case '908':
        return {
          ...order,
          current_state: UnifiedOrderState.WAITING,
          date_upd: Date.parse(order.date_upd),
        };
      default:
        return;
    }
  });
}
