import { Injectable } from '@nestjs/common';
import { ShopService } from './shop/shop.service';
import { YaService } from './ya/ya.service';
import { CreateYaOrderDto } from './ya/dto/create-ya.dto';
import { convertOrder } from './utils/convertOrder';

@Injectable()
export class AppService {
  constructor(
    private readonly shopService: ShopService,
    private readonly yaService: YaService,
  ) {}

  getHello(): string {
    return `Hello World!`;
  }

  async createYaOrder(id: number) {
    const orderDetails = await this.shopService.getOrderInfo(id);
    const addressDetails = await this.shopService.getAddressInfo(
      +orderDetails.id_address_delivery,
    );
    const customerDetails = await this.shopService.getCustomerInfo(
      +orderDetails.id_customer,
    );
    const statuses = await this.shopService.getOrderStatuses(id);

    const yaOrderData: CreateYaOrderDto = convertOrder(
      orderDetails,
      addressDetails,
      customerDetails,
      statuses,
    );

    const yaTrack = await this.yaService.createYaOrder(yaOrderData);
    return yaTrack;
  }
}
