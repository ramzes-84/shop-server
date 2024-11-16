import { Injectable } from '@nestjs/common';
import { ServicesUrl } from 'src/types/services-url';
import * as soap from 'soap';
import { DpdStatesResDTO } from './dto/dpd.dto';

@Injectable()
export class DpdService {
  token = process.env.DPD_TOKEN;
  endpoint = ServicesUrl.DPD;
  clientNumber = process.env.DPD_CLIENT;

  async getStatesByDPDOrder(dpdOrderNr: string): Promise<DpdStatesResDTO> {
    const args = {
      request: {
        auth: { clientNumber: +this.clientNumber, clientKey: this.token },
        dpdOrderNr,
        // pickupYear: 2024,
      },
    };

    return new Promise((resolve, reject) => {
      soap.createClient(this.endpoint, (err, client) => {
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
