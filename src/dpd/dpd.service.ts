import { Injectable } from '@nestjs/common';
import { ServicesUrl } from 'src/types/services-url';
import * as soap from 'soap';

@Injectable()
export class DpdService {
  token = process.env.DPD_TOKEN;
  endpoint = ServicesUrl.DPD;
  clientNumber = process.env.DPD_CLIENT;

  makeSoapRequest() {
    const args = {
      request: {
        auth: { clientNumber: +this.clientNumber, clientKey: this.token },
      },
    };

    soap.createClient(this.endpoint, (err, client) => {
      if (err) {
        console.error('Error creating SOAP client:', err);
        return;
      }

      client.getCitiesCashPay(args, (err, result) => {
        if (err) {
          console.error('Error making SOAP request:', err);
          return;
        }

        console.log(result);
      });
    });
  }
}
