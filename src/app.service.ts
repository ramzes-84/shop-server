import { Injectable } from '@nestjs/common';
import { ShopService } from './shop/shop.service';
import { YaService } from './ya/ya.service';
import { CreateYaOrderDto } from './ya/dto/ya.dto';
import { convertOrder } from './utils/convertOrder';
import { parseYaHistoryToHtml } from './utils/parseYaHistoryToHtml';
import { CreateOrderQueries } from './validation/yandex';
import { TransferInterface } from './types/transfer-interface';

@Injectable()
export class AppService {
  constructor(
    private readonly shopService: ShopService,
    private readonly yaService: YaService,
  ) {}

  getHello(): string {
    return `Hello World!`;
  }

  async createYaOrder({
    order,
    destination,
    source,
  }: CreateOrderQueries): Promise<TransferInterface> {
    try {
      const orderDetails = await this.shopService.getOrderInfo(+order);
      const addressDetails = await this.shopService.getAddressInfo(
        +orderDetails.id_address_delivery,
      );
      const customerDetails = await this.shopService.getCustomerInfo(
        +orderDetails.id_customer,
      );

      const yaOrderData: CreateYaOrderDto = convertOrder(
        orderDetails,
        addressDetails,
        customerDetails,
        destination,
        source,
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

  async trackYaOrder(id: string) {
    const response = await this.yaService.getHistoryById(id);
    if (typeof response === 'string') {
      return response;
    }
    return parseYaHistoryToHtml(response);
  }

  async getOrderInfo(id: string) {
    const response = await this.yaService.getOrderInfo(id);
    if (typeof response === 'string') {
      return response;
    }
    return response;
  }
}
