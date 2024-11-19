import { BxbParselStatus } from 'src/bxb/dto/bxb.dto';
import { DpdParselStatus } from 'src/dpd/dto/dpd.dto';
import { PostParcelStatus } from 'src/post/dto/post-soap.dto';
import { UnifiedOrderState } from 'src/types/common';
import { YaParcelStatus } from 'src/ya/dto/ya.dto';

export function unifyParcelStatus(status: string) {
  switch (status) {
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
    case DpdParselStatus.OnTerminal:
    case DpdParselStatus.OnTerminalPickup:
    case DpdParselStatus.OnRoad:
    case DpdParselStatus.Delivering:
    case PostParcelStatus.Batch:
    case PostParcelStatus.ArrivedAtSortingCenter:
    case PostParcelStatus.AwaitingCourierDelivery:
    case PostParcelStatus.HandedToCourier:
    case PostParcelStatus.LeftAcceptancePoint:
    case PostParcelStatus.LeftSortingCenter:
    case PostParcelStatus.ParcelLockerReserved:
    case PostParcelStatus.SentToPickupPoint:
    case PostParcelStatus.Sorting:
      return UnifiedOrderState.IN_TRANSIT;

    case YaParcelStatus.DELIVERY_ARRIVED_PICKUP_POINT:
    case YaParcelStatus.DELIVERY_STORAGE_PERIOD_EXTENDED:
    case YaParcelStatus.CONFIRMATION_CODE_RECEIVED:
    case BxbParselStatus.ArrivedAtPickupPoint:
    case DpdParselStatus.OnTerminalDelivery:
    case PostParcelStatus.ArrivedAtDeliveryPoint:
    case PostParcelStatus.ArrivedAtParcelLocker:
      return UnifiedOrderState.WAITING;

    case YaParcelStatus.DELIVERY_TRANSMITTED_TO_RECIPIENT:
    case YaParcelStatus.PARTICULARLY_DELIVERED:
    case YaParcelStatus.DELIVERY_DELIVERED:
    case YaParcelStatus.FINISHED:
    case BxbParselStatus.Issued:
    case DpdParselStatus.Delivered:
    case PostParcelStatus.DeliveredToRecipient:
    case PostParcelStatus.DeliveredViaParcelLocker:
    case PostParcelStatus.DeliveredToRecipientByPEP:
      return UnifiedOrderState.DELIVERED;

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
    case BxbParselStatus.PreparingForReturn:
    case BxbParselStatus.SentToReceivingPoint:
    case BxbParselStatus.ReturnedToReceivingPoint:
    case BxbParselStatus.ReturnedToIM:
    case BxbParselStatus.CustomProblem:
    case DpdParselStatus.NewOrderByDPD:
    case DpdParselStatus.NewOrderByClient:
    case DpdParselStatus.ReturnedFromDelivery:
    case DpdParselStatus.NotDone:
    case DpdParselStatus.Lost:
    case DpdParselStatus.Problem:
    case PostParcelStatus.Undefined:
      return UnifiedOrderState.PROBLEM;

    default:
      return UnifiedOrderState.UNKNOWN;
  }
}

export function unifyShopState(state: '4' | '908'): UnifiedOrderState {
  switch (state) {
    case '4':
      return UnifiedOrderState.IN_TRANSIT;
    case '908':
      return UnifiedOrderState.WAITING;
    default:
      throw new Error('Unknown shop state');
  }
}
