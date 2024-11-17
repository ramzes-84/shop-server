import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ShopService } from './shop/shop.service';
import { YaService } from './ya/ya.service';
import { CreateYaOrderDto } from './ya/dto/ya.dto';
import { convertOrder } from './utils/convertOrder';
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
    await this.mailService.emitHealth();
    return `Hello World!`;
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
      await this.mailService.sendToAdmin('Invoice info', message);
      await this.botService.sendEmployeeMessage(message, true);
    }
  }

  async createYaOrder({
    order,
    destination,
  }: CreateOrderQueries): Promise<TransferInterface> {
    try {
      const { addressDetails, customerDetails, orderDetails } =
        await this.getOrderBasicInfo(order);

      const shippingDetails =
        await this.shopService.getOrderCarrierInfo(+order);

      const yaOrderData: CreateYaOrderDto = convertOrder(
        orderDetails,
        addressDetails,
        customerDetails,
        shippingDetails,
        destination,
      );

      const yaOrderId = await this.yaService.createYaOrder(yaOrderData);
      return {
        ok: true,
        data: yaOrderId,
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
          return this.bxbService.getParcelStatuses(order.track);
        } else if (order.cargo === Cargos.DPD) {
          return this.dpdService.getStatesByDPDOrder(order.track);
        } else if (order.cargo === Cargos.POST) {
          return this.postService.getOperationHistory(order.track);
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
        return {
          id: order.id,
          reference: order.reference,
          track: order.shipping_number,
          cargo: recognizeCargo(order.shipping_number),
          unifiedShopState: unifyShopState(order.current_state),
          shopStateUpdatedAt: Date.parse(order.date_upd),
        };
      },
    );

    const allStatuses = await this.fetchBatchOfStatuses(revisingOrdersData);

    revisingOrdersData.map((order, index) => {
      let currState: string;
      if (allStatuses[index].status === 'fulfilled') {
        switch (order.cargo) {
          case Cargos.YA: {
            currState = recentYaParcels.requests
              .filter((parcel) =>
                parcel.request.info.operator_request_id.includes(
                  order.reference,
                ),
              )
              .at(-1)?.state.status;
            break;
          }
          case Cargos.BXB: {
            if (
              allStatuses[index].value instanceof Array &&
              allStatuses[index].value.length
            ) {
              currState = allStatuses[index].value.at(-1).Name;
            } else {
              currState = BxbParselStatus.CustomProblem;
            }
            break;
          }
          case Cargos.DPD: {
            if ('return' in allStatuses[index].value) {
              currState =
                allStatuses[index].value.return.states.at(-1).newState;
            }
            break;
          }
          case Cargos.POST: {
            if ('OperationHistoryData' in allStatuses[index].value) {
              currState =
                allStatuses[index].value.OperationHistoryData.historyRecord.at(
                  -1,
                ).OperationParameters.OperAttr.Name;
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
    const updates: string[] = [];
    const warnings: string[] = [];
    const errors: string[] = [];
    const orders = await this.getDataForRevise();

    orders.forEach((order) => {
      switch (true) {
        case order.unifiedShopState !== order.unifiedCargoState &&
          order.unifiedCargoState !== UnifiedOrderState.UNKNOWN:
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

    const msgToEmail = [...updates, ...warnings, ...errors];

    await this.mailService.sendToAdmin('Status updates', msgToEmail.join('\n'));
    await this.botService.sendEmployeeMessage(updates.join('\n'));
    await this.botService.sendEmployeeMessage(warnings.join('\n'));
    await this.botService.sendEmployeeMessage(errors.join('\n'));

    return msgToEmail;
  }

  async testEndpoint() {
    const orders = await this.getDataForRevise();
    return await this.fetchBatchOfStatuses(orders);
  }
}
