import { Test, TestingModule } from '@nestjs/testing';
import { BotController } from './bot.controller';
import { BotService } from './bot.service';
import { YaService } from 'src/ya/ya.service';
import { ShopService } from 'src/shop/shop.service';
import { AppService } from 'src/app.service';
import {
  TelegramMessageEntity,
  TelegramUpdate,
} from './dto/telegram-update.dto';
import { YaParcelStatus } from 'src/ya/dto/ya.dto';

describe('BotController', () => {
  let controller: BotController;
  let botService: BotService;
  let yaService: YaService;
  let shopService: ShopService;
  let appService: AppService;

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
        {
          provide: ShopService,
          useValue: {
            getOrdersForBotRegistration: jest.fn(),
          },
        },
        {
          provide: AppService,
          useValue: {
            createYaOrder: jest.fn(),
            createFivePostOrder: jest.fn(),
            createDpdOrder: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<BotController>(BotController);
    botService = module.get<BotService>(BotService);
    yaService = module.get<YaService>(YaService);
    shopService = module.get<ShopService>(ShopService);
    appService = module.get<AppService>(AppService);
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

  const registerCommandEntity: TelegramMessageEntity = {
    offset: 0,
    length: '/register'.length,
    type: 'bot_command',
  };

  const registrationCandidates = [
    {
      id: 101,
      reference: 'BFWGPFSMQ',
      lastname: 'Васильева',
      carrier: 'yandex' as const,
    },
    {
      id: 102,
      reference: 'AXQ12345Z',
      lastname: 'Петров',
      carrier: 'fivepost' as const,
    },
    {
      id: 103,
      reference: 'DPD987654',
      lastname: 'Смирнов',
      carrier: 'dpd' as const,
    },
  ];

  it('should list orders available for registration on /register', async () => {
    jest.spyOn(shopService, 'getOrdersForBotRegistration').mockResolvedValue({
      orders: registrationCandidates,
      yaSourcePlatformIds: { rnd: 'rnd-1', tul: 'tul-1' },
      fivePostSenderLocation: 'loc-1',
      dpdSourceTerminalIds: { rnd: 'dpd-rnd-1', tul: 'dpd-tul-1' },
    });

    const update: TelegramUpdate = {
      ...baseUpdate,
      message: {
        ...baseUpdate.message!,
        text: '/register',
        entities: [registerCommandEntity],
      },
    };

    await controller.handleWebhook(update);

    expect(botService.sendEmployeeMessage).toHaveBeenCalledWith(
      expect.stringContaining('1. BFWGPFSMQ Васильева'),
      false,
      '123',
    );
  });

  it('should exclude orders with unsupported carriers from the registration list', async () => {
    jest.spyOn(shopService, 'getOrdersForBotRegistration').mockResolvedValue({
      orders: [
        { id: 201, reference: 'ZZZ111', lastname: 'Сидоров', carrier: 'post' },
      ],
      yaSourcePlatformIds: {},
      fivePostSenderLocation: undefined,
      dpdSourceTerminalIds: {},
    });

    const update: TelegramUpdate = {
      ...baseUpdate,
      message: {
        ...baseUpdate.message!,
        text: '/register',
        entities: [registerCommandEntity],
      },
    };

    await controller.handleWebhook(update);

    expect(botService.sendEmployeeMessage).toHaveBeenCalledWith(
      expect.stringContaining('Нет заказов'),
      false,
      '123',
    );
  });

  it('should register the selected Yandex order by list number', async () => {
    jest.spyOn(shopService, 'getOrdersForBotRegistration').mockResolvedValue({
      orders: registrationCandidates,
      yaSourcePlatformIds: { rnd: 'rnd-1', tul: 'tul-1' },
      fivePostSenderLocation: 'loc-1',
      dpdSourceTerminalIds: { rnd: 'dpd-rnd-1', tul: 'dpd-tul-1' },
    });
    jest.spyOn(appService, 'createYaOrder').mockResolvedValue({
      ok: true,
      data: { sharing_url: 'https://dostavka.yandex.ru/route/EXAMPLE' },
    });

    await controller.handleWebhook({
      ...baseUpdate,
      message: {
        ...baseUpdate.message!,
        text: '/register',
        entities: [registerCommandEntity],
      },
    });
    jest.clearAllMocks();

    await controller.handleWebhook({
      ...baseUpdate,
      message: { ...baseUpdate.message!, text: '1' },
    });

    expect(appService.createYaOrder).toHaveBeenCalledWith(
      { orderId: '101' },
      { rnd: 'rnd-1', tul: 'tul-1' },
    );
    expect(botService.sendEmployeeMessage).toHaveBeenCalledWith(
      expect.stringContaining('BFWGPFSMQ'),
      false,
      '123',
    );
  });

  it('should register the selected 5Post order by list number', async () => {
    jest.spyOn(shopService, 'getOrdersForBotRegistration').mockResolvedValue({
      orders: registrationCandidates,
      yaSourcePlatformIds: { rnd: 'rnd-1', tul: 'tul-1' },
      fivePostSenderLocation: 'loc-1',
      dpdSourceTerminalIds: { rnd: 'dpd-rnd-1', tul: 'dpd-tul-1' },
    });
    jest.spyOn(appService, 'createFivePostOrder').mockResolvedValue({
      ok: true,
      data: { track: 'TRACK-1' },
    });

    await controller.handleWebhook({
      ...baseUpdate,
      message: {
        ...baseUpdate.message!,
        text: '/register',
        entities: [registerCommandEntity],
      },
    });
    jest.clearAllMocks();

    await controller.handleWebhook({
      ...baseUpdate,
      message: { ...baseUpdate.message!, text: '2' },
    });

    expect(appService.createFivePostOrder).toHaveBeenCalledWith(
      { orderId: '102' },
      'loc-1',
    );
    expect(botService.sendEmployeeMessage).toHaveBeenCalledWith(
      expect.stringContaining('AXQ12345Z'),
      false,
      '123',
    );
  });

  it('should register the selected DPD order by list number', async () => {
    jest.spyOn(shopService, 'getOrdersForBotRegistration').mockResolvedValue({
      orders: registrationCandidates,
      yaSourcePlatformIds: { rnd: 'rnd-1', tul: 'tul-1' },
      fivePostSenderLocation: 'loc-1',
      dpdSourceTerminalIds: { rnd: 'dpd-rnd-1', tul: 'dpd-tul-1' },
    });
    jest.spyOn(appService, 'createDpdOrder').mockResolvedValue({
      ok: true,
      data: { track: '01010001MOW', status: 'OK' },
    });

    await controller.handleWebhook({
      ...baseUpdate,
      message: {
        ...baseUpdate.message!,
        text: '/register',
        entities: [registerCommandEntity],
      },
    });
    jest.clearAllMocks();

    await controller.handleWebhook({
      ...baseUpdate,
      message: { ...baseUpdate.message!, text: '3' },
    });

    expect(appService.createDpdOrder).toHaveBeenCalledWith(
      { orderId: '103' },
      { rnd: 'dpd-rnd-1', tul: 'dpd-tul-1' },
    );
    expect(botService.sendEmployeeMessage).toHaveBeenCalledWith(
      expect.stringContaining('DPD987654'),
      false,
      '123',
    );
  });

  it('should reject an out-of-range order number', async () => {
    jest.spyOn(shopService, 'getOrdersForBotRegistration').mockResolvedValue({
      orders: registrationCandidates,
      yaSourcePlatformIds: {},
      fivePostSenderLocation: undefined,
      dpdSourceTerminalIds: {},
    });

    await controller.handleWebhook({
      ...baseUpdate,
      message: {
        ...baseUpdate.message!,
        text: '/register',
        entities: [registerCommandEntity],
      },
    });
    jest.clearAllMocks();

    await controller.handleWebhook({
      ...baseUpdate,
      message: { ...baseUpdate.message!, text: '99' },
    });

    expect(appService.createYaOrder).not.toHaveBeenCalled();
    expect(appService.createFivePostOrder).not.toHaveBeenCalled();
    expect(appService.createDpdOrder).not.toHaveBeenCalled();
    expect(botService.sendEmployeeMessage).toHaveBeenCalledWith(
      expect.stringContaining('Некорректный номер'),
      false,
      '123',
    );
  });
});
