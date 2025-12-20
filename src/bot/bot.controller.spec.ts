import { Test, TestingModule } from '@nestjs/testing';
import { BotController } from './bot.controller';
import { BotService } from './bot.service';
import { YaService } from 'src/ya/ya.service';
import {
  TelegramMessageEntity,
  TelegramUpdate,
} from './dto/telegram-update.dto';
import { YaParcelStatus } from 'src/ya/dto/ya.dto';

describe('BotController', () => {
  let controller: BotController;
  let botService: BotService;
  let yaService: YaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BotController],
      providers: [
        {
          provide: BotService,
          useValue: {
            sendEmployeeMessage: jest.fn().mockResolvedValue(null),
          },
        },
        {
          provide: YaService,
          useValue: {
            findTrackByOrderReference: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<BotController>(BotController);
    botService = module.get<BotService>(BotService);
    yaService = module.get<YaService>(YaService);
  });

  const baseUpdate: TelegramUpdate = {
    update_id: 1,
    message: {
      message_id: 10,
      date: Date.now(),
      text: '0001',
      chat: {
        id: 123,
        type: 'private',
      },
    },
  };

  const yaCommandEntity: TelegramMessageEntity = {
    offset: 0,
    length: 3,
    type: 'bot_command',
  };

  it('should request YA track and send response after prompt', async () => {
    jest.spyOn(yaService, 'findTrackByOrderReference').mockResolvedValue({
      reference: '0001',
      requestId: 'req-1',
      trackNumber: 'TRACK-0001',
      sharingUrl: 'https://dostavka.yandex.ru/route/EXAMPLE123',
      status: YaParcelStatus.CREATED,
    });

    const promptUpdate: TelegramUpdate = {
      ...baseUpdate,
      message: {
        ...baseUpdate.message!,
        text: '/ya',
        entities: [yaCommandEntity],
      },
    };

    await controller.handleWebhook(promptUpdate);
    jest.clearAllMocks();

    await controller.handleWebhook(baseUpdate);

    expect(yaService.findTrackByOrderReference).toHaveBeenCalledWith('0001');
    expect(botService.sendEmployeeMessage).toHaveBeenCalledWith(
      expect.stringContaining('EXAMPLE123'),
      false,
      '123',
    );
  });

  it('should prompt for order code when /ya has no reference', async () => {
    const update: TelegramUpdate = {
      ...baseUpdate,
      message: {
        ...baseUpdate.message!,
        text: '/ya',
        entities: [yaCommandEntity],
      },
    };

    await controller.handleWebhook(update);

    expect(yaService.findTrackByOrderReference).not.toHaveBeenCalled();
    expect(botService.sendEmployeeMessage).toHaveBeenCalledWith(
      expect.stringContaining('Введите код заказа'),
      false,
      '123',
    );
  });

  it('should fallback to regex when command entity is missing', async () => {
    const update: TelegramUpdate = {
      ...baseUpdate,
      message: {
        ...baseUpdate.message!,
        text: '/ya',
        entities: undefined,
      },
    };

    await controller.handleWebhook(update);

    expect(yaService.findTrackByOrderReference).not.toHaveBeenCalled();
    expect(botService.sendEmployeeMessage).toHaveBeenCalledWith(
      expect.stringContaining('Введите код заказа'),
      false,
      '123',
    );
  });

  it('should accept /ya mentions used in group chats', async () => {
    const update: TelegramUpdate = {
      ...baseUpdate,
      message: {
        ...baseUpdate.message!,
        text: '/ya@ShopHelperBot',
        entities: [
          {
            offset: 0,
            length: '/ya@ShopHelperBot'.length,
            type: 'bot_command',
          },
        ],
      },
    };

    await controller.handleWebhook(update);

    expect(yaService.findTrackByOrderReference).not.toHaveBeenCalled();
    expect(botService.sendEmployeeMessage).toHaveBeenCalledWith(
      expect.stringContaining('Введите код заказа'),
      false,
      '123',
    );
  });

  it('should use next message as reference after prompt', async () => {
    const activationUpdate: TelegramUpdate = {
      ...baseUpdate,
      message: {
        ...baseUpdate.message!,
        text: '/ya',
        entities: [yaCommandEntity],
      },
    };

    await controller.handleWebhook(activationUpdate);
    jest.clearAllMocks();

    jest.spyOn(yaService, 'findTrackByOrderReference').mockResolvedValue({
      reference: '0002',
      requestId: 'req-2',
      trackNumber: 'TRACK-0002',
      sharingUrl: undefined,
      status: YaParcelStatus.CREATED,
    });

    const codeUpdate: TelegramUpdate = {
      ...baseUpdate,
      message: {
        ...baseUpdate.message!,
        text: '0002',
      },
    };

    await controller.handleWebhook(codeUpdate);

    expect(yaService.findTrackByOrderReference).toHaveBeenCalledWith('0002');
    expect(botService.sendEmployeeMessage).toHaveBeenCalledWith(
      expect.stringContaining('Заказ: 0002'),
      false,
      '123',
    );
  });

  it('should ignore messages without YA command', async () => {
    const update: TelegramUpdate = {
      ...baseUpdate,
      message: {
        ...baseUpdate.message!,
        text: 'hello there',
      },
    };

    await controller.handleWebhook(update);

    expect(yaService.findTrackByOrderReference).not.toHaveBeenCalled();
    expect(botService.sendEmployeeMessage).not.toHaveBeenCalled();
  });

  it('should notify about errors when YA lookup fails', async () => {
    const promptUpdate: TelegramUpdate = {
      ...baseUpdate,
      message: {
        ...baseUpdate.message!,
        text: '/ya',
        entities: [yaCommandEntity],
      },
    };

    await controller.handleWebhook(promptUpdate);
    jest.clearAllMocks();

    jest
      .spyOn(yaService, 'findTrackByOrderReference')
      .mockRejectedValue(new Error('not found'));

    await controller.handleWebhook(baseUpdate);

    expect(botService.sendEmployeeMessage).toHaveBeenCalledWith(
      expect.stringContaining('Не удалось'),
      false,
      '123',
    );
  });
});
