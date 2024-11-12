import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ShopService } from './shop/shop.service';
import { YaService } from './ya/ya.service';
import { CreateYaOrderDto } from './ya/dto/ya.dto';
import { convertOrder } from './utils/convertOrder';
import { parseYaHistoryToHtml } from './utils/parseYaHistoryToHtml';
import { CreateOrderQueries } from './validation/yandex';
import { MailService } from './mail/mail.service';
import { reviseOrders } from './utils/reviseOrders';
import { BxbService } from './bxb/bxb.service';
import { BxbParselStatus } from './bxb/dto/bxb.dto';
import { CashService } from './cash/cash.service';
import { convertOrderShopToCash } from './utils/convert-order-shop-to-cash';
import { generateCashInvoiceMessage } from './utils/messages';
import { BotService } from './bot/bot.service';
import {
  Cargos,
  RevisingOrderData,
  TransferInterface,
  UnifiedOrderState,
} from './types/common';
import { recognizeCargo } from './utils/sort-tracks';
import { unifyParcelStatus, unifyShopState } from './utils/reviseOrdersV2';

@Injectable()
export class AppService {
  constructor(
    private readonly shopService: ShopService,
    private readonly yaService: YaService,
    private readonly mailService: MailService,
    private readonly bxbService: BxbService,
    private readonly cashService: CashService,
    private readonly botService: BotService,
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

    const revisingOrderData: RevisingOrderData[] = ordersInTransit.map(
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
    await Promise.all(
      revisingOrderData.map(async (order) => {
        let currState: string;
        if (order.cargo === Cargos.YA) {
          currState = recentYaParcels.requests
            .filter((parcel) =>
              parcel.request.info.operator_request_id.includes(order.reference),
            )
            .at(-1)?.state.status;
        } else if (order.cargo === Cargos.BXB) {
          const statusesList = await this.bxbService.getParcelStatuses(
            order.track,
          );
          if (statusesList instanceof Array) {
            currState = statusesList.at(-1).Name;
          } else {
            currState = BxbParselStatus.CustomProblem;
          }
        } else {
          currState = BxbParselStatus.Unknown;
        }
        order.actualCargoState = currState;
        order.unifiedCargoState = unifyParcelStatus(currState);
      }),
    );
    return revisingOrderData;
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
            `⌛ ${order.reference} ожидает более 5 дней, начиная с ${new Date(order.shopStateUpdatedAt).toDateString()}.`,
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

    await this.mailService.sendToAdmin(
      'Status updates',
      [...updates, ...warnings, ...errors].join('\n'),
    );
    await this.botService.sendEmployeeMessage(updates.join('\n'));
    await this.botService.sendEmployeeMessage(warnings.join('\n'));

    return [...updates, ...warnings, ...errors];
  }

  // deprecated
  async reviseOrdersStatuses(): Promise<string[]> {
    const [inTransitOrders, recentYaParcels, recentBxbRaw] = await Promise.all([
      this.shopService.getInTransitOrders(),
      this.yaService.getRecentParcels(),
      this.bxbService.getParcelsInInterval(),
    ]).catch(async (error) => {
      const message =
        error instanceof Error
          ? error.message
          : 'Error in Promise.all while gathering data';
      await this.mailService.sendToAdmin('Error in Promise.all', message);
      throw new HttpException(error, HttpStatus.SERVICE_UNAVAILABLE);
    });

    const recentBxbReferences = recentBxbRaw.map((parcel) => parcel.imid);
    const recentBxbParcelsStats = await Promise.all(
      recentBxbReferences.map((id) => this.bxbService.getParcelStatuses(id)),
    );

    const recentBxbParcels = recentBxbReferences.map((imId, index) => {
      if (Array.isArray(recentBxbParcelsStats[index])) {
        return {
          imId,
          status: recentBxbParcelsStats[index].at(-1),
        };
      } else if ('err' in recentBxbParcelsStats[index]) {
        return {
          imId,
          status: {
            Name: BxbParselStatus.CustomProblem,
            Date: new Date().toISOString().split('T')[0].replace(/-/g, ''),
          },
        };
      }
    });

    const message = reviseOrders(
      inTransitOrders,
      recentYaParcels,
      recentBxbParcels,
    );
    if (message.length) {
      try {
        await this.mailService.sendToAdmin(
          'Status updates',
          message.join('\n'),
        );
      } catch (error) {
        throw new Error(error);
      }
    }
    return message;
  }

  async testEndpoint() {
    return await this.botService.sendEmployeeMessage('Test text');
  }
}
