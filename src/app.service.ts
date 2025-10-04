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
  constructor(
    private readonly shopService: ShopService,
    private readonly yaService: YaService,
    private readonly mailService: MailService,
    private readonly bxbService: BxbService,
    private readonly cashService: CashService,
    private readonly botService: BotService,
    private readonly dpdService: DpdService,
    private readonly postService: PostService,
  ) {}

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
    console.log(
      '[reviseOrders][fetchBatchOfStatuses] Start. Orders:',
      revisingOrderData.length,
    );
    return await Promise.allSettled(
      revisingOrderData.map((order, idx) => {
        console.log(
          `[reviseOrders][fetchBatchOfStatuses] (${idx}) cargo=${order.cargo} track=${order.track}`,
        );
        if (order.cargo === Cargos.YA) {
          console.log(
            `[reviseOrders][fetchBatchOfStatuses] (${idx}) YA cargo - skipped (recent parcels used).`,
          );
          return undefined;
        } else if (order.cargo === Cargos.BXB) {
          console.log(
            `[reviseOrders][fetchBatchOfStatuses] (${idx}) Calling bxbService.getParcelStatuses`,
          );
          return this.bxbService
            .getParcelStatuses(order.track)
            .then((r) => {
              console.log(
                `[reviseOrders][fetchBatchOfStatuses] (${idx}) bxbService success.`,
              );
              return r;
            })
            .catch((e) => {
              console.error(
                `[reviseOrders][fetchBatchOfStatuses] (${idx}) bxbService error:`,
                e?.message || e,
              );
              throw e;
            });
        } else if (order.cargo === Cargos.DPD) {
          console.log(
            `[reviseOrders][fetchBatchOfStatuses] (${idx}) Calling dpdService.getStatesByDPDOrder`,
          );
          return this.dpdService
            .getStatesByDPDOrder(order.track)
            .then((r) => {
              console.log(
                `[reviseOrders][fetchBatchOfStatuses] (${idx}) dpdService success.`,
              );
              return r;
            })
            .catch((e) => {
              console.error(
                `[reviseOrders][fetchBatchOfStatuses] (${idx}) dpdService error:`,
                e?.message || e,
              );
              throw e;
            });
        } else if (order.cargo === Cargos.POST) {
          console.log(
            `[reviseOrders][fetchBatchOfStatuses] (${idx}) Calling postService.getOperationHistory`,
          );
          return this.postService
            .getOperationHistory(order.track)
            .then((r) => {
              console.log(
                `[reviseOrders][fetchBatchOfStatuses] (${idx}) postService success.`,
              );
              return r;
            })
            .catch((e) => {
              console.error(
                `[reviseOrders][fetchBatchOfStatuses] (${idx}) postService error:`,
                e?.message || e,
              );
              throw e;
            });
        }
      }),
    );
  }

  async getDataForRevise(): Promise<RevisingOrderData[]> {
    console.log('[reviseOrders][getDataForRevise] START');
    const [ordersInTransit, recentYaParcels] = await Promise.all([
      this.shopService.getInTransitOrders(),
      this.yaService.getRecentParcels(),
    ]).catch(async (error) => {
      console.error(
        '[reviseOrders][getDataForRevise] Error in Promise.all:',
        error?.message || error,
      );
      const message =
        error instanceof Error
          ? error.message
          : 'Error in Promise.all while gathering data';
      await this.mailService.sendToAdmin('Error in Promise.all', message);
      throw new HttpException(error, HttpStatus.SERVICE_UNAVAILABLE);
    });

    console.log(
      '[reviseOrders][getDataForRevise] Data fetched. inTransit:',
      ordersInTransit.length,
      'recentYaParcels:',
      recentYaParcels?.requests?.length,
    );

    const revisingOrdersData: RevisingOrderData[] = ordersInTransit.map(
      (order, idx) => {
        const cargo = recognizeCargo(order.shipping_number);
        const unifiedState = unifyShopState(order.current_state);
        console.log(
          `[reviseOrders][getDataForRevise] Map (${idx}) ref=${order.reference} track=${order.shipping_number} cargo=${cargo} shopState=${order.current_state} unified=${unifiedState}`,
        );
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

    console.log(
      '[reviseOrders][getDataForRevise] Fetching batch statuses for',
      revisingOrdersData.length,
      'orders',
    );

    const allStatuses = await this.fetchBatchOfStatuses(revisingOrdersData);

    console.log(
      '[reviseOrders][getDataForRevise] Status batch resolved. Results:',
      allStatuses.map((r, i) => ({
        i,
        status: r.status,
        cargo: revisingOrdersData[i].cargo,
      })),
    );

    revisingOrdersData.map((order, index) => {
      let currState: string;
      const settled = allStatuses[index];
      console.log(
        `[reviseOrders][getDataForRevise] Processing (${index}) ref=${order.reference} cargo=${order.cargo} settledStatus=${settled.status}`,
      );
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
            console.log(
              `[reviseOrders][getDataForRevise] YA (${index}) resolved state=${currState}`,
            );
            break;
          }
          case Cargos.BXB: {
            if (settled.value instanceof Array && settled.value.length) {
              currState = settled.value.at(-1).Name;
            } else {
              currState = BxbParselStatus.CustomProblem;
            }
            console.log(
              `[reviseOrders][getDataForRevise] BXB (${index}) resolved state=${currState}`,
            );
            break;
          }
          case Cargos.DPD: {
            if ('return' in settled.value) {
              currState = settled.value.return.states.at(-1).newState;
            }
            console.log(
              `[reviseOrders][getDataForRevise] DPD (${index}) resolved state=${currState}`,
            );
            break;
          }
          case Cargos.POST: {
            if ('OperationHistoryData' in settled.value) {
              currState =
                settled.value.OperationHistoryData.historyRecord.at(-1)
                  .OperationParameters.OperAttr.Name;
            }
            console.log(
              `[reviseOrders][getDataForRevise] POST (${index}) resolved state=${currState}`,
            );
            break;
          }
          default:
            break;
        }
      } else {
        currState = BxbParselStatus.Unknown;
        console.warn(
          `[reviseOrders][getDataForRevise] (${index}) Promise rejected for cargo=${order.cargo}`,
          (settled as any).reason?.message || (settled as any).reason,
        );
      }

      order.actualCargoState = currState;
      order.unifiedCargoState = unifyParcelStatus(currState);
      console.log(
        `[reviseOrders][getDataForRevise] (${index}) unifiedCargoState=${order.unifiedCargoState}`,
      );
    });
    console.log('[reviseOrders][getDataForRevise] DONE');
    return revisingOrdersData;
  }

  async reviseOrders() {
    console.log('[reviseOrders] ================= START =================');
    let orders: RevisingOrderData[];
    try {
      orders = await this.getDataForRevise();
    } catch (e) {
      console.error('[reviseOrders] getDataForRevise failed:', e?.message || e);
      throw e;
    }
    console.log('[reviseOrders] Orders to process:', orders.length);

    const updates: string[] = [];
    const warnings: string[] = [];
    const errors: string[] = [];

    orders.forEach((order, idx) => {
      console.log(
        `[reviseOrders] (${idx}) ref=${order.reference} cargo=${order.cargo} shop=${order.unifiedShopState} cargo=${order.unifiedCargoState}`,
      );
      switch (true) {
        case order.unifiedShopState !== order.unifiedCargoState &&
          order.unifiedCargoState !== UnifiedOrderState.UNKNOWN &&
          order.cargo !== Cargos.DPD:
          updates.push(
            `${order.reference}:  ${order.unifiedShopState}  ⏩  ${order.unifiedCargoState}.`,
          );
          break;

        case order.unifiedShopState === UnifiedOrderState.WAITING &&
          Date.now() - 86400000 * 5 > order.shopStateUpdatedAt:
          warnings.push(
            `⌛ ${order.reference} ожидает более ${Math.floor((Date.now() - order.shopStateUpdatedAt) / 86400000)} дней, начиная с ${new Date(order.shopStateUpdatedAt).toDateString()}. Служба доставки: ${order.cargo}.`,
          );
          break;

        case order.unifiedCargoState === UnifiedOrderState.PROBLEM:
          errors.push(
            `❗ Проверьте заказ ${order.reference}, статус: ${order.actualCargoState}.`,
          );
          break;

        case order.unifiedCargoState === UnifiedOrderState.UNKNOWN:
          errors.push(
            `❗ Не удалось проверить заказ ${order.reference}, трек: ${order.track}.`,
          );
          break;
      }
    });

    console.log(
      '[reviseOrders] Aggregation done. updates:',
      updates.length,
      'warnings:',
      warnings.length,
      'errors:',
      errors.length,
    );

    const msgToEmail = [...updates, ...warnings, ...errors];

    console.log(
      '[reviseOrders] Sending email to admin. Lines:',
      msgToEmail.length,
    );
    await this.mailService
      .sendToAdmin('Status updates', msgToEmail.join('\n'))
      .catch((e) =>
        console.error(
          '[reviseOrders] mailService.sendToAdmin error:',
          e?.message || e,
        ),
      );

    console.log('[reviseOrders] Sending bot updates');
    await this.botService
      .sendEmployeeMessage(updates.join('\n'))
      .catch((e) =>
        console.error(
          '[reviseOrders] bot updates send error:',
          e?.message || e,
        ),
      );

    await this.botService
      .sendEmployeeMessage(warnings.join('\n'), false, this.botService.buGroup)
      .catch((e) =>
        console.error(
          '[reviseOrders] bot warnings send error:',
          e?.message || e,
        ),
      );

    await this.botService
      .sendEmployeeMessage(errors.join('\n'), false, this.botService.buGroup)
      .catch((e) =>
        console.error('[reviseOrders] bot errors send error:', e?.message || e),
      );

    console.log('[reviseOrders] =================  END  =================');
    return msgToEmail;
  }

  async testEndpoint() {
    return await this.yaService.getRecentParcels();
    // return await this.shopService.getOrderInfo(1);
    // return await this.bxbService.getParcelStatuses('PUXQMWBBU');
    // return await this.postService.getPostParcelData('80082713220575');
    // return await this.dpdService.getStatesByDPDOrder('');
  }
}
