import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ShopService } from './shop/shop.service';
import { YaService } from './ya/ya.service';
import { CreateYaOrderDto } from './ya/dto/ya.dto';
import {
  convertOrder,
  convertOrderToBxb,
  convertOrderToDpd,
  convertYaOrderToCostReq,
} from './utils/convertOrder';
import { parseYaHistoryToHtml } from './utils/parseYaHistoryToHtml';
import { CreateOrderQueries } from './validation/yandex';
import { MailService } from './mail/mail.service';
import { BxbService } from './bxb/bxb.service';
import { BxbParselStatus } from './bxb/dto/bxb.dto';
import { CashService } from './cash/cash.service';
import { convertOrderShopToCash } from './utils/convert-order-shop-to-cash';
import { generateCashInvoiceMessage } from './utils/messages';
import { BotService } from './bot/bot.service';
import { DpdService } from './dpd/dpd.service';
import {
  Cargos,
  RevisingOrderData,
  TransferInterface,
  UnifiedOrderState,
} from './types/common';
import { recognizeCargo } from './utils/sort-tracks';
import { unifyParcelStatus, unifyShopState } from './utils/reviseOrdersV2';
import { PostService } from './post/post.service';
import { findPointId } from './utils/find-point-from-messages';
import { checkDeliveryCost } from './utils/check-delivery-cost';

@Injectable()
export class AppService {
  private readonly unifiedStateTargetMap: Partial<
    Record<UnifiedOrderState, number>
  >;
  private readonly allowedTransitions: Partial<
    Record<UnifiedOrderState, Set<UnifiedOrderState>>
  > = {
    [UnifiedOrderState.IN_TRANSIT]: new Set([
      UnifiedOrderState.WAITING,
      UnifiedOrderState.DELIVERED,
    ]),
    [UnifiedOrderState.WAITING]: new Set([UnifiedOrderState.DELIVERED]),
  };
  private readonly customerStatusMessages: Partial<
    Record<UnifiedOrderState, string>
  > = {
    [UnifiedOrderState.WAITING]:
      'Рады сообщить, что судя по информации, полученной от службы доставки, Ваш заказ благополучно прибыл в место вручения.\nИнформацию (памятку) о статусах заказов можно получить здесь: https://mineralmagic.ru/content/8-how-to-order#status',
    [UnifiedOrderState.DELIVERED]:
      'Вам начислены баллы за заказ.\nИнформация о доступных баллах хранится в личном кабинете. Конвертировать баллы в купон можно в любое время там же. С подробными условиями, инструкциями и ограничениями можно ознакомиться здесь: https://mineralmagic.ru/blog/103_bonus.html.\n\nПожалуйста, помогите нам сделать магазин лучше, оцените степень удовлетворённости полученным заказом: https://forms.yandex.ru/u/5e1e2772b7ccf30c3b02e3d4/',
  };
  private readonly employeeIdForMessages =
    this.resolveStateIdFromEnv('SHOP_EMPLOYEE_ID') ?? 5;

  constructor(
    private readonly shopService: ShopService,
    private readonly yaService: YaService,
    private readonly mailService: MailService,
    private readonly bxbService: BxbService,
    private readonly cashService: CashService,
    private readonly botService: BotService,
    private readonly dpdService: DpdService,
    private readonly postService: PostService,
  ) {
    this.unifiedStateTargetMap = {
      [UnifiedOrderState.IN_TRANSIT]:
        this.resolveStateIdFromEnv('SHOP_STATUS_IN_TRANSIT') ?? 4,
      [UnifiedOrderState.WAITING]:
        this.resolveStateIdFromEnv('SHOP_STATUS_WAITING') ?? 908,
      [UnifiedOrderState.DELIVERED]:
        this.resolveStateIdFromEnv('SHOP_STATUS_DELIVERED') ?? 5,
      [UnifiedOrderState.PROBLEM]: this.resolveStateIdFromEnv(
        'SHOP_STATUS_PROBLEM',
      ),
      [UnifiedOrderState.RETURNING]: this.resolveStateIdFromEnv(
        'SHOP_STATUS_RETURNING',
      ),
    };
  }

  async getHello() {
    // await this.mailService.emitHealth();
    return `Hello World!`;
  }

  async getOrderInfo(id: string): Promise<TransferInterface> {
    try {
      const response = await this.yaService.getOrderInfo(id);
      return {
        ok: true,
        data: { sharing_url: response.sharing_url },
      };
    } catch (error) {
      return {
        ok: false,
        data: error,
      };
    }
  }

  async getOrderBasicInfo(order: string) {
    const orderDetails = await this.shopService.getOrderInfo(+order);
    const customerDetails = await this.shopService.getCustomerInfo(
      +orderDetails.id_customer,
    );
    const addressDetails = await this.shopService.getAddressInfo(
      +orderDetails.id_address_delivery,
    );

    return {
      orderDetails,
      customerDetails,
      addressDetails,
    };
  }

