import { calcDiscount, convertOrder } from './convertOrder';
import { CreateYaOrderDto } from 'src/ya/dto/ya.dto';
import {
  addressDetails,
  customerDetails,
  orderDetails,
  shippingDetails,
} from 'src/__test-data__/shop-data';
import { orderConverterResult } from 'src/__test-data__/converter-result';

const destination = 'destination123';
const sourcePlatformId = 'source-platform-123';

describe('convertOrder', () => {
  it('should use the configured source platform ID', () => {
    const newOrderDetails = { ...orderDetails };
    newOrderDetails.current_state = '12';

    const result = convertOrder(
      newOrderDetails,
      addressDetails,
      customerDetails,
      shippingDetails.order_carriers[0],
      destination,
      sourcePlatformId,
    );

    expect(result).toEqual<CreateYaOrderDto>({
      ...orderConverterResult,
      source: { platform_station: { platform_id: sourcePlatformId } },
    });
  });

  it('should not derive the source platform from order status', () => {
    const newOrderDetails = { ...orderDetails };
    newOrderDetails.current_state = '5';

    const result = convertOrder(
      newOrderDetails,
      addressDetails,
      customerDetails,
      shippingDetails.order_carriers[0],
      destination,
      sourcePlatformId,
    );

    expect(result).toEqual<CreateYaOrderDto>({
      ...orderConverterResult,
      source: { platform_station: { platform_id: sourcePlatformId } },
    });
  });

  it('should use the configured source platform for any order status', () => {
    const result = convertOrder(
      orderDetails,
      addressDetails,
      customerDetails,
      shippingDetails.order_carriers[0],
      destination,
      sourcePlatformId,
    );

    expect(result).toEqual<CreateYaOrderDto>({
      ...orderConverterResult,
      source: { platform_station: { platform_id: sourcePlatformId } },
    });
  });

  it('should handle zero discounts correctly', () => {
    const newOrderDetails = { ...orderDetails };
    newOrderDetails.total_discounts = '0';

    const result = convertOrder(
      newOrderDetails,
      addressDetails,
      customerDetails,
      shippingDetails.order_carriers[0],
      destination,
      sourcePlatformId,
    );

    expect(result.items[0].billing_details.unit_price).toEqual(
      parseFloat(
        newOrderDetails.associations.order_rows[0].unit_price_tax_excl,
      ) * 100,
    );
  });
});

describe('calcDiscount', () => {
  it('should return correct discount value', () => {
    const total = '100';
    const discount = '10';
    const result = calcDiscount(total, discount);
    expect(result).toBe(0.1);
  });

  it('should return zero when discount is zero', () => {
    const total = '100';
    const discount = '0';
    const result = calcDiscount(total, discount);
    expect(result).toBe(0);
  });

  it('should handle large numbers correctly', () => {
    const total = '1000000';
    const discount = '500000';
    const result = calcDiscount(total, discount);
    expect(result).toBe(0.5);
  });

  it('should handle small numbers correctly', () => {
    const total = '0.01';
    const discount = '0.005';
    const result = calcDiscount(total, discount);
    expect(result).toBe(0.5);
  });
});
