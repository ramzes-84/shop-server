import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ShopService } from './shop/shop.service';
import { YaService } from './ya/ya.service';
import { CreateYaOrderDto } from './ya/dto/ya.dto';
import {
  convertOrder,
  convertOrderToDpd,
  convertYaOrderToCostReq,
} from './utils/convertOrder';
import { parseYaHistoryToHtml } from './utils/parseYaHistoryToHtml';
import { CreateOrderQueries } from './validation/yandex';
import { MailService } from './mail/mail.service';
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
import { FiveService } from './five/five.service';

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
      'Ваш заказ благополучно прибыл в место вручения.\nИнформацию (памятку) о статусах заказов можно получить здесь: https://mineralmagic.ru/content/8-how-to-order#status',
    [UnifiedOrderState.DELIVERED]:
      'Вам начислены баллы за заказ.\nИнформация о доступных баллах хранится в личном кабинете. Подробности здесь: https://mineralmagic.ru/blog/103_bonus.html.\n\nПожалуйста, оцените степень удовлетворённости полученным заказом: https://forms.yandex.ru/u/5e1e2772b7ccf30c3b02e3d4/',
  };
  private readonly employeeIdForMessages =
    this.resolveStateIdFromEnv('SHOP_EMPLOYEE_ID') ?? 5;

  constructor(
    private readonly shopService: ShopService,
    private readonly yaService: YaService,
    private readonly mailService: MailService,
    private readonly cashService: CashService,
    private readonly botService: BotService,
    private readonly dpdService: DpdService,
    private readonly postService: PostService,
    private readonly fiveService: FiveService,
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
    // We'll build per-order promises, but batch FIVE_POST requests to a single call
    const promises: Array<Promise<any> | undefined> = new Array(
      revisingOrderData.length,
    );

    const fiveRefs: string[] = [];
    const fiveIndices: number[] = [];
    const fiveResolvers: Array<{
      resolve: (v: any) => void;
      reject: (e: any) => void;
    }> = [];

    revisingOrderData.forEach((order, idx) => {
      if (order.cargo === Cargos.YA) {
        promises[idx] = Promise.resolve(undefined);
      } else if (order.cargo === Cargos.DPD) {
        promises[idx] = this.dpdService
          .getStatesByDPDOrder(order.track)
          .then((r) => r)
          .catch((e) => {
            throw e;
          });
      } else if (order.cargo === Cargos.POST) {
        promises[idx] = this.postService
          .getOperationHistory(order.track)
          .then((r) => r)
          .catch((e) => {
            throw e;
          });
      } else if (order.cargo === Cargos.FIVE_POST) {
        // placeholder promise to be resolved when batch result returns
        fiveRefs.push(order.reference);
        fiveIndices.push(idx);
        promises[idx] = new Promise((resolve, reject) => {
          fiveResolvers.push({ resolve, reject });
        });
      } else {
        promises[idx] = Promise.resolve(undefined);
      }
    });

    // If we have any FIVE_POST refs, fetch them in a single call and resolve placeholders
    if (fiveRefs.length > 0) {
      this.fiveService
        .getOrderStatus(fiveRefs)
        .then((results) => {
          const map = new Map<string, any>();
          for (const item of results || [])
            if (item && item.senderOrderId) map.set(item.senderOrderId, item);
          for (let i = 0; i < fiveRefs.length; i++) {
            const ref = fiveRefs[i];
            const resolver = fiveResolvers[i];
            const val = map.get(ref) ?? null;
            resolver.resolve(val);
          }
        })
        .catch((err) => {
          for (const r of fiveResolvers) r.reject(err);
        });
    }

    return await Promise.allSettled(promises);
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
      await this.botService.sendEmployeeMessage(`Promise.all: ${message}`);
      throw new HttpException(error, HttpStatus.SERVICE_UNAVAILABLE);
    });

    const revisingOrdersData: RevisingOrderData[] = ordersInTransit.map(
      (order) => {
        const cargo = recognizeCargo(order.shipping_number, order.reference);
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
          case Cargos.FIVE_POST: {
            // After batching, settled.value is the single GetOrderStatusResponseItem or null
            if (settled.value) {
              const item = settled.value as any;
              currState = item.executionStatus;
            }
            break;
          }
          default:
            break;
        }
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
          `❗ ${order.reference}: ship status "${order.actualCargoState}", but it's not allowed ${shopState} → ${cargoState}. Check manually.`,
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
            `❗ ${order.reference}: it's not allowed ${shopState} → ${cargoState}. Check manually.`,
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
        `${statusMessage} ⚠️ missing shop status mapping, please update manually.`,
      );
      return;
    }

    try {
      await this.shopService.updateOrderStatus(order.id, targetStateId);
      updates.push(`${statusMessage} ✅ Updated.`);
      await this.notifyCustomerAboutStatus(order, errors);
    } catch (error) {
      const reason =
        error instanceof Error ? error.message : String(error ?? 'Unknown');
      errors.push(
        `❗ ${order.reference}: failed to update status to ${order.unifiedCargoState} — ${reason}.`,
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
          `❗ ${order.reference}: message thread not found for customer notification.`,
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
        `❗ ${order.reference}: failed to send thread message to customer — ${reason}.`,
      );
    }
  }

  async testEndpoint() {
    return await this.fiveService.getOrderStatus(['1', '2']);
    // return await this.mailService.sendToAdmin(
    //   'Test email from shop-server',
    //   'If you see this, email sending works fine.',
    // );
    // return await this.shopService.getOrderInfo(1);
    // return await this.postService.getPostParcelData('80082713220575');
    // return await this.dpdService.getStatesByDPDOrder('');
  }
}
