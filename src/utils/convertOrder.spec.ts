import { calcDiscount, convertOrder, convertOrderToDpd } from './convertOrder';
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

describe('convertOrderToDpd', () => {
  const destination = 'terminal-code-321';
  const sourceTerminalId = 'source-terminal-777';

  beforeEach(() => {
    process.env.SHOP_NAME = 'Mineral Magic';
    process.env.SHOP_OWNER = 'Иванова Мария';
    process.env.SHOP_PHONE = '79000000001';
    process.env.MAIL_ADMIN = 'admin@mineralmagic.ru';
    delete process.env.DPD_CARGO_CATEGORY;
  });

  it('builds a request matching the createOrder2 schema using the configured source terminal', () => {
    const result = convertOrderToDpd(
      orderDetails,
      addressDetails,
      customerDetails,
      shippingDetails.order_carriers[0],
      destination,
      sourceTerminalId,
    );

    expect(result.header.senderAddress).toEqual(
      expect.objectContaining({
        name: 'Mineral Magic',
        terminalCode: sourceTerminalId,
        contactFio: 'Иванова Мария',
        contactPhone: '79000000001',
        contactEmail: 'admin@mineralmagic.ru',
      }),
    );
    expect(result.order[0]).toEqual(
      expect.objectContaining({
        orderNumberInternal: 'TESTREFERENCE',
        serviceVariant: 'ТТ',
        cargoWeight: 0.153,
        cargoRegistered: false,
        cargoValue: 2729.97,
        cargoCategory: 'Косметика',
        receiverAddress: expect.objectContaining({
          name: 'Doe John',
          terminalCode: destination,
          contactFio: 'Doe John',
          contactPhone: '79000000000',
          contactEmail: 'test@test.com',
        }),
      }),
    );
    expect(result.order[0].unitLoad).toEqual([
      { descript: 'Основа', count: 1, declared_value: '1349.99' },
      { descript: 'Румяна', count: 1, declared_value: '579.99' },
      { descript: 'Пудра', count: 1, declared_value: '799.99' },
    ]);
  });

  it('respects a configured cargo category', () => {
    process.env.DPD_CARGO_CATEGORY = 'Минеральная пудра';

    const result = convertOrderToDpd(
      orderDetails,
      addressDetails,
      customerDetails,
      shippingDetails.order_carriers[0],
      destination,
      sourceTerminalId,
    );

    expect(result.order[0].cargoCategory).toBe('Минеральная пудра');
  });

  it('does not add a НПП extraService when the order is fully paid', () => {
    const result = convertOrderToDpd(
      orderDetails,
      addressDetails,
      customerDetails,
      shippingDetails.order_carriers[0],
      destination,
      sourceTerminalId,
    );

    expect(result.order[0].extraService).toBeUndefined();
  });

  it('adds a НПП extraService with the outstanding balance when the order is not fully paid', () => {
    const unpaidOrderDetails = {
      ...orderDetails,
      total_paid: '2603.470000',
      total_paid_real: '1000.000000',
    };

    const result = convertOrderToDpd(
      unpaidOrderDetails,
      addressDetails,
      customerDetails,
      shippingDetails.order_carriers[0],
      destination,
      sourceTerminalId,
    );

    expect(result.order[0].extraService).toEqual([
      {
        esCode: 'НПП',
        param: [{ name: 'sum_npp', value: '1603.47' }],
      },
    ]);
  });

  it('ignores negligible rounding differences between total_paid and total_paid_real', () => {
    const almostPaidOrderDetails = {
      ...orderDetails,
      total_paid: '2603.470000',
      total_paid_real: '2603.465000',
    };

    const result = convertOrderToDpd(
      almostPaidOrderDetails,
      addressDetails,
      customerDetails,
      shippingDetails.order_carriers[0],
      destination,
      sourceTerminalId,
    );

    expect(result.order[0].extraService).toBeUndefined();
  });

  it('throws when the recipient has no usable phone number', () => {
    const brokenAddress = { ...addressDetails, phone: '', phone_mobile: '' };

    expect(() =>
      convertOrderToDpd(
        orderDetails,
        brokenAddress,
        customerDetails,
        shippingDetails.order_carriers[0],
        destination,
        sourceTerminalId,
      ),
    ).toThrow('В заказе отсутствует телефон получателя');
  });

  it('throws for a non-positive shipment weight', () => {
    const brokenShipping = {
      ...shippingDetails.order_carriers[0],
      weight: '0',
    };

    expect(() =>
      convertOrderToDpd(
        orderDetails,
        addressDetails,
        customerDetails,
        brokenShipping,
        destination,
        sourceTerminalId,
      ),
    ).toThrow('Некорректный вес отправления в заказе');
  });
});
