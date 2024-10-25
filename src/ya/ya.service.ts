import { Injectable } from '@nestjs/common';
import fetch from 'node-fetch';
import { ServicesUrl } from 'src/types/services-url';
import {
  CreateYaOrderDto,
  YaOrderCreationRes,
  YaOrderHistoryRes,
  YaOrderInfoRes,
} from './dto/ya.dto';
import { ErrorYaResDTO } from './dto/ya-errors';

@Injectable()
export class YaService {
  token =
    process.env.NODE_ENV === 'production'
      ? process.env.YAAPI_BEARER_TOKEN
      : process.env.YAAPI_TEST_BEARER_TOKEN;
  endpoint =
    process.env.NODE_ENV === 'production'
      ? ServicesUrl.YA
      : ServicesUrl.YA_TEST;

  async getHistoryById(id: string): Promise<string | YaOrderHistoryRes> {
    const url = new URL(this.endpoint + '/request/history');
    url.searchParams.append('request_id', id);
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
    });

    if (!response.ok) {
      const errorDetails: ErrorYaResDTO = await response.json();
      return `Failed to get history from Yandex: ${response.status} ${response.statusText} - ${errorDetails.message}`;
    }

    return await response.json();
  }

  async createYaOrder(
    createYaOrderDto: CreateYaOrderDto,
  ): Promise<string | YaOrderCreationRes> {
    const url = new URL(this.endpoint + '/request/create');
    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
        'Accept-Language': 'ru',
      },
      body: JSON.stringify(createYaOrderDto),
    });

    if (!response.ok) {
      const errorDetails: ErrorYaResDTO = await response.json();
      return `Failed to create order in Yandex: ${response.status} ${response.statusText} - ${errorDetails.message}`;
    }

    return await response.json();
  }

  async getOrderInfo(request_id: string): Promise<string | YaOrderInfoRes> {
    const url = new URL(this.endpoint + '/request/info');
    url.searchParams.append('request_id', request_id);
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
    });

    if (!response.ok) {
      const errorDetails: ErrorYaResDTO = await response.json();
      return `Failed to get tracking link from Yandex: ${response.status} ${response.statusText} - ${errorDetails.message}`;
    }

    return await response.json();
  }
}
