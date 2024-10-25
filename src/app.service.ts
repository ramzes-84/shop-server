import { Injectable } from '@nestjs/common';
import { ShopService } from './shop/shop.service';
import { YaService } from './ya/ya.service';
import { CreateYaOrderDto } from './ya/dto/ya.dto';
import { convertOrder } from './utils/convertOrder';
import { parseYaHistoryToHtml } from './utils/parseYaHistoryToHtml';
import { CreateOrderQueries } from './validation/yandex';

@Injectable()
export class AppService {
  constructor(
    private readonly shopService: ShopService,
    private readonly yaService: YaService,
  ) {}

  getHello(): string {
    return `Hello World!`;
  }

  async createYaOrder({ order, destination, source }: CreateOrderQueries) {
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

    // const yaTrack = await this.yaService.createYaOrder(yaOrderData);
    // return yaTrack;

    const response = await this.yaService.createYaOrder(yaOrderData);

    if (typeof response === 'string') {
      return response;
    }

    const yaTrack = await this.getOrderInfo(response.request_id);

    if (typeof yaTrack === 'string') {
      return yaTrack;
    }

    return `Заказ успешно создан в Яндекс.Доставке. Сохраните трек: \n${yaTrack.sharing_url.replace('https://dostavka.yandex.ru/route/', '')}`;
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
