import { Injectable } from '@nestjs/common';

@Injectable()
export class AuthService {
  private readonly bearer = process.env.SERVER_BEARER_TOKEN;

  async validateToken(token: string) {
    return token === this.bearer;
  }
}
