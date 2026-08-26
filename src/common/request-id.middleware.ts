import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { NextFunction, Response } from 'express';
import { REQUEST_ID_HEADER, RequestWithId } from './request-context';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: RequestWithId, res: Response, next: NextFunction) {
    // Идентификатор всегда генерируется сервером: принимать его из заголовка —
    // значит позволить подделывать связку и засорять логи произвольной строкой.
    // Восьми символов хватает, чтобы сотрудник продиктовал id в чат.
    req.requestId = randomUUID().slice(0, 8);
    res.setHeader(REQUEST_ID_HEADER, req.requestId);
    next();
  }
}
