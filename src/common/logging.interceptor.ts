import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Response } from 'express';
import { Observable, tap } from 'rxjs';
import { RequestWithId } from './request-context';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('Request');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<RequestWithId>();
    const response = http.getResponse<Response>();
    const startedAt = Date.now();

    return next.handle().pipe(
      tap({
        next: () => this.write(request, response.statusCode, startedAt),
        error: () => this.write(request, response.statusCode, startedAt),
      }),
    );
  }

  private write(request: RequestWithId, status: number, startedAt: number) {
    this.logger.log(
      JSON.stringify({
        requestId: request.requestId,
        method: request.method,
        path: request.originalUrl,
        status,
        durationMs: Date.now() - startedAt,
        employeeId: request.user?.id,
      }),
    );
  }
}
