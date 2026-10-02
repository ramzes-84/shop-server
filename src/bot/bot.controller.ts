import { Body, Controller, Post } from '@nestjs/common';
import { BotService } from './bot.service';
import { YaService } from 'src/ya/ya.service';
import { YaTrackInfo } from 'src/ya/dto/ya.dto';
import { TelegramMessage, TelegramUpdate } from './dto/telegram-update.dto';
import { ShopService } from 'src/shop/shop.service';
import { BotOrderCandidate } from 'src/shop/dto/bot-orders.dto';
import { AppService } from 'src/app.service';
import {
  DpdSourceTerminalIds,
  FivePostSender,
  YaSourcePlatformIds,
} from 'src/auth/jwt-claims';

const YA_COMMAND_ONLY_RE = /^\/?ya\s*$/i;
const YA_COMMAND = '/ya';
const REGISTER_COMMAND_ONLY_RE = /^\/?register\s*$/i;
const REGISTER_COMMAND = '/register';
const REGISTER_ALL_CODE = 0;
const REGISTRATION_SESSION_TTL_MS = 10 * 60 * 1000;
const YA_SESSION_TTL_MS = 10 * 60 * 1000;

type BotCommandInfo = {
  command: string;
  hasTrailingText: boolean;
};

type PendingRegistrationData = {
  candidates: BotOrderCandidate[];
  yaSourcePlatformIds: YaSourcePlatformIds;
  fivePostSender?: FivePostSender;
  dpdSourceTerminalIds: DpdSourceTerminalIds;
};

type PendingRegistration = PendingRegistrationData & {
  timeout: NodeJS.Timeout;
  listMessageId?: number;
};

type PendingYaReference = {
  timeout: NodeJS.Timeout;
  promptMessageId?: number;
};

@Controller('bot')
export class BotController {
  constructor(
    private readonly botService: BotService,
    private readonly yaService: YaService,
    private readonly shopService: ShopService,
    private readonly appService: AppService,
  ) {}

  private readonly pendingYaReferences = new Map<string, PendingYaReference>();
  // Список кандидатов на регистрацию по chatId, без персистентности между рестартами.
  // Сессия живёт REGISTRATION_SESSION_TTL_MS от последнего ответа менеджера, потом сгорает сама.
  private readonly pendingRegistrations = new Map<
    string,
    PendingRegistration
  >();

  private setPendingYaReference(chatId: string, promptMessageId?: number) {
    this.clearPendingYaReference(chatId);

    const timeout = setTimeout(() => {
      this.pendingYaReferences.delete(chatId);
      void this.botService.sendEmployeeMessage(
        'Ожидание кода заказа истекло (10 минут). Отправьте /ya заново.',
        false,
        chatId,
      );
    }, YA_SESSION_TTL_MS);
    timeout.unref();

    this.pendingYaReferences.set(chatId, { timeout, promptMessageId });
  }

  private clearPendingYaReference(chatId: string) {
    const pending = this.pendingYaReferences.get(chatId);

    if (pending) {
      clearTimeout(pending.timeout);
      this.pendingYaReferences.delete(chatId);
    }
  }

  private setPendingRegistration(
    chatId: string,
    data: PendingRegistrationData,
    listMessageId?: number,
  ) {
    this.clearPendingRegistration(chatId);

    const timeout = setTimeout(() => {
      this.pendingRegistrations.delete(chatId);
      void this.botService.sendEmployeeMessage(
        'Сессия регистрации заказов истекла (10 минут без ответа). Отправьте /register заново.',
        false,
        chatId,
      );
    }, REGISTRATION_SESSION_TTL_MS);
    // Не держит процесс живым ради самого себя — таймер лишь чистит память чата.
    timeout.unref();

    this.pendingRegistrations.set(chatId, { ...data, timeout, listMessageId });
  }

  private clearPendingRegistration(chatId: string) {
    const pending = this.pendingRegistrations.get(chatId);

    if (pending) {
      clearTimeout(pending.timeout);
      this.pendingRegistrations.delete(chatId);
    }
  }

  private buildTrackResponse(trackInfo: YaTrackInfo): string {
    const routeId = trackInfo.sharingUrl?.split('/').at(-1);
    const trackDisplay = routeId ?? trackInfo.trackNumber;
    const responseLines = [
      `Заказ: ${trackInfo.reference}`,
      `Трек: ${trackDisplay}`,
      `Статус: ${trackInfo.status}`,
      trackInfo.sharingUrl ? `Ссылка: ${trackInfo.sharingUrl}` : undefined,
    ].filter(Boolean);

    return responseLines.join('\n');
  }

