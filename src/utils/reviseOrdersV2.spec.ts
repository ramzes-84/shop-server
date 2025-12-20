import { BxbParselStatus } from 'src/bxb/dto/bxb.dto';
import { DpdParselStatus } from 'src/dpd/dto/dpd.dto';
import { PostParcelStatus } from 'src/post/dto/post-soap.dto';
import { UnifiedOrderState } from 'src/types/common';
import { YaParcelStatus } from 'src/ya/dto/ya.dto';
import { unifyParcelStatus, unifyShopState } from './reviseOrdersV2';

describe('unifyParcelStatus', () => {
  it.each([
    YaParcelStatus.CREATED,
    BxbParselStatus.SentToDestinationCity,
    DpdParselStatus.OnRoad,
    PostParcelStatus.LeftSortingCenter,
  ])('maps %s to IN_TRANSIT', (status) => {
    expect(unifyParcelStatus(status)).toBe(UnifiedOrderState.IN_TRANSIT);
  });

  it.each([
    YaParcelStatus.DELIVERY_ARRIVED_PICKUP_POINT,
    BxbParselStatus.ArrivedAtPickupPoint,
    DpdParselStatus.OnTerminalDelivery,
    PostParcelStatus.ArrivedAtDeliveryPoint,
  ])('maps %s to WAITING', (status) => {
    expect(unifyParcelStatus(status)).toBe(UnifiedOrderState.WAITING);
  });

  it.each([
    YaParcelStatus.DELIVERY_DELIVERED,
    BxbParselStatus.Issued,
    DpdParselStatus.Delivered,
    PostParcelStatus.DeliveredToRecipient,
  ])('maps %s to DELIVERED', (status) => {
    expect(unifyParcelStatus(status)).toBe(UnifiedOrderState.DELIVERED);
  });

  it.each([
    YaParcelStatus.CANCELLED,
    BxbParselStatus.ReturnedToIM,
    DpdParselStatus.Lost,
    PostParcelStatus.Undefined,
  ])('maps %s to PROBLEM', (status) => {
    expect(unifyParcelStatus(status)).toBe(UnifiedOrderState.PROBLEM);
  });

  it('returns UNKNOWN for unlisted statuses', () => {
    expect(unifyParcelStatus('something-else')).toBe(UnifiedOrderState.UNKNOWN);
  });
});

describe('unifyShopState', () => {
  it('maps 4 to IN_TRANSIT', () => {
    expect(unifyShopState('4')).toBe(UnifiedOrderState.IN_TRANSIT);
  });

  it('maps 908 to WAITING', () => {
    expect(unifyShopState('908')).toBe(UnifiedOrderState.WAITING);
  });

  it('throws when state unknown', () => {
    expect(() => unifyShopState('1' as any)).toThrow('Unknown shop state');
  });
});
