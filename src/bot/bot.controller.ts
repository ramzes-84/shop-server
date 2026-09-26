import { Body, Controller, Post } from '@nestjs/common';
import { BotService } from './bot.service';
import { YaService } from 'src/ya/ya.service';
import { YaTrackInfo } from 'src/ya/dto/ya.dto';
import { TelegramMessage, TelegramUpdate } from './dto/telegram-update.dto';
import { ShopService } from 'src/shop/shop.service';
import { BotOrderCandidate } from 'src/shop/dto/bot-orders.dto';
import { AppService } from 'src/app.service';
import { DpdSourceTerminalIds, YaSourcePlatformIds } from 'src/auth/jwt-claims';

const YA_COMMAND_ONLY_RE = /^\/?ya\s*$/i;
const YA_COMMAND = '/ya';
const REGISTER_COMMAND_ONLY_RE = /^\/?register\s*$/i;
const REGISTER_COMMAND = '/register';

type BotCommandInfo = {
  command: string;
  hasTrailingText: boolean;
};

type PendingRegistration = {
  candidates: BotOrderCandidate[];
  yaSourcePlatformIds: YaSourcePlatformIds;
  fivePostSenderLocation?: string;
  dpdSourceTerminalIds: DpdSourceTerminalIds;
};

@Controller('bot')
export class BotController {
  constructor(
    private readonly botService: BotService,
    private readonly yaService: YaService,
    private readonly shopService: ShopService,
    private readonly appService: AppService,
  ) {}

  private readonly pendingYaReferences = new Set<string>();
  // Список кандидатов на регистрацию по chatId, без персистентности между рестартами.
  private readonly pendingRegistrations = new Map<
    string,
    PendingRegistration
  >();

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
    return candidates
      .map((order, index) =>
        `${index + 1}. ${order.reference} ${order.lastname}`.trim(),
      )
      .join('\n');
  }

  private async sendOrdersForRegistration(chatId: string) {
    try {
      const {
        orders,
        yaSourcePlatformIds,
        fivePostSenderLocation,
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

      this.pendingRegistrations.set(chatId, {
        candidates,
        yaSourcePlatformIds,
        fivePostSenderLocation,
        dpdSourceTerminalIds,
      });

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

  private async registerSelectedOrder(chatId: string, text: string) {
    const pending = this.pendingRegistrations.get(chatId);
    this.pendingRegistrations.delete(chatId);

    if (!pending) {
      return;
    }

    const index = Number(text.trim());

    if (
      !Number.isInteger(index) ||
      index < 1 ||
      index > pending.candidates.length
    ) {
      await this.botService.sendEmployeeMessage(
        'Некорректный номер заказа. Отправьте /register и повторите выбор.',
        false,
        chatId,
      );
      return;
    }

    const order = pending.candidates[index - 1];
    const orderId = String(order.id);

    const result =
      order.carrier === 'yandex'
        ? await this.appService.createYaOrder(
            { orderId },
            pending.yaSourcePlatformIds,
          )
        : order.carrier === 'fivepost'
          ? await this.appService.createFivePostOrder(
              { orderId },
              pending.fivePostSenderLocation,
            )
          : await this.appService.createDpdOrder(
              { orderId },
              pending.dpdSourceTerminalIds,
            );

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
      (!botCommand && YA_COMMAND_ONLY_RE.test(text));
    const isRegisterCommand =
      (!!botCommand &&
        botCommand.command === REGISTER_COMMAND &&
        !botCommand.hasTrailingText) ||
      (!botCommand && REGISTER_COMMAND_ONLY_RE.test(text));

    if (isYaPromptCommand) {
      this.pendingYaReferences.add(chatId);
      await this.botService.sendEmployeeMessage(
        'Введите код заказа, и я найду информацию.',
        false,
        chatId,
      );
      return { ok: true };
    }

    if (isRegisterCommand) {
      await this.sendOrdersForRegistration(chatId);
      return { ok: true };
    }

    if (awaitingReference) {
      this.pendingYaReferences.delete(chatId);
      await this.sendTrackInfo(text, chatId, text);
      return { ok: true };
    }

    if (awaitingRegistration) {
      await this.registerSelectedOrder(chatId, text);
      return { ok: true };
    }

    return { ok: true };
  }
}
