import { Injectable } from '@nestjs/common';
import fetch from 'node-fetch';
// import { CreateYadDto } from './dto/create-yad.dto';
// import { UpdateYadDto } from './dto/update-yad.dto';

@Injectable()
export class YadService {
  async getHistoryById(id: string) {
    const token = process.env.YAAPI_BEARER_TOKEN;
    const url = new URL(
      'https://b2b-authproxy.taxi.yandex.net/api/b2b/platform/request/history',
    );
    url.searchParams.append('request_id', id);
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return await response.json();
  }

  create(/*createYadDto: CreateYadDto*/) {
    return 'This action adds a new yad';
  }

  findAll() {
    return `This action returns all yad`;
  }

  update(id: number /*updateYadDto: UpdateYadDto*/) {
    return `This action updates a #${id} yad`;
  }

  remove(id: number) {
    return `This action removes a #${id} yad`;
  }
}