  async createCashInvoice({
    order,
  }: Pick<CreateOrderQueries, 'order'>): Promise<TransferInterface> {
    let message: string;
    try {
      const { addressDetails, customerDetails, orderDetails } =
        await this.getOrderBasicInfo(order);
      const cashInvoiceInfo = await this.cashService.createCashInvoice(
        convertOrderShopToCash(orderDetails, customerDetails),
      );
      message = generateCashInvoiceMessage(
        orderDetails,
        customerDetails,
        cashInvoiceInfo,
        addressDetails,
      );
      return {
        ok: true,
        data: cashInvoiceInfo.delivery_method,
      };
    } catch (error) {
      return {
        ok: false,
        data: error,
      };
    } finally {
      await this.botService.sendEmployeeMessage(
        message,
        true,
        this.botService.buGroup,
      );
    }
  }

  async createBxbOrder({
    order,
  }: CreateOrderQueries): Promise<TransferInterface> {
    try {
      const { addressDetails, customerDetails, orderDetails } =
        await this.getOrderBasicInfo(order);

      const [shippingDetails, threadId] = await Promise.all([
        this.shopService.getOrderCarrierInfo(+order),
        this.shopService.getMessagesThread(+order),
      ]);

      const destination = findPointId(
        await this.shopService.getOrderMessages(threadId),
      );

      if (!destination) {
        return {
          ok: false,
          data: 'Error: destination point not found',
        };
      }

      const bxbOrderData = convertOrderToBxb(
        orderDetails,
        addressDetails,
        customerDetails,
        shippingDetails,
        destination,
      );

      const [{ track }, { price }] = await Promise.all([
        await this.bxbService.createBoxberryParcel(bxbOrderData),
        await this.bxbService.getParcelCost(bxbOrderData),
      ]);

      this.compareDeliveryCost(
        orderDetails.total_shipping,
        price,
        bxbOrderData.order_id,
      );

      return {
        ok: true,
        data: { track },
      };
    } catch (error) {
      return {
        ok: false,
        data: error,
      };
    }
  }

  async compareDeliveryCost(
    orderCost: string,
    realCost: string,
    order: string,
  ) {
    if (checkDeliveryCost(orderCost, realCost)) {
      await this.botService.sendEmployeeMessage(
        `❗ ${order}: стоимость доставки ${orderCost} вместо ${realCost}.`,
      );
    }
  }

  async createDpdOrder({
    order,
  }: CreateOrderQueries): Promise<TransferInterface> {
    try {
      const { addressDetails, customerDetails, orderDetails } =
        await this.getOrderBasicInfo(order);

      const [shippingDetails, threadId] = await Promise.all([
        this.shopService.getOrderCarrierInfo(+order),
        this.shopService.getMessagesThread(+order),
      ]);

      const destination = findPointId(
        await this.shopService.getOrderMessages(threadId),
      );

      if (!destination) {
        return {
          ok: false,
          data: 'Error: destination point not found',
        };
      }

      const dpdOrderData = convertOrderToDpd(
        orderDetails,
        addressDetails,
        customerDetails,
        shippingDetails,
        destination,
      );

      const orderInfo = await this.dpdService.createOrder(dpdOrderData);

      if ('orderNum' in orderInfo.return) {
        return {
          ok: true,
          data: { track: orderInfo.return.orderNum },
        };
      } else {
        return {
          ok: false,
          data: orderInfo.return.errorMessage,
        };
      }
    } catch (error) {
      return {
        ok: false,
        data: error,
      };
    }
  }

  async createYaOrder({
    order,
  }: CreateOrderQueries): Promise<TransferInterface> {
    try {
      const { addressDetails, customerDetails, orderDetails } =
        await this.getOrderBasicInfo(order);

      const [shippingDetails, threadId] = await Promise.all([
        this.shopService.getOrderCarrierInfo(+order),
        this.shopService.getMessagesThread(+order),
      ]);

      const destination = findPointId(
        await this.shopService.getOrderMessages(threadId),
      );

      if (!destination) {
        return {
          ok: false,
          data: 'Error: destination point not found',
        };
      }

      const yaOrderData: CreateYaOrderDto = convertOrder(
        orderDetails,
        addressDetails,
        customerDetails,
        shippingDetails,
        destination,
      );

      const [{ request_id }, { pricing_total }] = await Promise.all([
        await this.yaService.createYaOrder(yaOrderData),
        await this.yaService.getParcelCost(
          convertYaOrderToCostReq(yaOrderData),
        ),
      ]);

      this.compareDeliveryCost(
        orderDetails.total_shipping,
        pricing_total,
        yaOrderData.info.operator_request_id,
      );

      await new Promise((resolve) => setTimeout(resolve, 5000));
      const orderInfo = await this.yaService.getOrderInfo(request_id);
      return {
        ok: true,
        data: { sharing_url: orderInfo.sharing_url },
      };
    } catch (error) {
      return {
        ok: false,
        data: error,
      };
    }
  }

