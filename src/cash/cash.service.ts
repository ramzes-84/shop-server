import { HttpException, Injectable, RequestMethod } from '@nestjs/common';
import {
  CashInvoiceInfoDto,
  CreateCashInvoiceDto,
  ErrorCashResDTO,
} from './dto/cash.dto';
import fetch from 'node-fetch';
import { ServicesUrl } from 'src/types/services-url';

@Injectable()
export class CashService {
  private readonly token = process.env.CASH_TOKEN;
  private readonly endpoint = ServicesUrl.CASH;
  private readonly tokenBase64 = Buffer.from(`${this.token}:`).toString(
    'base64',
  );

  async createCashInvoice(
    createCashInvoice: CreateCashInvoiceDto,
  ): Promise<CashInvoiceInfoDto> {
    const url = new URL(this.endpoint);
    const body = JSON.stringify(createCashInvoice);
    const headers = {
      'Content-Type': 'application/json',
      'Idempotence-Key': `${createCashInvoice.metadata.order_id}-${Date.now()}`,
    };
    const response = await this.fetchData<CashInvoiceInfoDto>(
      url,
      RequestMethod.POST,
      headers,
      body,
    );
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
        Authorization: `Basic ${this.tokenBase64}`,
        ...headers,
      },
      body,
    });

    if (!response.ok) {
      const errorDetails: ErrorCashResDTO = await response.json();
      throw new HttpException(errorDetails, response.status);
    }

    const data: T = await response.json();
    return data;
  }
}