  private async sendTrackInfo(
    reference: string,
    chatId: string,
    originalText: string,
  ) {
    try {
      const trackInfo =
        await this.yaService.findTrackByOrderReference(reference);

      await this.botService.sendEmployeeMessage(
        this.buildTrackResponse(trackInfo),
        false,
        chatId,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Неизвестная ошибка';

      await this.botService.sendEmployeeMessage(
        `Не удалось получить трек по заказу ${reference}: ${errorMessage}\nКоманда: ${originalText}`,
        false,
        chatId,
      );
    }
  }

  private buildRegistrationList(candidates: BotOrderCandidate[]): string {
    const lines = candidates.map(
      (order, index) =>
        `${index + 1}. ${order.reference} ${order.lastname} | Трек: ${order.trackingNumber?.trim() || 'нет'}`,
    );

    return [`${REGISTER_ALL_CODE}. Зарегистрировать всё`, ...lines].join('\n');
  }

  private async sendOrdersForRegistration(chatId: string, isGroup: boolean) {
    try {
      const {
        orders,
        yaSourcePlatformIds,
        fivePostSender,
        dpdSourceTerminalIds,
      } = await this.shopService.getOrdersForBotRegistration();

      // Почта России пока не поддержана через бота — остальные не показываем.
      const candidates = orders.filter(
        (order) =>
          order.carrier === 'yandex' ||
          order.carrier === 'fivepost' ||
          order.carrier === 'dpd',
      );

      if (!candidates.length) {
        await this.botService.sendEmployeeMessage(
          'Нет заказов, доступных для регистрации в Яндекс.Доставке, 5Post или DPD.',
          false,
          chatId,
        );
        return;
      }

      const data = {
        candidates,
        yaSourcePlatformIds,
        fivePostSender,
        dpdSourceTerminalIds,
      };

      if (isGroup) {
        const sent = await this.botService.sendEmployeeMessage(
          `Выберите номер заказа для регистрации:\n${this.buildRegistrationList(candidates)}`,
          false,
          chatId,
        );

        if (sent?.ok) {
          this.setPendingRegistration(chatId, data, sent.result.message_id);
        }
        return;
      }

      this.setPendingRegistration(chatId, data);

      await this.botService.sendEmployeeMessage(
        `Выберите номер заказа для регистрации:\n${this.buildRegistrationList(candidates)}`,
        false,
        chatId,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Неизвестная ошибка';

      await this.botService.sendEmployeeMessage(
        `Не удалось получить список заказов: ${errorMessage}`,
        false,
        chatId,
      );
    }
  }

  private async registerOneOrder(
    order: BotOrderCandidate,
    pending: PendingRegistration,
  ) {
    const orderId = String(order.id);

    return order.carrier === 'yandex'
      ? await this.appService.createYaOrder(
          { orderId },
          pending.yaSourcePlatformIds,
        )
      : order.carrier === 'fivepost'
        ? await this.appService.createFivePostOrder(
            { orderId },
            pending.fivePostSender,
          )
        : await this.appService.createDpdOrder(
            { orderId },
            pending.dpdSourceTerminalIds,
          );
  }

  private async registerAllOrders(
    chatId: string,
    pending: PendingRegistration,
  ) {
    await this.botService.sendEmployeeMessage(
      `Начинаю регистрацию заказов: ${pending.candidates.length} шт.`,
      false,
      chatId,
    );

    // Последовательно: параллельные запросы к Яндексу/5Post/DPD рискуют упереться в их лимиты.
    const summaryLines: string[] = [];

    for (const order of pending.candidates) {
      const result = await this.registerOneOrder(order, pending);

      summaryLines.push(
        result.ok
          ? `✅ ${order.reference}`
          : `❌ ${order.reference}: ${result.data?.message ?? 'неизвестная ошибка'}`,
      );
    }

    await this.botService.sendEmployeeMessage(
      `Регистрация завершена:\n${summaryLines.join('\n')}`,
      false,
      chatId,
    );
  }

  private async registerSelectedOrder(
    chatId: string,
    text: string,
    isGroup: boolean,
  ) {
    const pending = this.pendingRegistrations.get(chatId);

    if (!pending) {
      return;
    }

    const index = Number(text.trim());

    if (
      !Number.isInteger(index) ||
      index < REGISTER_ALL_CODE ||
      index > pending.candidates.length
    ) {
      await this.botService.sendEmployeeMessage(
        'Некорректный номер заказа. Отправьте номер из списка ещё раз.',
        false,
        chatId,
      );
      return;
    }

    if (index === REGISTER_ALL_CODE) {
      this.clearPendingRegistration(chatId);
      await this.registerAllOrders(chatId, pending);
      return;
    }

    const order = pending.candidates[index - 1];
    this.clearPendingRegistration(chatId);
    const result = await this.registerOneOrder(order, pending);

    if (result.ok) {
      await this.botService.sendEmployeeMessage(
        `✅ Заказ ${order.reference} зарегистрирован.`,
        false,
        chatId,
      );
    } else {
      await this.botService.sendEmployeeMessage(
        `❌ Не удалось зарегистрировать заказ ${order.reference}: ${result.data?.message ?? 'неизвестная ошибка'}`,
        false,
        chatId,
      );
    }

    await this.sendOrdersForRegistration(chatId, isGroup);
  }

  private extractBotCommand(message: TelegramMessage): BotCommandInfo | null {
    if (!message.text || !message.entities?.length) {
      return null;
    }

    const commandEntity = message.entities.find(
      (entity) => entity.type === 'bot_command' && entity.offset === 0,
    );

    if (!commandEntity) {
      return null;
    }

    const rawCommand = message.text
      .slice(commandEntity.offset, commandEntity.offset + commandEntity.length)
      .toLowerCase();

    if (!rawCommand) {
      return null;
    }

    const cleanedCommand = rawCommand.split('@')[0];
    const trailingText = message.text
      .slice(commandEntity.offset + commandEntity.length)
      .trim();

    return {
      command: cleanedCommand,
      hasTrailingText: Boolean(trailingText.length),
    };
  }

  @Post('webhook')
  async handleWebhook(@Body() update: TelegramUpdate) {
    const message = update.message ?? update.edited_message;
    if (!message || !message.text) {
      return { ok: true };
    }

    const chatId = message.chat.id.toString();
    const text = message.text.trim();
    const awaitingReference = this.pendingYaReferences.has(chatId);
    const awaitingRegistration = this.pendingRegistrations.has(chatId);
    const botCommand = this.extractBotCommand(message);
    const isYaPromptCommand =
      (!!botCommand &&
        botCommand.command === YA_COMMAND &&
        !botCommand.hasTrailingText) ||
      (message.chat.type === 'private' &&
        !botCommand &&
        YA_COMMAND_ONLY_RE.test(text));
    const isRegisterCommand =
      (!!botCommand &&
        botCommand.command === REGISTER_COMMAND &&
        !botCommand.hasTrailingText) ||
      (message.chat.type === 'private' &&
        !botCommand &&
        REGISTER_COMMAND_ONLY_RE.test(text));

    if (isYaPromptCommand) {
      this.clearPendingRegistration(chatId);
      if (message.chat.type === 'private') {
        this.setPendingYaReference(chatId);
      }
      const sent = await this.botService.sendEmployeeMessage(
        'Введите код заказа, и я найду информацию.',
        false,
        chatId,
      );
      if (message.chat.type !== 'private' && sent?.ok) {
        this.setPendingYaReference(chatId, sent.result.message_id);
      }
      return { ok: true };
    }

    if (isRegisterCommand) {
      this.clearPendingYaReference(chatId);
      this.clearPendingRegistration(chatId);
      await this.sendOrdersForRegistration(
        chatId,
        message.chat.type !== 'private',
      );
      return { ok: true };
    }

    if (awaitingReference) {
      if (
        message.chat.type !== 'private' &&
        message.reply_to_message?.message_id !==
          this.pendingYaReferences.get(chatId)?.promptMessageId
      ) {
        return { ok: true };
      }
      this.clearPendingYaReference(chatId);
      await this.sendTrackInfo(text, chatId, text);
      return { ok: true };
    }

    if (awaitingRegistration) {
      if (
        message.chat.type !== 'private' &&
        (message.reply_to_message?.message_id !==
          this.pendingRegistrations.get(chatId)?.listMessageId ||
          !/^\d+$/.test(text))
      ) {
        return { ok: true };
      }
      await this.registerSelectedOrder(
        chatId,
        text,
        message.chat.type !== 'private',
      );
      return { ok: true };
    }

    return { ok: true };
  }
}
