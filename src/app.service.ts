import { Injectable } from '@nestjs/common';
import { ShopService } from './shop/shop.service';
import { YaService } from './ya/ya.service';
import { CreateYaOrderDto } from './ya/dto/create-ya.dto';
import { convertOrder } from './utils/convertOrder';
import { CreateYaOrderQuery } from './types/create-ya-order-query';

@Injectable()
export class AppService {
  constructor(
    private readonly shopService: ShopService,
    private readonly yaService: YaService,
  ) {}

  getHello(): string {
    return `Hello World!`;
  }

  async createYaOrder({ order, destination, source }: CreateYaOrderQuery) {
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

    const yaTrack = await this.yaService.createYaOrder(yaOrderData);
    return yaTrack;
  }
}
