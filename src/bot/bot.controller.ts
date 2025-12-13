import { Body, Controller, Post } from '@nestjs/common';
import { BotService } from './bot.service';
import { YaService } from 'src/ya/ya.service';
import { TelegramUpdate } from './dto/telegram-update.dto';

@Controller('bot')
export class BotController {
  constructor(
    private readonly botService: BotService,
    private readonly yaService: YaService,
  ) {}

  @Post('webhook')
  async handleWebhook(@Body() update: TelegramUpdate) {
    const message = update.message ?? update.edited_message;
    if (!message || !message.text) {
      return { ok: true };
    }

    const chatId = message.chat.id.toString();
    const text = message.text.trim();

    const yaMatch = text.match(/^\/?(?:ya(?:_track)?)\s+(\S+)/i);
    if (!yaMatch) {
      return { ok: true };
    }

    const reference = yaMatch[1];

    try {
      const trackInfo =
        await this.yaService.findTrackByOrderReference(reference);
      const routeId = trackInfo.sharingUrl?.split('/').at(-1);
      const trackDisplay = routeId ?? trackInfo.trackNumber;
      const trackLine = `Трек: ${trackDisplay}`;
      const responseLines = [
        `Заказ: ${trackInfo.reference}`,
        trackLine,
        `Статус: ${trackInfo.status}`,
        trackInfo.sharingUrl ? `Ссылка: ${trackInfo.sharingUrl}` : undefined,
      ].filter(Boolean);

      await this.botService.sendEmployeeMessage(
        responseLines.join('\n'),
        false,
        chatId,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Неизвестная ошибка';

      await this.botService.sendEmployeeMessage(
        `Не удалось получить трек по заказу ${reference}: ${errorMessage}`,
        false,
        chatId,
      );
    }

    return { ok: true };
  }
}
