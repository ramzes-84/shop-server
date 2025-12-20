import { HttpException, Injectable, RequestMethod } from '@nestjs/common';
import fetch from 'node-fetch';
import { ServicesUrl } from 'src/types/services-url';
import { PostEndpoints, PostParcelResDTO } from './dto/post.dto';
import * as soap from 'soap';
import { PostSoapResDTO } from './dto/post-soap.dto';

@Injectable()
export class PostService {
  private readonly accessToken = process.env.POST_TOKEN;
  private readonly basicToken = process.env.POST_BASIC_TOKEN;
  private readonly endpoint = ServicesUrl.POST;
  private readonly soapEndpoint = ServicesUrl.POST_SOAP;
  private readonly soapLogin = process.env.POST_PERSONAL_LOGIN;
  private readonly soapPassword = process.env.POST_PERSONAL_PASSWORD;

  async getPostParcelData(track: string) {
    const url = new URL(this.endpoint + PostEndpoints.SHIPMENT_SEARCH);
    url.searchParams.append('query', track);
    const data = await this.fetchData<PostParcelResDTO>(url);
    return data;
  }

  async getOperationHistory(track: string): Promise<PostSoapResDTO> {
    const args = {
      OperationHistoryRequest: {
        Barcode: track,
        MessageType: 0,
        Language: 'RUS',
      },
      AuthorizationHeader: {
        login: this.soapLogin,
        password: this.soapPassword,
      },
    };

    return new Promise((resolve, reject) => {
      soap.createClient(
        this.soapEndpoint,
        {
          forceSoap12Headers: true,
          wsdl_headers: {
            'Content-Type': 'application/soap+xml; charset=utf-8',
          },
        },
        (err, client) => {
          if (err) {
            return reject(err);
          }

          client.addSoapHeader(
            {
              'soapenv:mustUnderstand': '1',
            },
            '',
            'soapenv',
            'http://schemas.xmlsoap.org/soap/envelope/',
          );

          client.getOperationHistory(args, (err, result) => {
            if (err) {
              return reject(err);
            }
            resolve(result);
          });
        },
      );
    });
  }

  async fetchData<T>(
    url: URL,
    method: RequestMethod = RequestMethod.GET,
  ): Promise<T> {
    const response = await fetch(url.toString(), {
      method: RequestMethod[method],
      headers: {
        Authorization: `AccessToken ${this.accessToken}`,
        'X-User-Authorization': `Basic ${this.basicToken}`,
        'Content-Type': 'application/json;charset=UTF-8',
      },
    });

    if (!response.ok) {
      throw new HttpException(`Failed to fetch from POST`, response.status);
    }

    const data: T = await response.json();
    return data;
  }
}
