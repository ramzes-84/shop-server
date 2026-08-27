import { HttpException, Injectable, RequestMethod } from '@nestjs/common';
import { ServicesUrl } from 'src/types/services-url';
import { fetchWithTimeout } from 'src/common/fetch-with-timeout';
import {
  CustomerMessagesResDto,
  OrderInfoResDto,
  OrderMessagesThreadResDto,
} from './dto/order-info.dto';
import { AddressInfoResDto } from './dto/address-info.dto';
import { CustomerInfoResDto } from './dto/customer-info.dto';
import { StatusesInfoResDto } from './dto/statuses-info.dto';
import { OrderCarrierInfoResDto } from './dto/order-carrier-info.dto';
import { DOMParser, XMLSerializer } from '@xmldom/xmldom';
import { InTransitOrders } from './dto/in-transit-orders.dto';

@Injectable()
export class ShopService {
  private readonly token = process.env.SHOP_TOKEN;
  private readonly tokenBase64 = Buffer.from(`${this.token}:`).toString(
    'base64',
  );
  private readonly endpoint = ServicesUrl.SHOP;

  async getOrderInfo(id: number) {
    const url = new URL(this.endpoint + '/orders/' + id);
    const data = await this.fetchData<OrderInfoResDto>(url);
    return data.order;
  }

  async getOrderInfoXML(id: number) {
    const url = new URL(this.endpoint + '/orders/' + id);
    const data = await this.fetchData<string>(url, RequestMethod.GET, true);
    const xmlDoc = new DOMParser().parseFromString(data, 'text/xml');
    // const reference = xmlDoc.getElementsByTagName('reference')[0].textContent;
    const serializedDoc = new XMLSerializer().serializeToString(xmlDoc);
    return serializedDoc;
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

  async getMessagesThread(id: number) {
    const url = new URL(this.endpoint + '/customer_threads');
    url.searchParams.append('filter[id_order]', `[${id}]`);
    url.searchParams.append('display', '[id]');
    const data = await this.fetchData<OrderMessagesThreadResDto>(url);
    return data.customer_threads[0].id;
  }

  async getOrderMessages(id: number) {
    const url = new URL(this.endpoint + '/customer_messages');
    url.searchParams.append('filter[id_customer_thread]', `[${id}]`);
    url.searchParams.append('display', 'full');
    url.searchParams.append('sort', '[id_DESC]');
    const data = await this.fetchData<CustomerMessagesResDto>(url);
    return data.customer_messages;
  }

  async getInTransitOrders() {
    const url = new URL(this.endpoint + '/orders');
    url.searchParams.append('filter[current_state]', `[4|908]`);
    url.searchParams.append(
      'display',
      '[id,current_state,reference,date_upd,shipping_number]',
    );
    const data = await this.fetchData<InTransitOrders>(url);
    return data.orders;
  }

  async fetchData<T>(
    url: URL,
    method: RequestMethod = RequestMethod.GET,
    inXML = false,
    body?: string,
    additionalHeaders: Record<string, string> = {},
  ): Promise<T> {
    let data: T;
    if (!inXML && method === RequestMethod.GET) {
      url.searchParams.append('output_format', 'JSON');
    }

    const response = await fetchWithTimeout(url.toString(), {
      method: RequestMethod[method],
      headers: {
        Authorization: `Basic ${this.tokenBase64}`,
        ...additionalHeaders,
      },
      body,
    });

    if (!response.ok) {
      const errorDetails = await response.text();
      throw new HttpException(
        `Failed to fetch from Shop: ${response.statusText} - ${errorDetails}`,
        response.status,
      );
    }

    const resType = response.headers.get('content-type');

    if (resType && resType.includes('text/xml')) {
      data = (await response.text()) as unknown as T;
    } else {
      data = await response.json();
    }

    return data;
  }

  async updateOrderStatus(orderId: number, orderStateId: number) {
    const url = new URL(this.endpoint + '/order_histories');
    const payload = `<?xml version="1.0" encoding="UTF-8"?>
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
  <order_history>
    <id_order_state>${orderStateId}</id_order_state>
    <id_order>${orderId}</id_order>
  </order_history>
</prestashop>`;

    await this.fetchData<string>(url, RequestMethod.POST, true, payload, {
      'Content-Type': 'application/xml',
    });
  }

  async addMessageToThread(
    threadId: number,
    message: string,
    isPrivate = false,
    employeeId?: number,
  ) {
    const url = new URL(this.endpoint + '/customer_messages');
    const employeeBlock = employeeId
      ? `    <id_employee>${employeeId}</id_employee>\n`
      : '';
    const payload = `<?xml version="1.0" encoding="UTF-8"?>
<prestashop xmlns:xlink="http://www.w3.org/1999/xlink">
  <customer_message>
    <id_customer_thread>${threadId}</id_customer_thread>
${employeeBlock}    <message>${this.escapeXml(message)}</message>
    <private>${isPrivate ? 1 : 0}</private>
  </customer_message>
</prestashop>`;

    await this.fetchData<string>(url, RequestMethod.POST, true, payload, {
      'Content-Type': 'application/xml',
    });
  }

  private escapeXml(value: string) {
    if (!value) {
      return '';
    }

    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}
