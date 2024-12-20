import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ShopService } from './shop/shop.service';
import { YaService } from './ya/ya.service';
import { CreateYaOrderDto } from './ya/dto/ya.dto';
import { convertOrder } from './utils/convertOrder';
import { parseYaHistoryToHtml } from './utils/parseYaHistoryToHtml';
import { CreateOrderQueries } from './validation/yandex';
import { TransferInterface } from './types/transfer-interface';
import { MailService } from './mail/mail.service';
import { reviseOrders } from './utils/reviseOrders';
import { BxbService } from './bxb/bxb.service';
import { ParselStatus } from './bxb/dto/bxb.dto';
import { CashService } from './cash/cash.service';
import { convertOrderShopToCash } from './utils/convert-order-shop-to-cash';
import { generateCashInvoiceMessage } from './utils/messages';

@Injectable()
export class AppService {
  constructor(
    private readonly shopService: ShopService,
    private readonly yaService: YaService,
    private readonly mailService: MailService,
    private readonly bxbService: BxbService,
    private readonly cashService: CashService,
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
    try {
      const { addressDetails, customerDetails, orderDetails } =
        await this.getOrderBasicInfo(order);
      const cashInvoiceInfo = await this.cashService.createCashInvoice(
        convertOrderShopToCash(orderDetails),
      );
      const message = generateCashInvoiceMessage(
        orderDetails,
        customerDetails,
        cashInvoiceInfo,
      );
      await this.mailService.send(
        'Выставлен счёт на оплату (Магазин MINERAL MAGIC)',
        message,
        customerDetails.email,
      );
      await this.mailService.sendToAdmin(
        `Отправить SMS о выставлении счёта ${addressDetails.phone_mobile}`,
        message,
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
            Name: ParselStatus.CustomProblem,
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
    return await this.bxbService.getParcelsInInterval();
  }
}
