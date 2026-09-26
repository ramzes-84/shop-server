export const JWT_ISSUER = 'prestashop';
export const JWT_AUDIENCE = 'shop-server';
export const CRON_REVISE_SCOPE = 'orders:revise';

/** Допуск на расхождение часов между хостингом PrestaShop и сервером, секунды. */
export const JWT_CLOCK_TOLERANCE_SEC = 30;

export interface YaSourcePlatformIds {
  rnd?: string;
  tul?: string;
}

/** Терминалы отправки DPD (Ростов/Тула) — настраиваются в модуле, не хранятся на сервере. */
export interface DpdSourceTerminalIds {
  rnd?: string;
  tul?: string;
}

export interface JwtPayload {
  sub: string;
  email?: string;
  scope?: string;
  yaSourcePlatformIds?: YaSourcePlatformIds;
  fivePostSenderLocation?: string;
  dpdSourceTerminalIds?: DpdSourceTerminalIds;
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
  yaSourcePlatformIds?: YaSourcePlatformIds;
  fivePostSenderLocation?: string;
  dpdSourceTerminalIds?: DpdSourceTerminalIds;
}
