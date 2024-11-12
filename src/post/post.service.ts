import { HttpException, Injectable, RequestMethod } from '@nestjs/common';
import fetch from 'node-fetch';
import { ServicesUrl } from 'src/types/services-url';
import { PostEndpoints, PostParcelResDTO } from './dto/post.dto';

@Injectable()
export class PostService {
  private readonly accessToken = process.env.POST_TOKEN;
  private readonly basicToken = process.env.POST_BASIC_TOKEN;
  private readonly endpoint = ServicesUrl.POST;

  async getPostParcelData(track: string) {
    const url = new URL(this.endpoint + PostEndpoints.SHIPMENT_SEARCH);
    url.searchParams.append('query', track);
    const data = await this.fetchData<PostParcelResDTO>(url);
    return data;
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
