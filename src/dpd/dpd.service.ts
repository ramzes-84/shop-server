import { Injectable } from '@nestjs/common';
import { ServicesUrl } from 'src/types/services-url';
import * as soap from 'soap';
import { DpdRequestDTO, DpdStatesResDTO, TrackingRequest } from './dto/dpd.dto';
import { EXTERNAL_REQUEST_TIMEOUT_MS } from 'src/common/fetch-with-timeout';

@Injectable()
export class DpdService {
  token = process.env.DPD_TOKEN;
  trackingEndpoint = ServicesUrl.DPD + 'tracing1-1?wsdl';
  createEndpoint = ServicesUrl.DPD + 'order2?wsdl';
  clientNumber = process.env.DPD_CLIENT;

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
            (err, result: DpdStatesResDTO) => {
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
}
