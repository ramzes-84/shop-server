export type BotOrderCarrier = 'yandex' | 'fivepost' | 'post' | 'dpd' | '';

export class BotOrderCandidate {
  id: number;
  reference: string;
  lastname: string;
  carrier: BotOrderCarrier;
}

export class BotOrdersForRegistration {
  orders: BotOrderCandidate[];
  yaSourcePlatformIds: { rnd?: string; tul?: string };
  fivePostSenderLocation?: string;
  dpdSourceTerminalIds: { rnd?: string; tul?: string };
}

export class BotOrdersForRegistrationRes {
  ok: boolean;
  data: BotOrdersForRegistration;
}
