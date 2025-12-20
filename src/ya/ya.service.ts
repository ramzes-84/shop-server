import {
  HttpException,
  HttpStatus,
  Injectable,
  RequestMethod,
} from '@nestjs/common';
import fetch from 'node-fetch';
import { ServicesUrl } from 'src/types/services-url';
import {
  CreateYaOrderDto,
  YaCostCalculationReqDto,
  YaCostResDto,
  YaOrderCreationRes,
  YaOrderHistoryRes,
  YaOrderInfoRes,
  YaRecentParcelsRes,
  YaTrackInfo,
} from './dto/ya.dto';
import { ErrorYaResDTO } from './dto/ya-errors';

@Injectable()
export class YaService {
  private readonly token = process.env.YAAPI_BEARER_TOKEN;
  private readonly endpoint = ServicesUrl.YA;

  async getHistoryById(id: string): Promise<YaOrderHistoryRes> {
    const url = new URL(this.endpoint + '/request/history');
    url.searchParams.append('request_id', id);
    const response = await this.fetchData<YaOrderHistoryRes>(url);
    return response;
  }

  async getRecentParcels() {
    const url = new URL(this.endpoint + '/requests/info');
    const headers = {
      'Content-Type': 'application/json',
      'Accept-Language': 'ru',
    };
    const interval = {
      from: new Date(Date.now() - 86400000 * 30).toISOString(),
      to: new Date(Date.now()).toISOString(),
    };
    const response = await this.fetchData<YaRecentParcelsRes>(
      url,
      RequestMethod.POST,
      headers,
      JSON.stringify(interval),
    );
    return response;
  }

  async findTrackByOrderReference(reference: string): Promise<YaTrackInfo> {
    const parcels = await this.getRecentParcels();
    const matchedParcel = parcels.requests.find((parcel) =>
      parcel.request.info.operator_request_id.startsWith(reference),
    );

    if (!matchedParcel) {
      throw new HttpException(
        `Yandex order with reference ${reference} not found`,
        HttpStatus.NOT_FOUND,
      );
    }

    const orderInfo = await this.getOrderInfo(matchedParcel.request_id);

    const trackNumber =
      orderInfo.request.items?.[0]?.place_barcode ?? matchedParcel.request_id;

    return {
      reference: orderInfo.request.info.operator_request_id,
      requestId: orderInfo.request_id,
      trackNumber,
      sharingUrl: orderInfo.sharing_url,
      status: orderInfo.state.status,
    };
  }

  async createYaOrder(
    createYaOrderDto: CreateYaOrderDto,
  ): Promise<YaOrderCreationRes> {
    const url = new URL(this.endpoint + '/request/create');
    const body = JSON.stringify(createYaOrderDto);
    const headers = {
      'Content-Type': 'application/json',
      'Accept-Language': 'ru',
    };
    const response = await this.fetchData<YaOrderCreationRes>(
      url,
      RequestMethod.POST,
      headers,
      body,
    );
    return response;
  }

  async getParcelCost(order: YaCostCalculationReqDto) {
    const url = new URL(this.endpoint + '/pricing-calculator');
    const body = JSON.stringify(order);
    const headers = {
      'Content-Type': 'application/json',
      'Accept-Language': 'ru',
    };
    const response = await this.fetchData<YaCostResDto>(
      url,
      RequestMethod.POST,
      headers,
      body,
    );
    return response;
  }

  async getOrderInfo(request_id: string): Promise<YaOrderInfoRes> {
    const url = new URL(this.endpoint + '/request/info');
    url.searchParams.append('request_id', request_id);
    const response = await this.fetchData<YaOrderInfoRes>(url);
    return response;
  }

  async fetchData<T>(
    url: URL,
    method: RequestMethod = RequestMethod.GET,
    headers?: Record<string, string>,
    body?: string,
  ) {
    const response = await fetch(url.toString(), {
      method: RequestMethod[method],
      headers: {
        Authorization: `Bearer ${this.token}`,
        ...headers,
      },
      body,
    });

    if (!response.ok) {
      const errorDetails: ErrorYaResDTO = await response.json();
      throw new HttpException(errorDetails, response.status);
    }

    const data: T = await response.json();
    return data;
  }
}
