import { Injectable } from '@nestjs/common';
import { ServicesUrl } from 'src/types/services-url';

@Injectable()
export class ShopService {
  token = process.env.SHOP_TOKEN;
  endpoint = ServicesUrl.SHOP;

  create() {
    return 'This action adds a new shop';
  }

  findAll() {
    return `This action returns all shop`;
  }

  findOne(id: number) {
    return `This action returns a #${id} shop`;
  }

  update(id: number) {
    return `This action updates a #${id} shop`;
  }

  remove(id: number) {
    return `This action removes a #${id} shop`;
  }
}
