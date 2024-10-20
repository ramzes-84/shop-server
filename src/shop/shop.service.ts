import { Injectable } from '@nestjs/common';
import { ServicesUrl } from 'src/types/services-url';
import fetch from 'node-fetch';
import { OrderInfoResDto } from './dto/order-info.dto';
import { AddressInfoResDto } from './dto/address-info.dto';
import { CustomerInfoResDto } from './dto/customer-info.dto';
import { StatusesInfoResDto } from './dto/statuses-info.dto';

@Injectable()
export class ShopService {
  token = process.env.SHOP_TOKEN;
  tokenBase64 = Buffer.from(`${this.token}:`).toString('base64');
  endpoint = ServicesUrl.SHOP;

  async getOrderInfo(id: number) {
    const url = new URL(this.endpoint + '/orders/' + id);
    url.searchParams.append('output_format', 'JSON');

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        Authorization: `Basic ${this.tokenBase64}`,
      },
    });

    if (!response.ok) {
      const errorDetails = await response.text();
      throw new Error(
        `Failed to get order from Shop: ${response.status} ${response.statusText} - ${errorDetails}`,
      );
    }

    const data: OrderInfoResDto = await response.json();

    return data.order;
  }

  async getAddressInfo(id: number) {
    const url = new URL(this.endpoint + '/addresses/' + id);
    url.searchParams.append('output_format', 'JSON');

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        Authorization: `Basic ${this.tokenBase64}`,
      },
    });

    if (!response.ok) {
      const errorDetails = await response.text();
      throw new Error(
        `Failed to get address from Shop: ${response.status} ${response.statusText} - ${errorDetails}`,
      );
    }

    const data: AddressInfoResDto = await response.json();

    return data.address;
  }

  async getCustomerInfo(id: number) {
    const url = new URL(this.endpoint + '/customers/' + id);
    url.searchParams.append('output_format', 'JSON');

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        Authorization: `Basic ${this.tokenBase64}`,
      },
    });

    if (!response.ok) {
      const errorDetails = await response.text();
      throw new Error(
        `Failed to get customer from Shop: ${response.status} ${response.statusText} - ${errorDetails}`,
      );
    }

    const data: CustomerInfoResDto = await response.json();

    return data.customer;
  }

  async getOrderStatuses(id: number) {
    const url = new URL(this.endpoint + '/order_histories');
    url.searchParams.append('output_format', 'JSON');
    url.searchParams.append('filter[id_order]', `[${id}]`);
    url.searchParams.append('display', '[id_order_state]');
    url.searchParams.append('sort', '[id_DESC]');

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        Authorization: `Basic ${this.tokenBase64}`,
      },
    });

    if (!response.ok) {
      const errorDetails = await response.text();
      throw new Error(
        `Failed to get order status from Shop: ${response.status} ${response.statusText} - ${errorDetails}`,
      );
    }

    const data: StatusesInfoResDto = await response.json();

    return data.order_histories;
  }
}
