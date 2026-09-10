import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { describeError, RequestWithId, toSafeMessage } from './request-context';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exception');

  catch(exception: unknown, host: ArgumentsHost) {
    const http = host.switchToHttp();
    const request = http.getRequest<RequestWithId>();
    const response = http.getResponse<Response>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    this.logger[status >= HttpStatus.INTERNAL_SERVER_ERROR ? 'error' : 'warn'](
      JSON.stringify({
        requestId: request.requestId,
        method: request.method,
        path: request.originalUrl,
        status,
        employeeId: request.user?.id,
        error: describeError(exception),
      }),
    );

    // Наружу — только безопасный текст и requestId: по нему разработчик найдёт в логах полный контекст.
    response.status(status).json({
      ok: false,
      requestId: request.requestId,
      data: {
        message:
          status >= HttpStatus.INTERNAL_SERVER_ERROR
            ? 'Внутренняя ошибка сервера'
            : toSafeMessage(
                exception instanceof HttpException
                  ? exception.getResponse()
                  : exception,
              ),
      },
    });
  }
}
