import { Test, TestingModule } from '@nestjs/testing';
import { AppService } from './app.service';
import { ShopService } from './shop/shop.service';
import { YaService } from './ya/ya.service';
import { MailService } from './mail/mail.service';
import { CreateOrderQueries } from './validation/yandex';
import {
  CreateYaOrderDto,
  YaOrderCreationRes,
  YaOrderInfoRes,
} from './ya/dto/ya.dto';
import { convertOrder, convertOrderToDpd } from './utils/convertOrder';
import {
  addressDetails,
  customerDetails,
  orderDetails,
  orderMessages,
  shippingDetails,
} from 'src/__test-data__/shop-data';
import { orderConverterResult } from './__test-data__/converter-result';
import { yaOrderHistory, yaRecentParcels } from './__test-data__/ya-data';
import { CashService } from './cash/cash.service';
import { BotService } from './bot/bot.service';
import { DpdService } from './dpd/dpd.service';
import { PostService } from './post/post.service';
import { FiveService } from './five/five.service';
import { yaOrderInfo } from './__test-data__/ya-order-info';
import { checkDeliveryCost } from './utils/check-delivery-cost';
import { Cargos, RevisingOrderData, UnifiedOrderState } from './types/common';
import { convertOrderShopToCash } from './utils/convert-order-shop-to-cash';
import { generateCashInvoiceMessage } from './utils/messages';
import { findPointId } from './utils/find-point-from-messages';

jest.mock('./utils/convertOrder');
jest.mock('./utils/check-delivery-cost', () => ({
  checkDeliveryCost: jest.fn(),
}));
jest.mock('./utils/convert-order-shop-to-cash', () => ({
  convertOrderShopToCash: jest.fn(),
}));
jest.mock('./utils/messages', () => ({
  generateCashInvoiceMessage: jest.fn(),
}));
jest.mock('./utils/find-point-from-messages', () => ({
  findPointId: jest.fn(),
}));

const checkDeliveryCostMock = checkDeliveryCost as jest.MockedFunction<
  typeof checkDeliveryCost
>;
const convertOrderMock = convertOrder as jest.MockedFunction<
  typeof convertOrder
>;
const convertOrderToDpdMock = convertOrderToDpd as jest.MockedFunction<
  typeof convertOrderToDpd
>;
const convertOrderShopToCashMock =
  convertOrderShopToCash as jest.MockedFunction<typeof convertOrderShopToCash>;
const generateCashInvoiceMessageMock =
  generateCashInvoiceMessage as jest.MockedFunction<
    typeof generateCashInvoiceMessage
  >;
const findPointIdMock = findPointId as jest.MockedFunction<typeof findPointId>;

const buildBasicOrderInfo = () => ({
  orderDetails: { ...orderDetails },
  addressDetails: { ...addressDetails },
  customerDetails: { ...customerDetails },
});

const buildRevisingOrder = (
  overrides: Partial<RevisingOrderData> = {},
): RevisingOrderData => ({
  id: 1,
  reference: 'REF-BASE',
  track: 'TRACK-1',
  cargo: Cargos.YA,
  unifiedShopState: UnifiedOrderState.IN_TRANSIT,
  unifiedCargoState: UnifiedOrderState.IN_TRANSIT,
  actualCargoState: 'In transit',
  shopStateUpdatedAt: Date.now(),
  ...overrides,
});

