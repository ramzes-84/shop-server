import { Request } from 'express';

export const REQUEST_ID_HEADER = 'X-Request-Id';

export interface RequestWithId extends Request {
  requestId?: string;
  user?: { id: string; email?: string };
}

/** Сообщение, которое можно показать сотруднику: без стектрейсов и внутренних адресов. */
export function toSafeMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === 'string' && error) {
    return error;
  }

  // HttpException.getResponse(): { message: string | string[] }, в том числе от ValidationPipe.
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message: unknown }).message;

    if (Array.isArray(message)) {
      return message.join('; ');
    }

    if (typeof message === 'string' && message) {
      return message;
    }
  }

  return 'Внутренняя ошибка сервера';
}

/** Полное описание для лога — наружу не отдаётся. */
export function describeError(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return { name: error.name, message: error.message, stack: error.stack };
  }

  return { message: String(error) };
}
