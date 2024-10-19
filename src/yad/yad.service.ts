import { Injectable } from '@nestjs/common';
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
        // 'Content-Type': 'application/json',
      },
    });
    return JSON.stringify({
      token: token,
      reqUrl: url.toString(),
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      type: response.type,
      headers: response.headers.entries(),
      // body: await response.text(),
      url: response.url,
    });
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