describe('AppService', () => {
  let service: AppService;
  let shopService: ShopService;
  let yaService: YaService;
  let mailService: MailService;
  let botService: BotService;
  let cashService: CashService;
  let fiveService: any;
  let postService: any;
  let dpdService: any;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppService,
        {
          provide: ShopService,
          useValue: {
            getOrderInfo: jest.fn(),
            getAddressInfo: jest.fn(),
            getCustomerInfo: jest.fn(),
            getOrderCarrierInfo: jest.fn(),
            getMessagesThread: jest.fn(),
            getOrderMessages: jest.fn(),
            updateOrderStatus: jest.fn(),
            updateOrderCarrierTracking: jest.fn(),
            addMessageToThread: jest.fn(),
            getInTransitOrders: jest.fn(),
          },
        },
        {
          provide: YaService,
          useValue: {
            getHistoryById: jest.fn(),
            createYaOrder: jest.fn(),
            getOrderInfo: jest.fn(),
            getParcelCost: jest.fn(),
            getRecentParcels: jest.fn(),
          },
        },
        {
          provide: CashService,
          useValue: {
            createCashInvoice: jest.fn(),
          },
        },
        {
          provide: PostService,
          useValue: {
            getPostParcelData: jest.fn(),
          },
        },
        {
          provide: BotService,
          useValue: {
            sendEmployeeMessage: jest.fn(),
            buGroup: 'bot-group',
          },
        },
        {
          provide: DpdService,
          useValue: {
            createOrder: jest.fn(),
            getStatesByDPDOrder: jest.fn(),
            clientNumber: '1000000000',
            token: 'dpd-secret',
          },
        },
        {
          provide: MailService,
          useValue: {
            emitHealth: jest.fn(),
            sendToAdmin: jest.fn(),
            send: jest.fn(),
          },
        },
        {
          provide: FiveService,
          useValue: {
            getOrderStatus: jest.fn(),
            createOrders: jest.fn(),
            requestWithAuth: jest.fn(),
            getToken: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AppService>(AppService);
    shopService = module.get<ShopService>(ShopService);
    yaService = module.get<YaService>(YaService);
    mailService = module.get<MailService>(MailService);
    botService = module.get<BotService>(BotService);
    cashService = module.get<CashService>(CashService);
    fiveService = module.get<any>(FiveService);
    postService = module.get<any>(PostService);
    dpdService = module.get<any>(DpdService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getHello', () => {
    it('should send an email to the admin and return "Hello World!"', async () => {
      jest.spyOn(mailService, 'emitHealth').mockResolvedValue(undefined);

      const result = await service.getHello();

      // expect(mailService.emitHealth).toHaveBeenCalled();
      expect(result).toBe('Hello World!');
    });
  });

  describe('fetchBatchOfStatuses batching for FIVE_POST', () => {
    it('calls fiveService.getOrderStatus once with all references and resolves per-order', async () => {
      const five = fiveService;

      const revising = [
        {
          id: 1,
          reference: 'R1',
          track: 'R1-1',
          cargo: 'FIVE_POST',
          unifiedShopState: 'IN_TRANSIT',
          shopStateUpdatedAt: Date.now(),
        },
        {
          id: 2,
          reference: 'R2',
          track: 'R2-1',
          cargo: 'FIVE_POST',
          unifiedShopState: 'IN_TRANSIT',
          shopStateUpdatedAt: Date.now(),
        },
        {
          id: 3,
          reference: 'R3',
          track: 'R3-1',
          cargo: 'POST',
          unifiedShopState: 'IN_TRANSIT',
          shopStateUpdatedAt: Date.now(),
        },
      ];

      // Mock POST service for the non-five item
      postService.getOperationHistory = jest
        .fn()
        .mockResolvedValue({ OperationHistoryData: { historyRecord: [] } });

      // Mock fiveService to return results only for R1 and R2
      const resp = [
        { senderOrderId: 'R1', executionStatus: 'PICKED_UP', status: 'DONE' },
        {
          senderOrderId: 'R2',
          executionStatus: 'SHIPPED',
          status: 'IN_PROCESS',
        },
      ];
      five.getOrderStatus.mockResolvedValue(resp);

      const serviceInstance = service;
      const results = await serviceInstance.fetchBatchOfStatuses(
        revising as any,
      );

      // should call fiveService once with both R1 and R2
      expect(five.getOrderStatus).toHaveBeenCalledTimes(1);
      expect(five.getOrderStatus).toHaveBeenCalledWith(
        expect.arrayContaining(['R1', 'R2']),
      );

      // results is an array of settled promises
      expect(results).toHaveLength(3);
      // first two should be fulfilled
      expect((results[0] as any).status).toBe('fulfilled');
      expect((results[1] as any).status).toBe('fulfilled');
    });

    it('resolves null for missing five items when API does not return them', async () => {
      const five = fiveService;

      const revising = [
        {
          id: 1,
          reference: 'R1',
          track: 'R1-1',
          cargo: 'FIVE_POST',
          unifiedShopState: 'IN_TRANSIT',
          shopStateUpdatedAt: Date.now(),
        },
      ];

      five.getOrderStatus.mockResolvedValue([]); // no results

      const serviceInstance = service;
      const results = await serviceInstance.fetchBatchOfStatuses(
        revising as any,
      );

      expect(five.getOrderStatus).toHaveBeenCalledTimes(1);
      expect((results[0] as any).status).toBe('fulfilled');
      expect((results[0] as any).value).toBeNull();
    });

    it('rejects per-order promises when fiveService fails', async () => {
      const five = fiveService;

      const revising = [
        {
          id: 1,
          reference: 'R1',
          track: 'R1-1',
          cargo: 'FIVE_POST',
          unifiedShopState: 'IN_TRANSIT',
          shopStateUpdatedAt: Date.now(),
        },
        {
          id: 2,
          reference: 'R2',
          track: 'R2-1',
          cargo: 'FIVE_POST',
          unifiedShopState: 'IN_TRANSIT',
          shopStateUpdatedAt: Date.now(),
        },
      ];

      five.getOrderStatus.mockRejectedValue(new Error('service down'));

      const serviceInstance = service;
      const results = await serviceInstance.fetchBatchOfStatuses(
        revising as any,
      );

      // both should be rejected
      expect((results[0] as any).status).toBe('rejected');
      expect((results[1] as any).status).toBe('rejected');
    });
  });

  describe('createYaOrder', () => {
    it('should create a new Ya order and return the order sharing_url', async () => {
      const mockOrderDetails = { ...orderDetails };
      const mockAddressDetails = { ...addressDetails };
      const mockCustomerDetails = { ...customerDetails };
      const mockShippingDetails = { ...shippingDetails };
      const mockYaOrderData: CreateYaOrderDto = { ...orderConverterResult };
      const mockYaOrderId: YaOrderCreationRes = { request_id: '123' };
      const mockOrderInfo: YaOrderInfoRes = { ...yaOrderInfo };

      jest
        .spyOn(shopService, 'getOrderInfo')
        .mockResolvedValue(mockOrderDetails);
      jest
        .spyOn(shopService, 'getAddressInfo')
        .mockResolvedValue(mockAddressDetails);
      jest
        .spyOn(shopService, 'getCustomerInfo')
        .mockResolvedValue(mockCustomerDetails);
      jest
        .spyOn(shopService, 'getOrderCarrierInfo')
        .mockResolvedValue(mockShippingDetails.order_carriers[0]);
      jest.spyOn(shopService, 'getMessagesThread').mockResolvedValue(5);
      jest
        .spyOn(shopService, 'getOrderMessages')
        .mockResolvedValue(orderMessages);
      findPointIdMock.mockReturnValue('destination');
      jest.spyOn(yaService, 'createYaOrder').mockResolvedValue(mockYaOrderId);
      jest.spyOn(yaService, 'getOrderInfo').mockResolvedValue(mockOrderInfo);
      jest
        .spyOn(yaService, 'getParcelCost')
        .mockResolvedValue({ pricing_total: '123.17 RUB' });
      convertOrderMock.mockReturnValue(mockYaOrderData);

      const createOrderQueries: CreateOrderQueries = {
        orderId: '1',
      };

      const result = await service.createYaOrder(createOrderQueries, {
        rnd: 'rnd-platform-123',
        tul: 'source-platform-123',
      });

      expect(shopService.getOrderInfo).toHaveBeenCalledWith(1);
      expect(shopService.getAddressInfo).toHaveBeenCalledWith(111005);
      expect(shopService.getCustomerInfo).toHaveBeenCalledWith(6190);
      expect(shopService.getOrderCarrierInfo).toHaveBeenCalledWith(1);
      expect(shopService.getMessagesThread).toHaveBeenCalledWith(1);
      expect(shopService.getOrderMessages).toHaveBeenCalledWith(5);
      expect(convertOrderMock).toHaveBeenCalledWith(
        mockOrderDetails,
        mockAddressDetails,
        mockCustomerDetails,
        mockShippingDetails.order_carriers[0],
        'destination',
        'source-platform-123',
      );
      expect(yaService.createYaOrder).toHaveBeenCalledWith(mockYaOrderData);
      expect(shopService.updateOrderCarrierTracking).toHaveBeenCalledWith(
        mockShippingDetails.order_carriers[0],
        'cfdd10a3-8622-4195-8721-215ec900daf1',
      );
      expect(result).toEqual({
        ok: true,
        data: { sharing_url: mockOrderInfo.sharing_url },
      });
    }, 10000);

    it('notifies employees but still succeeds when writing the tracking number fails', async () => {
      const mockShippingDetails = { ...shippingDetails };
      const mockYaOrderData: CreateYaOrderDto = { ...orderConverterResult };
      const mockYaOrderId: YaOrderCreationRes = { request_id: '123' };
      const mockOrderInfo: YaOrderInfoRes = { ...yaOrderInfo };

      jest.spyOn(shopService, 'getOrderInfo').mockResolvedValue(orderDetails);
      jest
        .spyOn(shopService, 'getAddressInfo')
        .mockResolvedValue(addressDetails);
      jest
        .spyOn(shopService, 'getCustomerInfo')
        .mockResolvedValue(customerDetails);
      jest
        .spyOn(shopService, 'getOrderCarrierInfo')
        .mockResolvedValue(mockShippingDetails.order_carriers[0]);
      jest.spyOn(shopService, 'getMessagesThread').mockResolvedValue(5);
      jest
        .spyOn(shopService, 'getOrderMessages')
        .mockResolvedValue(orderMessages);
      findPointIdMock.mockReturnValue('destination');
      jest.spyOn(yaService, 'createYaOrder').mockResolvedValue(mockYaOrderId);
      jest.spyOn(yaService, 'getOrderInfo').mockResolvedValue(mockOrderInfo);
      jest
        .spyOn(yaService, 'getParcelCost')
        .mockResolvedValue({ pricing_total: '123.17 RUB' });
      convertOrderMock.mockReturnValue(mockYaOrderData);
      jest
        .spyOn(shopService, 'updateOrderCarrierTracking')
        .mockRejectedValue(new Error('Shop API unavailable'));
      jest
        .spyOn(botService, 'sendEmployeeMessage')
        .mockResolvedValue(undefined as any);

      const result = await service.createYaOrder(
        { orderId: '1' },
        { rnd: 'rnd-platform-123', tul: 'source-platform-123' },
      );

      expect(result).toEqual({
        ok: true,
        data: { sharing_url: mockOrderInfo.sharing_url },
      });
      expect(botService.sendEmployeeMessage).toHaveBeenCalledWith(
        expect.stringContaining('не удалось записать трек-номер'),
      );
    }, 10000);

    it('should return an error if something goes wrong', async () => {
      const mockError = new Error('Something went wrong');
      jest.spyOn(shopService, 'getOrderInfo').mockRejectedValue(mockError);

      const createOrderQueries: CreateOrderQueries = {
        orderId: '1',
      };

      const result = await service.createYaOrder(createOrderQueries, {
        rnd: 'rnd-platform-123',
        tul: 'source-platform-123',
      });

      expect(result).toEqual({
        ok: false,
        data: { message: 'Something went wrong' },
      });
    });

    it('returns a configuration error when the source platform is missing for the order status', async () => {
      jest.spyOn(service, 'getOrderBasicInfo').mockResolvedValue({
        addressDetails: addressDetails as any,
        customerDetails: customerDetails as any,
        orderDetails: { ...orderDetails, current_state: '12' },
      });

      const result = await service.createYaOrder(
        { orderId: '1' },
        { tul: 'tul-platform-123' },
      );

      expect(result).toEqual({
        ok: false,
        data: {
          message:
            'Не настроен ID пункта приёма Яндекс.Доставки для статуса заказа 12',
        },
      });
      expect(shopService.getOrderCarrierInfo).not.toHaveBeenCalled();
    });
  });

  describe('createFivePostOrder', () => {
    it('creates a 5Post shipment using the pickup point from the order message', async () => {
      const basicInfo = buildBasicOrderInfo();
      jest.spyOn(service, 'getOrderBasicInfo').mockResolvedValue(basicInfo);
      jest
        .spyOn(shopService, 'getOrderCarrierInfo')
        .mockResolvedValue(shippingDetails.order_carriers[0]);
      jest.spyOn(shopService, 'getMessagesThread').mockResolvedValue(5);
      jest
        .spyOn(shopService, 'getOrderMessages')
        .mockResolvedValue(orderMessages);
      findPointIdMock.mockReturnValue('receiver-location');
      fiveService.createOrders.mockResolvedValue([
        {
          created: true,
          senderOrderId: basicInfo.orderDetails.reference,
          cargoes: [
            {
              senderCargoId: basicInfo.orderDetails.reference,
              barcode: 'five-barcode',
            },
          ],
        },
      ]);

      await expect(
        service.createFivePostOrder({ orderId: '1' }, 'sender-location'),
      ).resolves.toEqual({
        ok: true,
        data: { track: 'five-barcode' },
      });
      expect(fiveService.createOrders).toHaveBeenCalledWith(
        expect.objectContaining({
          partnerOrders: [
            expect.objectContaining({
              senderLocation: 'sender-location',
              receiverLocation: 'receiver-location',
            }),
          ],
        }),
      );
      expect(shopService.updateOrderCarrierTracking).toHaveBeenCalledWith(
        shippingDetails.order_carriers[0],
        'five-barcode',
      );
    });

    it('surfaces 5Post error details when the order is not created', async () => {
      const basicInfo = buildBasicOrderInfo();
      jest.spyOn(service, 'getOrderBasicInfo').mockResolvedValue(basicInfo);
      jest
        .spyOn(shopService, 'getOrderCarrierInfo')
        .mockResolvedValue(shippingDetails.order_carriers[0]);
      jest.spyOn(shopService, 'getMessagesThread').mockResolvedValue(5);
      jest
        .spyOn(shopService, 'getOrderMessages')
        .mockResolvedValue(orderMessages);
      findPointIdMock.mockReturnValue('receiver-location');
      fiveService.createOrders.mockResolvedValue([
        {
          created: false,
          senderOrderId: basicInfo.orderDetails.reference,
          cargoes: [],
          errors: [
            { code: 20, message: 'Заказ с таким senderOrderId уже существует' },
          ],
        },
      ]);

      await expect(
        service.createFivePostOrder({ orderId: '1' }, 'sender-location'),
      ).resolves.toEqual({
        ok: false,
        data: {
          message:
            '5Post не подтвердил создание отправки: 20: Заказ с таким senderOrderId уже существует',
        },
      });
    });
  });

  describe('createDpdOrder', () => {
    const dpdSourceTerminalIds = {
      rnd: 'terminal-rnd-1',
      tul: 'terminal-tul-1',
    };

    it('creates a DPD shipment using the pickup point from the order message', async () => {
      const basicInfo = buildBasicOrderInfo();
      jest.spyOn(service, 'getOrderBasicInfo').mockResolvedValue(basicInfo);
      jest
        .spyOn(shopService, 'getOrderCarrierInfo')
        .mockResolvedValue(shippingDetails.order_carriers[0]);
      jest.spyOn(shopService, 'getMessagesThread').mockResolvedValue(5);
      jest
        .spyOn(shopService, 'getOrderMessages')
        .mockResolvedValue(orderMessages);
      findPointIdMock.mockReturnValue('destination-terminal');
      convertOrderToDpdMock.mockReturnValue({
        header: {} as any,
        order: [{} as any],
      });
      dpdService.createOrder.mockResolvedValue({
        orderNumberInternal: basicInfo.orderDetails.reference,
        orderNum: '01010001MOW',
        status: 'OK',
      });

      await expect(
        service.createDpdOrder({ orderId: '1' }, dpdSourceTerminalIds),
      ).resolves.toEqual({
        ok: true,
        data: { track: '01010001MOW', status: 'OK', message: undefined },
      });
      expect(convertOrderToDpdMock).toHaveBeenCalledWith(
        basicInfo.orderDetails,
        basicInfo.addressDetails,
        basicInfo.customerDetails,
        shippingDetails.order_carriers[0],
        'destination-terminal',
        'terminal-tul-1',
      );
      expect(dpdService.createOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          auth: { clientNumber: 1000000000, clientKey: 'dpd-secret' },
        }),
      );
      expect(shopService.updateOrderCarrierTracking).toHaveBeenCalledWith(
        shippingDetails.order_carriers[0],
        '01010001MOW',
      );
    });

    it('resolves the Rostov source terminal for order status 12', async () => {
      const basicInfo = {
        ...buildBasicOrderInfo(),
        orderDetails: { ...orderDetails, current_state: '12' },
      };
      jest.spyOn(service, 'getOrderBasicInfo').mockResolvedValue(basicInfo);
      jest
        .spyOn(shopService, 'getOrderCarrierInfo')
        .mockResolvedValue(shippingDetails.order_carriers[0]);
      jest.spyOn(shopService, 'getMessagesThread').mockResolvedValue(5);
      jest
        .spyOn(shopService, 'getOrderMessages')
        .mockResolvedValue(orderMessages);
      findPointIdMock.mockReturnValue('destination-terminal');
      convertOrderToDpdMock.mockReturnValue({
        header: {} as any,
        order: [{} as any],
      });
      dpdService.createOrder.mockResolvedValue({
        orderNum: '01010001MOW',
        status: 'OK',
      });

      await service.createDpdOrder({ orderId: '1' }, dpdSourceTerminalIds);

      expect(convertOrderToDpdMock).toHaveBeenCalledWith(
        basicInfo.orderDetails,
        basicInfo.addressDetails,
        basicInfo.customerDetails,
        shippingDetails.order_carriers[0],
        'destination-terminal',
        'terminal-rnd-1',
      );
    });

    it('returns a failure when no DPD source terminal is configured for the order status', async () => {
      const basicInfo = buildBasicOrderInfo();
      jest.spyOn(service, 'getOrderBasicInfo').mockResolvedValue(basicInfo);

      await expect(
        service.createDpdOrder({ orderId: '1' }, { rnd: 'terminal-rnd-1' }),
      ).resolves.toEqual({
        ok: false,
        data: {
          message: 'Не настроен терминал отправки DPD для статуса заказа 13',
        },
      });
      expect(dpdService.createOrder).not.toHaveBeenCalled();
    });

    it('does not write a tracking number while the order is pending manual DPD processing', async () => {
      const basicInfo = buildBasicOrderInfo();
      jest.spyOn(service, 'getOrderBasicInfo').mockResolvedValue(basicInfo);
      jest
        .spyOn(shopService, 'getOrderCarrierInfo')
        .mockResolvedValue(shippingDetails.order_carriers[0]);
      jest.spyOn(shopService, 'getMessagesThread').mockResolvedValue(5);
      jest
        .spyOn(shopService, 'getOrderMessages')
        .mockResolvedValue(orderMessages);
      findPointIdMock.mockReturnValue('destination-terminal');
      convertOrderToDpdMock.mockReturnValue({
        header: {} as any,
        order: [{} as any],
      });
      dpdService.createOrder.mockResolvedValue({ status: 'OrderPending' });

      await expect(
        service.createDpdOrder({ orderId: '1' }, dpdSourceTerminalIds),
      ).resolves.toEqual({
        ok: true,
        data: {
          track: null,
          status: 'OrderPending',
          message:
            'Заказ принят DPD, номер отправления появится после ручной обработки',
        },
      });
      expect(shopService.updateOrderCarrierTracking).not.toHaveBeenCalled();
    });

    it('returns a failure when DPD rejects the order', async () => {
      const basicInfo = buildBasicOrderInfo();
      jest.spyOn(service, 'getOrderBasicInfo').mockResolvedValue(basicInfo);
      jest
        .spyOn(shopService, 'getOrderCarrierInfo')
        .mockResolvedValue(shippingDetails.order_carriers[0]);
      jest.spyOn(shopService, 'getMessagesThread').mockResolvedValue(5);
      jest
        .spyOn(shopService, 'getOrderMessages')
        .mockResolvedValue(orderMessages);
      findPointIdMock.mockReturnValue('destination-terminal');
      convertOrderToDpdMock.mockReturnValue({
        header: {} as any,
        order: [{} as any],
      });
      dpdService.createOrder.mockResolvedValue({
        status: 'OrderError',
        errorMessage: 'Не указан индекс получателя',
      });

      await expect(
        service.createDpdOrder({ orderId: '1' }, dpdSourceTerminalIds),
      ).resolves.toEqual({
        ok: false,
        data: {
          message:
            'DPD не подтвердил создание отправки: Не указан индекс получателя',
        },
      });
      expect(shopService.updateOrderCarrierTracking).not.toHaveBeenCalled();
    });

    it('returns a failure when no DPD pickup point is found in the order messages', async () => {
      const basicInfo = buildBasicOrderInfo();
      jest.spyOn(service, 'getOrderBasicInfo').mockResolvedValue(basicInfo);
      jest
        .spyOn(shopService, 'getOrderCarrierInfo')
        .mockResolvedValue(shippingDetails.order_carriers[0]);
      jest.spyOn(shopService, 'getMessagesThread').mockResolvedValue(5);
      jest
        .spyOn(shopService, 'getOrderMessages')
        .mockResolvedValue(orderMessages);
      findPointIdMock.mockReturnValue(undefined);

      await expect(
        service.createDpdOrder({ orderId: '1' }, dpdSourceTerminalIds),
      ).resolves.toEqual({
        ok: false,
        data: { message: 'Пункт выдачи DPD не найден в переписке по заказу' },
      });
      expect(dpdService.createOrder).not.toHaveBeenCalled();
    });

    it('warns the employee about a cash-on-delivery amount when the order is not fully paid', async () => {
      const basicInfo = buildBasicOrderInfo();
      jest.spyOn(service, 'getOrderBasicInfo').mockResolvedValue(basicInfo);
      jest
        .spyOn(shopService, 'getOrderCarrierInfo')
        .mockResolvedValue(shippingDetails.order_carriers[0]);
      jest.spyOn(shopService, 'getMessagesThread').mockResolvedValue(5);
      jest
        .spyOn(shopService, 'getOrderMessages')
        .mockResolvedValue(orderMessages);
      findPointIdMock.mockReturnValue('destination-terminal');
      convertOrderToDpdMock.mockReturnValue({
        header: {} as any,
        order: [
          {
            extraService: [
              {
                esCode: 'НПП',
                param: [{ name: 'sum_npp', value: '1603.47' }],
              },
            ],
          } as any,
        ],
      });
      dpdService.createOrder.mockResolvedValue({
        orderNum: '01010001MOW',
        status: 'OK',
      });

      const result = await service.createDpdOrder(
        { orderId: '1' },
        dpdSourceTerminalIds,
      );

      expect(result).toEqual({
        ok: true,
        data: {
          track: '01010001MOW',
          status: 'OK',
          message:
            'Клиент не оплатил заказ полностью — DPD соберёт наложенный платёж 1603.47 ₽ при вручении.',
        },
      });
    });
  });

  describe('getYaOrderHistory', () => {
    it('should return order history for a given ID', async () => {
      const mockHistoryData = { ...yaOrderHistory };
      const expectedHtml = `<div><h3>${yaOrderHistory.state_history[1].description}</h3><p>${new Date(yaOrderHistory.state_history[1].timestamp_utc).toLocaleString()}</p></div><div><h3>${yaOrderHistory.state_history[0].description}</h3><p>${new Date(yaOrderHistory.state_history[0].timestamp_utc).toLocaleString()}</p></div>`;

      jest
        .spyOn(yaService, 'getHistoryById')
        .mockResolvedValue(mockHistoryData);

      const result = await service.getYaOrderHistory('1');
      expect(result).toEqual(expectedHtml);
      expect(yaService.getHistoryById).toHaveBeenCalledWith('1');
    });

    it('should throw an error if fetching history fails', async () => {
      const mockError = new Error('Something went wrong');
      jest.spyOn(yaService, 'getHistoryById').mockRejectedValue(mockError);

      await expect(service.getYaOrderHistory('1')).rejects.toThrow(mockError);
    });
  });

  describe('getOrderInfo', () => {
    it('should return order info for a given ID', async () => {
      const mockOrderInfo: YaOrderInfoRes = { ...yaOrderInfo };
      jest.spyOn(yaService, 'getOrderInfo').mockResolvedValue(mockOrderInfo);
      const result = await service.getOrderInfo('1');
      expect(result).toEqual({
        ok: true,
        data: { sharing_url: yaOrderInfo.sharing_url },
      });
      expect(yaService.getOrderInfo).toHaveBeenCalledWith('1');
    });
    it('should throw an error if fetching order info fails', async () => {
      const mockError = new Error('Something went wrong');
      jest.spyOn(yaService, 'getOrderInfo').mockRejectedValue(mockError);
      const result = await service.getOrderInfo('1');
      expect(result).toEqual({
        ok: false,
        data: { message: 'Something went wrong' },
      });
    });
  });

  describe('createCashInvoice', () => {
    it('returns delivery method and notifies employees', async () => {
      const basicInfo = buildBasicOrderInfo();
      const cashPayload = { order_id: 'ORD-1' } as any;
      const invoiceResponse = { delivery_method: 'Express' } as any;
      jest.spyOn(service, 'getOrderBasicInfo').mockResolvedValue(basicInfo);
      convertOrderShopToCashMock.mockReturnValue(cashPayload);
      jest
        .spyOn(cashService, 'createCashInvoice')
        .mockResolvedValue(invoiceResponse);
      generateCashInvoiceMessageMock.mockReturnValue('Invoice ready');

      const result = await service.createCashInvoice({ orderId: '42' } as any);

      expect(convertOrderShopToCashMock).toHaveBeenCalledWith(
        basicInfo.orderDetails,
        basicInfo.customerDetails,
        basicInfo.addressDetails,
        undefined,
      );
      expect(cashService.createCashInvoice).toHaveBeenCalledWith(cashPayload);
      expect(generateCashInvoiceMessageMock).toHaveBeenCalledWith(
        basicInfo.orderDetails,
        basicInfo.customerDetails,
        invoiceResponse,
        basicInfo.addressDetails,
      );
      expect(botService.sendEmployeeMessage).toHaveBeenCalledWith(
        'Invoice ready',
        true,
        'bot-group',
      );
      expect(result).toEqual({
        ok: true,
        data: invoiceResponse.delivery_method,
      });
    });

    it('sends an SMS invoice notification without MarkdownV2', async () => {
      const basicInfo = buildBasicOrderInfo();
      const invoiceResponse = {
        delivery_method: { type: 'sms' },
      } as any;
      jest.spyOn(service, 'getOrderBasicInfo').mockResolvedValue(basicInfo);
      jest
        .spyOn(cashService, 'createCashInvoice')
        .mockResolvedValue(invoiceResponse);
      generateCashInvoiceMessageMock.mockReturnValue('SMS invoice sent.');

      await service.createCashInvoice({ orderId: '42', sms: true });

      expect(botService.sendEmployeeMessage).toHaveBeenCalledWith(
        'SMS invoice sent.',
        false,
        'bot-group',
      );
    });

    it('returns a successful invoice when Telegram notification fails', async () => {
      const basicInfo = buildBasicOrderInfo();
      const invoiceResponse = { delivery_method: 'Express' } as any;
      jest.spyOn(service, 'getOrderBasicInfo').mockResolvedValue(basicInfo);
      jest
        .spyOn(cashService, 'createCashInvoice')
        .mockResolvedValue(invoiceResponse);
      generateCashInvoiceMessageMock.mockReturnValue('Invoice ready');
      jest
        .spyOn(botService, 'sendEmployeeMessage')
        .mockRejectedValue(new Error('Telegram unavailable'));

      await expect(
        service.createCashInvoice({ orderId: '42' } as any),
      ).resolves.toEqual({ ok: true, data: invoiceResponse.delivery_method });
    });

    it('returns error when invoice creation fails but still notifies', async () => {
      const failure = new Error('cash failed');
      jest.spyOn(service, 'getOrderBasicInfo').mockRejectedValue(failure);

      const result = await service.createCashInvoice({ orderId: '13' } as any);

      expect(result).toEqual({ ok: false, data: { message: 'cash failed' } });
      expect(botService.sendEmployeeMessage).toHaveBeenCalledWith(
        expect.stringContaining('Ошибка при создании счёта для заказа 13'),
        true,
        'bot-group',
      );
    });
  });

  describe('reviseOrders', () => {
    it('aggregates updates, warnings, and errors for mixed orders', async () => {
      const fixedNow = Date.now();
      jest.spyOn(Date, 'now').mockReturnValue(fixedNow);
      const orders = [
        buildRevisingOrder({
          reference: 'REF-PROB',
          cargo: Cargos.YA,
          unifiedCargoState: UnifiedOrderState.PROBLEM,
          actualCargoState: 'Problem',
        }),
        buildRevisingOrder({
          reference: 'REF-BLOCK',
          unifiedShopState: UnifiedOrderState.DELIVERED,
          unifiedCargoState: UnifiedOrderState.IN_TRANSIT,
        }),
        buildRevisingOrder({
          reference: 'REF-AUTO',
          unifiedShopState: UnifiedOrderState.IN_TRANSIT,
          unifiedCargoState: UnifiedOrderState.WAITING,
        }),
        buildRevisingOrder({
          reference: 'REF-WAIT',
          unifiedShopState: UnifiedOrderState.WAITING,
          unifiedCargoState: UnifiedOrderState.WAITING,
          shopStateUpdatedAt: fixedNow - 6 * 86400000,
        }),
        buildRevisingOrder({
          reference: 'REF-UNK',
          unifiedCargoState: UnifiedOrderState.UNKNOWN,
        }),
        buildRevisingOrder({
          reference: 'REF-DPD',
          cargo: Cargos.DPD,
          unifiedShopState: UnifiedOrderState.IN_TRANSIT,
          unifiedCargoState: UnifiedOrderState.WAITING,
        }),
      ];

      jest.spyOn(service, 'getDataForRevise').mockResolvedValue(orders);
      jest.spyOn(mailService, 'sendToAdmin').mockResolvedValue(undefined);
      jest.spyOn(botService, 'sendEmployeeMessage').mockResolvedValue({
        ok: false,
        error_code: 500,
        description: 'Test response',
      });
      const syncSpy = jest
        .spyOn(service as any, 'syncOrderStateWithCargo')
        .mockImplementation(
          async (_order: RevisingOrderData, updates: string[]) => {
            updates.push('AUTO REF-AUTO');
          },
        );

      const result = await service.reviseOrders();

      expect(syncSpy).toHaveBeenCalledWith(
        expect.objectContaining({ reference: 'REF-AUTO' }),
        expect.any(Array),
        expect.any(Array),
      );
      expect(syncSpy).toHaveBeenCalledWith(
        expect.objectContaining({ reference: 'REF-DPD' }),
        expect.any(Array),
        expect.any(Array),
      );
      expect(mailService.sendToAdmin).toHaveBeenCalledWith(
        'Status updates',
        expect.stringContaining('AUTO REF-AUTO'),
      );
      expect(botService.sendEmployeeMessage).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('AUTO REF-AUTO'),
      );
      expect(botService.sendEmployeeMessage).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('⌛ REF-WAIT'),
        false,
        'bot-group',
      );
      expect(botService.sendEmployeeMessage).toHaveBeenNthCalledWith(
        3,
        expect.stringContaining('REF-PROB'),
        false,
        'bot-group',
      );
      expect(result).toEqual(
        expect.arrayContaining([
          expect.stringContaining('REF-PROB'),
          expect.stringContaining('AUTO REF-AUTO'),
          expect.stringContaining('REF-WAIT'),
          expect.stringContaining('REF-UNK'),
          expect.stringContaining('REF-BLOCK'),
        ]),
      );
    });

    it('propagates errors from getDataForRevise', async () => {
      const failure = new Error('revise failed');
      jest.spyOn(service, 'getDataForRevise').mockRejectedValue(failure);

      await expect(service.reviseOrders()).rejects.toThrow(failure);
    });
  });

  describe('getDataForRevise', () => {
    it('recognizes a Yandex order by its reference when its tracking number is not a UUID', async () => {
      jest.spyOn(shopService, 'getInTransitOrders').mockResolvedValue([
        {
          id: 1,
          reference: 'YA-REF-1',
          shipping_number: 'non-uuid-tracking-number',
          current_state: '4',
          date_upd: '2026-09-11T12:00:00.000Z',
        },
      ] as any);
      jest.spyOn(yaService, 'getRecentParcels').mockResolvedValue({
        ...yaRecentParcels,
        requests: [
          {
            ...yaRecentParcels.requests[0],
            request: {
              ...yaRecentParcels.requests[0].request,
              info: {
                ...yaRecentParcels.requests[0].request.info,
                operator_request_id: 'YA-REF-1',
              },
            },
          },
        ],
      });

      const result = await service.getDataForRevise();

      expect(result[0]).toEqual(
        expect.objectContaining({
          cargo: Cargos.YA,
          actualCargoState: yaRecentParcels.requests[0].state.status,
          unifiedCargoState: UnifiedOrderState.IN_TRANSIT,
        }),
      );
    });

    it('logs an unmatched Yandex order returned by PrestaShop', async () => {
      const loggerWarn = jest.spyOn((service as any).logger, 'warn');
      jest.spyOn(shopService, 'getInTransitOrders').mockResolvedValue([
        {
          id: 1,
          reference: 'YA-REF-1',
          shipping_number: '00000000-0000-0000-0000-000000000001',
          current_state: '4',
          date_upd: '2026-09-11T12:00:00.000Z',
        },
      ] as any);
      jest.spyOn(yaService, 'getRecentParcels').mockResolvedValue({
        ...yaRecentParcels,
        requests: [],
      });

      const result = await service.getDataForRevise();

      expect(result[0]).toEqual(expect.objectContaining({ cargo: Cargos.YA }));
      expect(result[0]).not.toHaveProperty('actualCargoState');
      expect(result[0]).not.toHaveProperty('unifiedCargoState');
      expect(loggerWarn).toHaveBeenCalledWith(
        expect.stringContaining('"event":"yandexParcelNotFound"'),
      );
    });

    it('reports an unmatched Yandex order during revision', async () => {
      jest.spyOn(shopService, 'getInTransitOrders').mockResolvedValue([
        {
          id: 1,
          reference: 'YA-REF-1',
          shipping_number: '00000000-0000-0000-0000-000000000001',
          current_state: '4',
          date_upd: '2026-09-11T12:00:00.000Z',
        },
      ] as any);
      jest.spyOn(yaService, 'getRecentParcels').mockResolvedValue({
        ...yaRecentParcels,
        requests: [],
      });
      jest.spyOn(mailService, 'sendToAdmin').mockResolvedValue(undefined);
      jest.spyOn(botService, 'sendEmployeeMessage').mockResolvedValue({
        ok: true,
        result: {} as any,
      });

      await expect(service.reviseOrders()).resolves.toContain(
        '❗ Заказ YA-REF-1 не найден в ответе Яндекс.Доставки за последние 30 дней.',
      );
    });

    it('resolves the DPD cargo state using the chronologically latest state, not array order', async () => {
      jest.spyOn(shopService, 'getInTransitOrders').mockResolvedValue([
        {
          id: 2,
          reference: 'DPD-REF-1',
          shipping_number: 'RU113491901',
          current_state: '4',
          date_upd: '2026-09-11T12:00:00.000Z',
        },
      ] as any);
      jest.spyOn(yaService, 'getRecentParcels').mockResolvedValue({
        ...yaRecentParcels,
        requests: [],
      });
      jest.spyOn(dpdService, 'getStatesByDPDOrder').mockResolvedValue({
        return: {
          docId: 1,
          docDate: '2026-09-10',
          clientNumber: 1000000000,
          resultComplete: true,
          states: [
            { newState: 'Delivered', transitionTime: '2026-09-12T10:00:00' },
            {
              newState: 'OnTerminalDelivery',
              transitionTime: '2026-09-11T10:00:00',
            },
          ],
        },
      } as any);

      const result = await service.getDataForRevise();

      expect(result[0]).toEqual(
        expect.objectContaining({
          cargo: Cargos.DPD,
          actualCargoState: 'Delivered',
          unifiedCargoState: UnifiedOrderState.DELIVERED,
        }),
      );
    });

    it('treats a DPD state flagged isReturn as RETURNING regardless of the raw newState', async () => {
      jest.spyOn(shopService, 'getInTransitOrders').mockResolvedValue([
        {
          id: 3,
          reference: 'DPD-REF-2',
          shipping_number: 'RU113491902',
          current_state: '4',
          date_upd: '2026-09-11T12:00:00.000Z',
        },
      ] as any);
      jest.spyOn(yaService, 'getRecentParcels').mockResolvedValue({
        ...yaRecentParcels,
        requests: [],
      });
      jest.spyOn(dpdService, 'getStatesByDPDOrder').mockResolvedValue({
        return: {
          docId: 1,
          docDate: '2026-09-10',
          clientNumber: 1000000000,
          resultComplete: true,
          states: [
            {
              newState: 'OnTerminalDelivery',
              transitionTime: '2026-09-11T10:00:00',
            },
            {
              newState: 'OnTerminalDelivery',
              transitionTime: '2026-09-13T10:00:00',
              isReturn: true,
            },
          ],
        },
      } as any);

      const result = await service.getDataForRevise();

      expect(result[0]).toEqual(
        expect.objectContaining({
          cargo: Cargos.DPD,
          actualCargoState: 'OnTerminalDelivery',
          unifiedCargoState: UnifiedOrderState.RETURNING,
        }),
      );
    });
  });

  describe('compareDeliveryCost', () => {
    it('notifies employee when costs differ', async () => {
      checkDeliveryCostMock.mockReturnValue(true);

      await service.compareDeliveryCost('100', '120', 'ORD-1');

      expect(checkDeliveryCostMock).toHaveBeenCalledWith('100', '120');
      expect(botService.sendEmployeeMessage).toHaveBeenCalledWith(
        expect.stringContaining('ORD-1'),
      );
    });

    it('skips notification when costs match', async () => {
      checkDeliveryCostMock.mockReturnValue(false);

      await service.compareDeliveryCost('100', '100', 'ORD-2');

      expect(botService.sendEmployeeMessage).not.toHaveBeenCalled();
    });
  });

  describe('syncOrderStateWithCargo', () => {
    it('updates shop status and notifies customer when mapping exists', async () => {
      const order: any = {
        id: 10,
        reference: 'REF-10',
        unifiedShopState: UnifiedOrderState.IN_TRANSIT,
        unifiedCargoState: UnifiedOrderState.WAITING,
      };
      const updates: string[] = [];
      const errors: string[] = [];
      jest.spyOn(shopService, 'updateOrderStatus').mockResolvedValue(undefined);
      jest.spyOn(shopService, 'getMessagesThread').mockResolvedValue(99);
      jest
        .spyOn(shopService, 'addMessageToThread')
        .mockResolvedValue(undefined);

      await (service as any).syncOrderStateWithCargo(order, updates, errors);

      expect(shopService.updateOrderStatus).toHaveBeenCalledWith(10, 908);
      expect(updates[0]).toContain('✅');
      expect(errors).toHaveLength(0);
      expect(shopService.getMessagesThread).toHaveBeenCalledWith(10);
      expect(shopService.addMessageToThread).toHaveBeenCalledWith(
        99,
        expect.stringContaining('Ваш заказ благополучно'),
        false,
        5,
      );
    });

    it('captures errors when update fails', async () => {
      const order: any = {
        id: 11,
        reference: 'REF-11',
        unifiedShopState: UnifiedOrderState.IN_TRANSIT,
        unifiedCargoState: UnifiedOrderState.WAITING,
      };
      const updates: string[] = [];
      const errors: string[] = [];
      jest
        .spyOn(shopService, 'updateOrderStatus')
        .mockRejectedValue(new Error('boom'));

      await (service as any).syncOrderStateWithCargo(order, updates, errors);

      expect(updates).toHaveLength(0);
      expect(errors[0]).toContain('boom');
      expect(shopService.getMessagesThread).not.toHaveBeenCalled();
    });
  });
});
