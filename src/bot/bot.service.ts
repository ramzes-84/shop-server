import { Injectable, RequestMethod } from '@nestjs/common';
import { ServicesUrl } from 'src/types/services-url';
import fetch from 'node-fetch';
import {
  BotCommand,
  ErrorTelegramResDTO,
  SuccessSendMessageResDTO,
} from './dto/telegram.dto';

@Injectable()
export class BotService {
  private readonly token = process.env.TELEGRAM_TOKEN;
  private readonly endpoint = ServicesUrl.TELEGRAM;
  private readonly url = `${this.endpoint}${this.token}`;
  private readonly alGroup = process.env.TELEGRAM_GROUP_AL;
  private readonly buGroup = process.env.TELEGRAM_GROUP_BU;

  async sendEmployeeMessage(text: string, markdown: boolean = false) {
    if (!text) {
      const errorRes: ErrorTelegramResDTO = {
        ok: false,
        error_code: 400,
        description: 'Empty message',
      };
      return errorRes;
    }

    const body = JSON.stringify({
      chat_id: this.buGroup,
      text,
      parse_mode: markdown ? 'MarkdownV2' : undefined,
    });

    return await this.fetchData<SuccessSendMessageResDTO | ErrorTelegramResDTO>(
      BotCommand.SEND_MSG,
      RequestMethod.POST,
      body,
    );
  }

  async fetchData<T>(
    command: BotCommand,
    method: RequestMethod = RequestMethod.GET,
    body?: string,
  ) {
    const url = new URL(`${this.url}${command}`);

    const response = await fetch(url.toString(), {
      method: RequestMethod[method],
      headers: {
        'Content-Type': 'application/json',
      },
      body,
    });

    const data: T = await response.json();
    return data;
  }
}
