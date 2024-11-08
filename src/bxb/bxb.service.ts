import { HttpException, Injectable, RequestMethod } from '@nestjs/common';
import { ServicesUrl } from 'src/types/services-url';
import fetch from 'node-fetch';
import {
  ListStatusesDTO,
  OrdersOnBalanceDTO,
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

  async getParcelStatuses(imId: string) {
    const url = new URL(this.endpoint);
    url.searchParams.append('method', 'ListStatuses');
    url.searchParams.append('ImId', imId);
    const data = await this.fetchData<ListStatusesDTO>(url);
    return data;
  }

  async fetchData<T>(
    url: URL,
    method: RequestMethod = RequestMethod.GET,
  ): Promise<T> {
    url.searchParams.append('token', this.token);
    const response = await fetch(url.toString(), {
      method: RequestMethod[method],
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
