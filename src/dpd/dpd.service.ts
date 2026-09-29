import { Injectable } from '@nestjs/common';
import { ServicesUrl } from 'src/types/services-url';
import * as soap from 'soap';
import {
  CreatingOrderRequest,
  DpdCreationResDTO,
  DpdOrderResult,
  DpdRequestDTO,
  DpdStatesResDTO,
  TrackingRequest,
} from './dto/dpd.dto';
import { EXTERNAL_REQUEST_TIMEOUT_MS } from 'src/common/fetch-with-timeout';

@Injectable()
export class DpdService {
  token = process.env.DPD_TOKEN!;
  trackingEndpoint = ServicesUrl.DPD + 'tracing1-1?wsdl';
  createEndpoint = ServicesUrl.DPD + 'order2?wsdl';
  clientNumber = process.env.DPD_CLIENT!;

  // createOrder2 обрабатывает адрес и формирует данные для чека (54-ФЗ) — заметно
  // дольше, чем чтение статусов. При стандартном таймауте (10 с) соединение иногда
  // рвётся до получения ответа (axios "stream has been aborted"), хотя DPD успевает
  // создать заказ — сотрудник получает ошибку про несуществующую отправку.
  private readonly createOrderTimeoutMs = 30_000;

  async getStatesByDPDOrder(dpdOrderNr: string): Promise<DpdStatesResDTO> {
    const args: DpdRequestDTO<TrackingRequest> = {
      request: {
        auth: { clientNumber: +this.clientNumber, clientKey: this.token },
        dpdOrderNr,
      },
    };

    return new Promise((resolve, reject) => {
      // Таймаут нужен дважды: на загрузку WSDL и на сам вызов — зависнуть может любой из них.
      soap.createClient(
        this.trackingEndpoint,
        { wsdl_options: { timeout: EXTERNAL_REQUEST_TIMEOUT_MS } },
        (err, client) => {
          if (err) {
            return reject(err);
          }

          client.getStatesByDPDOrder(
            args,
            (err: unknown, result: DpdStatesResDTO) => {
              if (err) {
                return reject(err);
              }
              resolve(result);
            },
            { timeout: EXTERNAL_REQUEST_TIMEOUT_MS },
          );
        },
      );
    });
  }

  /**
   * Регистрирует отправку через createOrder2 (order2?wsdl). Внешний тег запроса — "orders",
   * ответ — "return": DPD объявляет его как maxOccurs="unbounded" даже для одного заказа в запросе,
   * а node-soap может развернуть массив из одного элемента в голый объект — нормализуем сами.
   */
  async createOrder(orders: CreatingOrderRequest): Promise<DpdOrderResult> {
    return new Promise((resolve, reject) => {
      soap.createClient(
        this.createEndpoint,
        { wsdl_options: { timeout: this.createOrderTimeoutMs } },
        (err, client) => {
          if (err) {
            return reject(err);
          }

          client.createOrder2(
            { orders },
            (err: unknown, result: DpdCreationResDTO) => {
              if (err) {
                return reject(err);
              }

              const results = Array.isArray(result.return)
                ? result.return
                : [result.return];
              resolve(results[0]);
            },
            { timeout: this.createOrderTimeoutMs },
          );
        },
      );
    });
  }

  /**
   * Сверка после обрыва соединения при createOrder2: сама документация DPD рекомендует
   * getOrderStatus по orderNumberInternal, чтобы узнать, успел ли заказ создаться, не
   * дожидаясь ответа исходного запроса (раздел "Delivery order creation" в руководстве).
   * Возвращает пустой массив, если DPD не находит такой заказ (значит, исходный запрос
   * не дошёл и создание можно безопасно повторить).
   */
  async getOrderStatus(
    orderNumberInternal: string,
    datePickup?: string,
  ): Promise<DpdOrderResult[]> {
    return new Promise((resolve, reject) => {
      soap.createClient(
        this.createEndpoint,
        { wsdl_options: { timeout: this.createOrderTimeoutMs } },
        (err, client) => {
          if (err) {
            return reject(err);
          }

          client.getOrderStatus(
            {
              orderStatus: {
                auth: {
                  clientNumber: +this.clientNumber,
                  clientKey: this.token,
                },
                order: [
                  {
                    orderNumberInternal,
                    ...(datePickup ? { datePickup } : {}),
                  },
                ],
              },
            },
            (err: unknown, result: DpdCreationResDTO) => {
              if (err) {
                return reject(err);
              }

              const results = Array.isArray(result.return)
                ? result.return
                : result.return
                  ? [result.return]
                  : [];
              resolve(results);
            },
            { timeout: this.createOrderTimeoutMs },
          );
        },
      );
    });
  }
}
