export class ErrorTelegramResDTO {
  ok: false;
  error_code: number;
  description: string;
}

export enum BotCommand {
  SEND_MSG = '/sendMessage',
}

export class SuccessSendMessageResDTO {
  ok: true;
  result: {
    message_id: number;
    from: {
      id: number;
      is_bot: boolean;
      first_name: string;
      username: string;
    };
    chat: {
      id: number;
      title: string;
      type: string;
    };
    date: number;
    text: string;
  };
}
