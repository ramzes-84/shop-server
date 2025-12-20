import { Body, Controller, Post } from '@nestjs/common';
import { BotService } from './bot.service';
import { YaService } from 'src/ya/ya.service';
import { YaTrackInfo } from 'src/ya/dto/ya.dto';
import { TelegramMessage, TelegramUpdate } from './dto/telegram-update.dto';

const YA_COMMAND_ONLY_RE = /^\/?ya\s*$/i;
const YA_COMMAND = '/ya';

type BotCommandInfo = {
  command: string;
  hasTrailingText: boolean;
};

@Controller('bot')
export class BotController {
  constructor(
    private readonly botService: BotService,
    private readonly yaService: YaService,
  ) {}

  private readonly pendingYaReferences = new Set<string>();

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
    const botCommand = this.extractBotCommand(message);
    const isYaPromptCommand =
      (!!botCommand &&
        botCommand.command === YA_COMMAND &&
        !botCommand.hasTrailingText) ||
      (!botCommand && YA_COMMAND_ONLY_RE.test(text));

    if (isYaPromptCommand) {
      this.pendingYaReferences.add(chatId);
      await this.botService.sendEmployeeMessage(
        'Введите код заказа, и я найду информацию.',
        false,
        chatId,
      );
      return { ok: true };
    }

    if (awaitingReference) {
      this.pendingYaReferences.delete(chatId);
      await this.sendTrackInfo(text, chatId, text);
      return { ok: true };
    }

    return { ok: true };
  }
}
