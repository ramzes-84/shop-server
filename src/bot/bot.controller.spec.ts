import { Test, TestingModule } from '@nestjs/testing';
import { BotController } from './bot.controller';
import { BotService } from './bot.service';
import { YaService } from 'src/ya/ya.service';
import { TelegramUpdate } from './dto/telegram-update.dto';
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
      text: '/ya 0001',
      chat: {
        id: 123,
        type: 'private',
      },
    },
  };

  it('should request YA track and send response', async () => {
    jest.spyOn(yaService, 'findTrackByOrderReference').mockResolvedValue({
      reference: '0001',
      requestId: 'req-1',
      trackNumber: 'TRACK-0001',
      sharingUrl: 'https://dostavka.yandex.ru/route/EXAMPLE123',
      status: YaParcelStatus.CREATED,
    });

    await controller.handleWebhook(baseUpdate);

    expect(yaService.findTrackByOrderReference).toHaveBeenCalledWith('0001');
    expect(botService.sendEmployeeMessage).toHaveBeenCalledWith(
      expect.stringContaining('EXAMPLE123'),
      true,
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
