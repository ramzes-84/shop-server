import { AsyncLocalStorage } from 'async_hooks';

/** Пробрасывает requestId в сервисы без изменения их сигнатур и без REQUEST-scope (это било бы по производительности). */
export const requestIdStorage = new AsyncLocalStorage<string>();

export function getCurrentRequestId(): string | undefined {
  return requestIdStorage.getStore();
}
