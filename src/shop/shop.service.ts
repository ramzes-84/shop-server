import { HttpException, Injectable, RequestMethod } from '@nestjs/common';
import { ServicesUrl } from 'src/types/services-url';
import fetch from 'node-fetch';
import { OrderInfoResDto } from './dto/order-info.dto';
import { AddressInfoResDto } from './dto/address-info.dto';
import { CustomerInfoResDto } from './dto/customer-info.dto';
import { StatusesInfoResDto } from './dto/statuses-info.dto';
import { OrderCarrierInfoResDto } from './dto/order-carrier-info';

@Injectable()
export class ShopService {
  token = process.env.SHOP_TOKEN;
  tokenBase64 = Buffer.from(`${this.token}:`).toString('base64');
  endpoint = ServicesUrl.SHOP;

  async getOrderInfo(id: number) {
    const url = new URL(this.endpoint + '/orders/' + id);
    const data = await this.fetchData<OrderInfoResDto>(url);
    return data.order;
  }

  async getAddressInfo(id: number) {
    const url = new URL(this.endpoint + '/addresses/' + id);
    const data = await this.fetchData<AddressInfoResDto>(url);
    return data.address;
  }

  async getCustomerInfo(id: number) {
    const url = new URL(this.endpoint + '/customers/' + id);
    const data = await this.fetchData<CustomerInfoResDto>(url);
    return data.customer;
  }

  async getOrderCarrierInfo(id: number) {
    const url = new URL(this.endpoint + '/order_carriers');
    url.searchParams.append('filter[id_order]', `[${id}]`);
    url.searchParams.append('display', 'full');
    const data = await this.fetchData<OrderCarrierInfoResDto>(url);
    return data.order_carriers[0];
  }

  async getOrderStatuses(id: number) {
    const url = new URL(this.endpoint + '/order_histories');
    url.searchParams.append('filter[id_order]', `[${id}]`);
    url.searchParams.append('display', '[id_order_state]');
    url.searchParams.append('sort', '[id_DESC]');
    const data = await this.fetchData<StatusesInfoResDto>(url);
    return data.order_histories;
  }

  async fetchData<T>(url: URL, method: RequestMethod = RequestMethod.GET) {
    url.searchParams.append('output_format', 'JSON');

    const response = await fetch(url.toString(), {
      method: RequestMethod[method],
      headers: {
        Authorization: `Basic ${this.tokenBase64}`,
      },
    });

    if (!response.ok) {
      const errorDetails = await response.text();
      throw new HttpException(
        `Failed to fetch from Shop: ${response.statusText} - ${errorDetails}`,
        response.status,
      );
    }

    const data: T = await response.json();
    return data;
  }
}