  async getYaOrderHistory(id: string) {
    const response = await this.yaService.getHistoryById(id);
    if (typeof response === 'string') {
      return response;
    }
    return parseYaHistoryToHtml(response);
  }

  async fetchBatchOfStatuses(revisingOrderData: RevisingOrderData[]) {
    return await Promise.allSettled(
      revisingOrderData.map((order) => {
        if (order.cargo === Cargos.YA) {
          return undefined;
        } else if (order.cargo === Cargos.BXB) {
          return this.bxbService
            .getParcelStatuses(order.track)
            .then((r) => r)
            .catch((e) => {
              throw e;
            });
        } else if (order.cargo === Cargos.DPD) {
          return this.dpdService
            .getStatesByDPDOrder(order.track)
            .then((r) => r)
            .catch((e) => {
              throw e;
            });
        } else if (order.cargo === Cargos.POST) {
          return this.postService
            .getOperationHistory(order.track)
            .then((r) => r)
            .catch((e) => {
              throw e;
            });
        }
      }),
    );
  }

  async getDataForRevise(): Promise<RevisingOrderData[]> {
    const [ordersInTransit, recentYaParcels] = await Promise.all([
      this.shopService.getInTransitOrders(),
      this.yaService.getRecentParcels(),
    ]).catch(async (error) => {
      const message =
        error instanceof Error
          ? error.message
          : 'Error in Promise.all while gathering data';
      await this.mailService.sendToAdmin('Error in Promise.all', message);
      throw new HttpException(error, HttpStatus.SERVICE_UNAVAILABLE);
    });

    const revisingOrdersData: RevisingOrderData[] = ordersInTransit.map(
      (order) => {
        const cargo = recognizeCargo(order.shipping_number);
        const unifiedState = unifyShopState(order.current_state);
        return {
          id: order.id,
          reference: order.reference,
          track: order.shipping_number,
          cargo,
          unifiedShopState: unifiedState,
          shopStateUpdatedAt: Date.parse(order.date_upd),
        };
      },
    );

    const allStatuses = await this.fetchBatchOfStatuses(revisingOrdersData);

    revisingOrdersData.map((order, index) => {
      let currState: string;
      const settled = allStatuses[index];
      if (settled.status === 'fulfilled') {
        switch (order.cargo) {
          case Cargos.YA: {
            currState = recentYaParcels.requests
              .filter((parcel) =>
                parcel.request.info.operator_request_id.startsWith(
                  order.reference,
                ),
              )
              .at(0)?.state.status;
            break;
          }
          case Cargos.BXB: {
            if (settled.value instanceof Array && settled.value.length) {
              currState = settled.value.at(-1).Name;
            } else {
              currState = BxbParselStatus.CustomProblem;
            }
            break;
          }
          case Cargos.DPD: {
            if ('return' in settled.value) {
              currState = settled.value.return.states.at(-1).newState;
            }
            break;
          }
          case Cargos.POST: {
            if ('OperationHistoryData' in settled.value) {
              currState =
                settled.value.OperationHistoryData.historyRecord.at(-1)
                  .OperationParameters.OperAttr.Name;
            }
            break;
          }
          default:
            break;
        }
      } else {
        currState = BxbParselStatus.Unknown;
      }

      order.actualCargoState = currState;
      order.unifiedCargoState = unifyParcelStatus(currState);
    });
    return revisingOrdersData;
  }

