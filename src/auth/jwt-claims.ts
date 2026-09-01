export const JWT_ISSUER = 'prestashop';
export const JWT_AUDIENCE = 'shop-server';
export const CRON_REVISE_SCOPE = 'orders:revise';

/** Допуск на расхождение часов между хостингом PrestaShop и сервером, секунды. */
export const JWT_CLOCK_TOLERANCE_SEC = 30;

export interface JwtPayload {
  sub: string;
  email?: string;
  scope?: string;
  iss: string;
  aud: string;
  iat: number;
  exp: number;
}

/** Сотрудник PrestaShop, от имени которого выполняется запрос. */
export interface AuthenticatedEmployee {
  id: string;
  email?: string;
  scope?: string;
}
