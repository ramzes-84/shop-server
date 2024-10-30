import { Injectable } from '@nestjs/common';
import { ShopService } from './shop/shop.service';
import { YaService } from './ya/ya.service';
import { CreateYaOrderDto } from './ya/dto/ya.dto';
import { convertOrder } from './utils/convertOrder';
import { parseYaHistoryToHtml } from './utils/parseYaHistoryToHtml';
import { CreateOrderQueries } from './validation/yandex';
import { TransferInterface } from './types/transfer-interface';
import { MailService } from './mail/mail.service';

@Injectable()
export class AppService {
  constructor(
    private readonly shopService: ShopService,
    private readonly yaService: YaService,
    private readonly mailService: MailService,
  ) {}

  async getHello() {
    await this.mailService.sendToAdmin();
    return `Hello World!`;
  }

  async createYaOrder({
    order,
    destination,
  }: CreateOrderQueries): Promise<TransferInterface> {
    try {
      const orderDetails = await this.shopService.getOrderInfo(+order);
      const addressDetails = await this.shopService.getAddressInfo(
        +orderDetails.id_address_delivery,
      );
      const customerDetails = await this.shopService.getCustomerInfo(
        +orderDetails.id_customer,
      );
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

  async testEndpoint(id: string) {
    return this.yaService.getOrderInfo(id);
  }
}
