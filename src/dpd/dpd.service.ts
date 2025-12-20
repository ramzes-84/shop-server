import { Injectable } from '@nestjs/common';
import { ServicesUrl } from 'src/types/services-url';
import * as soap from 'soap';
import {
  CreatingOrderRequest,
  DpdCreationResDTO,
  DpdRequestDTO,
  DpdStatesResDTO,
  TrackingRequest,
} from './dto/dpd.dto';

@Injectable()
export class DpdService {
  token = process.env.DPD_TOKEN;
  trackingEndpoint = ServicesUrl.DPD + 'tracing1-1?wsdl';
  createEndpoint = ServicesUrl.DPD + 'order2?wsdl';
  clientNumber = process.env.DPD_CLIENT;

  async createOrder(
    order: Pick<CreatingOrderRequest, 'header' | 'order'>,
  ): Promise<DpdCreationResDTO> {
    const args = {
      orders: {
        auth: { clientNumber: +this.clientNumber, clientKey: this.token },
        ...order,
      },
    };

    return new Promise((resolve, reject) => {
      soap.createClient(this.createEndpoint, (err, client) => {
        if (err) {
          return reject(err);
        }

        client.createOrder(args, (err, result: DpdCreationResDTO) => {
          if (err) {
            return reject(err);
          }
          resolve(result);
        });
      });
    });
  }

  async getStatesByDPDOrder(dpdOrderNr: string): Promise<DpdStatesResDTO> {
    const args: DpdRequestDTO<TrackingRequest> = {
      request: {
        auth: { clientNumber: +this.clientNumber, clientKey: this.token },
        dpdOrderNr,
      },
    };

    return new Promise((resolve, reject) => {
      soap.createClient(this.trackingEndpoint, (err, client) => {
        if (err) {
          return reject(err);
        }

        client.getStatesByDPDOrder(args, (err, result: DpdStatesResDTO) => {
          if (err) {
            return reject(err);
          }
          resolve(result);
        });
      });
    });
  }
}
