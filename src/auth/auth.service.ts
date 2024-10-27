import { Injectable } from '@nestjs/common';

@Injectable()
export class AuthService {
  bearer = process.env.SERVER_BEARER_TOKEN.toString();

  async validateToken(token: string) {
    return token === this.bearer;
  }
}