  async reviseOrders() {
    let orders: RevisingOrderData[];
    try {
      orders = await this.getDataForRevise();
    } catch (e) {
      throw e;
    }

    const updates: string[] = [];
    const warnings: string[] = [];
    const errors: string[] = [];

    const now = Date.now();

    for (const order of orders) {
      const cargoState = order.unifiedCargoState;
      const shopState = order.unifiedShopState;

      if (
        cargoState &&
        (cargoState === UnifiedOrderState.PROBLEM ||
          cargoState === UnifiedOrderState.RETURNING)
      ) {
        errors.push(
          `❗ ${order.reference}: доставка сообщает статус "${order.actualCargoState}", магазин не поддерживает автоматический переход ${shopState} → ${cargoState}. Проверьте вручную.`,
        );
        continue;
      }

      if (
        cargoState &&
        shopState !== cargoState &&
        cargoState !== UnifiedOrderState.UNKNOWN &&
        order.cargo !== Cargos.DPD
      ) {
        if (!this.canAutoTransition(shopState, cargoState)) {
          errors.push(
            `❗ ${order.reference}: переход ${shopState} → ${cargoState} запрещен. Проверьте заказ вручную.`,
          );
          continue;
        }

        await this.syncOrderStateWithCargo(order, updates, errors);
        continue;
      }

      if (
        shopState === UnifiedOrderState.WAITING &&
        now - 86400000 * 5 > order.shopStateUpdatedAt
      ) {
        warnings.push(
          `⌛ ${order.reference} ожидает более ${Math.floor((now - order.shopStateUpdatedAt) / 86400000)} дней, начиная с ${new Date(order.shopStateUpdatedAt).toDateString()}. Служба доставки: ${order.cargo}.`,
        );
        continue;
      }

      if (cargoState === UnifiedOrderState.UNKNOWN) {
        errors.push(
          `❗ Не удалось проверить заказ ${order.reference}, трек: ${order.track}.`,
        );
      }
    }

    const msgToEmail = [...updates, ...warnings, ...errors];
    await this.mailService
      .sendToAdmin('Status updates', msgToEmail.join('\n'))
      .catch((e) => e);
    await this.botService
      .sendEmployeeMessage(updates.join('\n'))
      .catch((e) => e);

    await this.botService
      .sendEmployeeMessage(warnings.join('\n'), false, this.botService.buGroup)
      .catch((e) => e);

    await this.botService
      .sendEmployeeMessage(errors.join('\n'), false, this.botService.buGroup)
      .catch((e) => e);
    return msgToEmail;
  }

  private resolveStateIdFromEnv(envKey: string): number | undefined {
    const rawValue = process.env[envKey];
    if (!rawValue) {
      return undefined;
    }
    const parsed = Number(rawValue);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  private getTargetShopStateId(state: UnifiedOrderState) {
    return this.unifiedStateTargetMap[state];
  }

  private canAutoTransition(
    fromState: UnifiedOrderState,
    toState: UnifiedOrderState,
  ) {
    return this.allowedTransitions[fromState]?.has(toState) ?? false;
  }

  private async syncOrderStateWithCargo(
    order: RevisingOrderData,
    updates: string[],
    errors: string[],
  ) {
    if (!order.unifiedCargoState) {
      return;
    }

    const statusMessage = `${order.reference}:  ${order.unifiedShopState}  ⏩  ${order.unifiedCargoState}.`;
    const targetStateId = this.getTargetShopStateId(order.unifiedCargoState);

    if (!targetStateId) {
      updates.push(
        `${statusMessage} ⚠️ отсутствует сопоставление статуса магазина, обновите вручную.`,
      );
      return;
    }

    try {
      await this.shopService.updateOrderStatus(order.id, targetStateId);
      updates.push(`${statusMessage} ✅ обновлен автоматически.`);
      await this.notifyCustomerAboutStatus(order, errors);
    } catch (error) {
      const reason =
        error instanceof Error ? error.message : String(error ?? 'Unknown');
      errors.push(
        `❗ ${order.reference}: не удалось обновить статус до ${order.unifiedCargoState} — ${reason}.`,
      );
    }
  }

  private formatCustomerStatusMessage(
    reference: string,
    state: UnifiedOrderState,
  ) {
    const message = this.customerStatusMessages[state];
    if (!message) {
      return undefined;
    }

    return message.replace('{reference}', reference);
  }

  private async notifyCustomerAboutStatus(
    order: RevisingOrderData,
    errors: string[],
  ) {
    const newState = order.unifiedCargoState;
    if (!newState) {
      return;
    }

    try {
      const threadId = await this.shopService.getMessagesThread(order.id);
      if (!threadId) {
        errors.push(
          `❗ ${order.reference}: не найдена ветка сообщений для уведомления клиента.`,
        );
        return;
      }

      const customerMessage = this.formatCustomerStatusMessage(
        order.reference,
        newState,
      );

      if (!customerMessage) {
        return;
      }

      await this.shopService.addMessageToThread(
        threadId,
        customerMessage,
        false,
        this.employeeIdForMessages,
      );
    } catch (error) {
      const reason =
        error instanceof Error ? error.message : String(error ?? 'Unknown');
      errors.push(
        `❗ ${order.reference}: не удалось отправить уведомление клиенту — ${reason}.`,
      );
    }
  }

  async testEndpoint() {
    return await this.mailService.sendToAdmin(
      'Test email from shop-server',
      'If you see this, email sending works fine.',
    );
    // return await this.shopService.getOrderInfo(1);
    // return await this.bxbService.getParcelStatuses('PUXQMWBBU');
    // return await this.postService.getPostParcelData('80082713220575');
    // return await this.dpdService.getStatesByDPDOrder('');
  }
}
