import { Injectable } from '@nestjs/common';
import { ServicesUrl } from 'src/types/services-url';
import * as soap from 'soap';

@Injectable()
export class DpdService {
  token = process.env.DPD_TOKEN;
  endpoint = ServicesUrl.DPD;
  clientNumber = process.env.DPD_CLIENT;

  getStatesByDPDOrder() {
    const args = {
      request: {
        auth: { clientNumber: +this.clientNumber, clientKey: this.token },
        dpdOrderNr: 'RU101453860',
        pickupYear: 2024,
      },
    };

    soap.createClient(this.endpoint, (err, client) => {
      if (err) {
        console.error('Error creating SOAP client:', err);
        return;
      }

      client.getStatesByDPDOrder(args, (err, result) => {
        if (err) {
          return err;
        }
        return result;
      });
    });
  }
}
