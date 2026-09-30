import { Injectable, Logger } from '@nestjs/common';
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
import { getCurrentRequestId } from 'src/common/request-id.storage';

@Injectable()
export class DpdService {
  private readonly logger = new Logger(DpdService.name);
  token = process.env.DPD_TOKEN!;
  trackingEndpoint = ServicesUrl.DPD + 'tracing1-1?wsdl';
  createEndpoint = ServicesUrl.DPD + 'order2?wsdl';
  clientNumber = process.env.DPD_CLIENT!;

  // Обработка createOrder2 дольше чтения статусов; WSDL загружается отдельно
  // и может обрываться до вызова метода при меньшем таймауте.
  private readonly createOrderTimeoutMs = 30_000;
  private readonly orderWsdlTimeoutMs = 45_000;

  private logOrderFailure(
    operation: string,
    phase: 'wsdl' | 'soap',
    startedAt: number,
    error: unknown,
  ): void {
    const failure = error as {
      name?: string;
      message?: string;
      code?: string;
      response?: { status?: number };
    };
    this.logger.error(
      JSON.stringify({
        requestId: getCurrentRequestId(),
        operation,
        phase,
        durationMs: Date.now() - startedAt,
        name: failure?.name,
        message: failure?.message,
        code: failure?.code,
        status: failure?.response?.status,
      }),
    );
  }

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
      const wsdlStartedAt = Date.now();
      soap.createClient(
        this.createEndpoint,
        { wsdl_options: { timeout: this.orderWsdlTimeoutMs } },
        (err, client) => {
          if (err) {
            this.logOrderFailure('createOrder2', 'wsdl', wsdlStartedAt, err);
            return reject(
              new Error(
                'Не удалось загрузить схему DPD. Запрос на регистрацию отправки не был отправлен; повторите попытку позже.',
              ),
            );
          }

          const soapStartedAt = Date.now();
          client.createOrder2(
            { orders },
            (err: unknown, result: DpdCreationResDTO) => {
              if (err) {
                this.logOrderFailure(
                  'createOrder2',
                  'soap',
                  soapStartedAt,
                  err,
                );
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
   * Возвращает пустой массив, если DPD не находит такой заказ на момент проверки.
   */
  async getOrderStatus(
    orderNumberInternal: string,
    datePickup?: string,
  ): Promise<DpdOrderResult[]> {
    return new Promise((resolve, reject) => {
      const wsdlStartedAt = Date.now();
      soap.createClient(
        this.createEndpoint,
        { wsdl_options: { timeout: this.orderWsdlTimeoutMs } },
        (err, client) => {
          if (err) {
            this.logOrderFailure('getOrderStatus', 'wsdl', wsdlStartedAt, err);
            return reject(err);
          }

          const soapStartedAt = Date.now();
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
                if (
                  err instanceof Error &&
                  /\bno-data-found\b/i.test(err.message)
                ) {
                  return resolve([]);
                }
                this.logOrderFailure(
                  'getOrderStatus',
                  'soap',
                  soapStartedAt,
                  err,
                );
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
