import { HttpException, Injectable, RequestMethod } from '@nestjs/common';
import { ServicesUrl } from 'src/types/services-url';
import fetch from 'node-fetch';
import {
  BxbOrderCreationRes,
  CreateBxbParcelDto,
  ListStatusesDTO,
  OrdersOnBalanceDTO,
  ParcelCostResDTO,
  ParcelsStoryDTO,
} from './dto/bxb.dto';

@Injectable()
export class BxbService {
  private readonly token = process.env.BB_TOKEN;
  private readonly endpoint = ServicesUrl.BB;

  async getParcelsInInterval() {
    const url = new URL(this.endpoint);
    url.searchParams.append('method', 'ParselStory');
    url.searchParams.append(
      'to',
      new Date().toISOString().split('T')[0].replace(/-/g, ''),
    );
    url.searchParams.append(
      'from',
      new Date(Date.now() - 86400000 * 30)
        .toISOString()
        .split('T')[0]
        .replace(/-/g, ''),
    );
    const data = await this.fetchData<ParcelsStoryDTO>(url);
    return data;
  }

  async getInProgressParcels() {
    const url = new URL(this.endpoint);
    url.searchParams.append('method', 'OrdersBalance');
    const data = await this.fetchData<OrdersOnBalanceDTO>(url);
    return data;
  }

  async getParcelCost(order: Partial<CreateBxbParcelDto['sdata']>) {
    const url = new URL(this.endpoint);
    url.searchParams.append('method', 'DeliveryCosts');
    url.searchParams.append('ordersum', order.price);
    url.searchParams.append('paysum', order.payment_sum);
    url.searchParams.append('targetstart', order.shop.name1);
    url.searchParams.append('target', order.shop.name);
    url.searchParams.append('weight', order.weights.weight);
    url.searchParams.append('height', order.weights.z);
    url.searchParams.append('width', order.weights.x);
    url.searchParams.append('depth', order.weights.y);
    const data = await this.fetchData<ParcelCostResDTO>(url);
    return data;
  }

  async getParcelStatuses(imId: string) {
    const url = new URL(this.endpoint);
    url.searchParams.append('method', 'ListStatuses');
    url.searchParams.append('ImId', imId);
    const data = await this.fetchData<ListStatusesDTO>(url);
    return data;
  }

  async createBoxberryParcel(info: CreateBxbParcelDto['sdata']) {
    const url = new URL(this.endpoint);
    // url.searchParams.append('method', 'ParselCreate');

    const body: CreateBxbParcelDto = {
      sdata: info,
      token: this.token,
      method: 'ParselCreate',
    };

    const data = await this.fetchData<BxbOrderCreationRes>(
      url,
      RequestMethod.POST,
      body,
    );
    return data;
  }

  async fetchData<T>(
    url: URL,
    method: RequestMethod = RequestMethod.GET,
    body?: CreateBxbParcelDto,
  ): Promise<T> {
    if (!body) url.searchParams.append('token', this.token);
    const headers = {
      'Content-Type': 'application/json',
      'Accept-Language': 'ru',
    };

    const response = await fetch(url.toString(), {
      method: RequestMethod[method],
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorDetails = await response.text();
      throw new HttpException(
        `Failed to fetch from BB: ${response.statusText} - ${errorDetails}`,
        response.status,
      );
    }

    const data: T = await response.json();

    return data;
  }
}
