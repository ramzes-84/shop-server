import fetch, { RequestInit, Response } from 'node-fetch';

/** Без таймаута один зависший внешний API исчерпывает пул воркеров и роняет сервис целиком. */
export const EXTERNAL_REQUEST_TIMEOUT_MS = 10_000;

export class ExternalRequestTimeoutError extends Error {
  constructor(
    readonly url: string,
    readonly timeoutMs: number,
  ) {
    super(`Внешний сервис не ответил за ${timeoutMs} мс`);
    this.name = 'ExternalRequestTimeoutError';
  }
}

export async function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
  timeoutMs: number = EXTERNAL_REQUEST_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal as RequestInit['signal'],
    });
  } catch (error) {
    // Отличаем наш таймаут от сетевой ошибки: сообщения для сотрудника разные.
    if (controller.signal.aborted) {
      throw new ExternalRequestTimeoutError(url, timeoutMs);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
