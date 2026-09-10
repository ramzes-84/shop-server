import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { NextFunction, Response } from 'express';
import { REQUEST_ID_HEADER, RequestWithId } from './request-context';
import { requestIdStorage } from './request-id.storage';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: RequestWithId, res: Response, next: NextFunction) {
    // Идентификатор всегда генерируется сервером: принимать его из заголовка —
    // значит позволить подделывать связку и засорять логи произвольной строкой.
    // Восьми символов хватает, чтобы сотрудник продиктовал id в чат.
    const requestId = randomUUID().slice(0, 8);
    req.requestId = requestId;
    res.setHeader(REQUEST_ID_HEADER, requestId);

    // AsyncLocalStorage переживает await внутри одного запроса, поэтому requestId
    // остаётся доступен в AppService, куда объект запроса не прокинут.
    requestIdStorage.run(requestId, next);
  }
}
