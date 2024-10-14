import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    const envValue = process.env.YAAPI_BEARER_TOKEN;
    return `Hello World! ${envValue}`;
  }
}
