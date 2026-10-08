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

const SENDER_1 = { email: 'shop-1@example.com', phone: '79000000001' };
const SENDER_2 = { email: 'shop-2@example.com', phone: '79000000002' };

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

  const groupUpdate = (
    text: string,
    replyMessageId?: number,
    entities?: TelegramMessageEntity[],
  ): TelegramUpdate => ({
    ...baseUpdate,
    message: {
      ...baseUpdate.message!,
      chat: { id: -100, type: 'supergroup' },
      text,
      reply_to_message:
        replyMessageId === undefined
          ? undefined
          : { message_id: replyMessageId },
      entities,
    },
  });

  const sentMessage = (messageId: number) => ({
    ok: true as const,
    result: {
      message_id: messageId,
      from: {
        id: 9,
        is_bot: true,
        first_name: 'Bot',
        username: 'ShopHelperBot',
      },
      chat: { id: -100, title: 'Managers', type: 'supergroup' },
      date: 0,
      text: 'list',
    },
  });

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

  it('should accept a group YA reference only as a reply to the bot prompt', async () => {
    jest
      .mocked(botService.sendEmployeeMessage)
      .mockResolvedValue(sentMessage(77));
    jest.spyOn(yaService, 'findTrackByOrderReference').mockResolvedValue({
      reference: '0001',
      requestId: 'req-1',
      trackNumber: 'TRACK-0001',
      sharingUrl: undefined,
      status: YaParcelStatus.CREATED,
    });

    await controller.handleWebhook(groupUpdate('ya'));
    expect(botService.sendEmployeeMessage).not.toHaveBeenCalled();

    await controller.handleWebhook(
      groupUpdate('/ya', undefined, [yaCommandEntity]),
    );
    jest.clearAllMocks();
    await controller.handleWebhook(groupUpdate('0001'));
    await controller.handleWebhook(groupUpdate('0001', 76));

    expect(yaService.findTrackByOrderReference).not.toHaveBeenCalled();
    expect(botService.sendEmployeeMessage).not.toHaveBeenCalled();

    await controller.handleWebhook(groupUpdate('0001', 77));

    expect(yaService.findTrackByOrderReference).toHaveBeenCalledWith('0001');
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

  it('should expire an unanswered YA prompt after 10 minutes', async () => {
    jest.useFakeTimers();

    try {
      await controller.handleWebhook({
        ...baseUpdate,
        message: {
          ...baseUpdate.message!,
          text: '/ya',
          entities: [yaCommandEntity],
        },
      });
      jest.clearAllMocks();

      jest.advanceTimersByTime(10 * 60 * 1000);

      expect(botService.sendEmployeeMessage).toHaveBeenCalledWith(
        expect.stringContaining('Ожидание кода заказа истекло'),
        false,
        '123',
      );
      jest.clearAllMocks();

      await controller.handleWebhook(baseUpdate);

      expect(yaService.findTrackByOrderReference).not.toHaveBeenCalled();
    } finally {
      jest.useRealTimers();
    }
  });

  it('should cancel the YA expiry notice once the reference is received', async () => {
    jest.useFakeTimers();

    try {
      await controller.handleWebhook({
        ...baseUpdate,
        message: {
          ...baseUpdate.message!,
          text: '/ya',
          entities: [yaCommandEntity],
        },
      });
      jest
        .spyOn(yaService, 'findTrackByOrderReference')
        .mockRejectedValue(new Error('not found'));

      await controller.handleWebhook(baseUpdate);
      jest.clearAllMocks();
      jest.advanceTimersByTime(10 * 60 * 1000);

      expect(botService.sendEmployeeMessage).not.toHaveBeenCalled();
    } finally {
      jest.useRealTimers();
    }
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

  it('should accept a group order number only as a reply to the current list', async () => {
    let nextMessageId = 77;
    jest
      .mocked(botService.sendEmployeeMessage)
      .mockImplementation(async () => sentMessage(nextMessageId++));
    jest.spyOn(shopService, 'getOrdersForBotRegistration').mockResolvedValue({
      orders: registrationCandidates,
      yaSourcePlatformIds: {},
      fivePostSender: SENDER_1,
      dpdSourceTerminalIds: {},
    });
    jest.spyOn(appService, 'createYaOrder').mockResolvedValue({
      ok: true,
      data: { sharing_url: 'https://dostavka.yandex.ru/route/EXAMPLE' },
    });
    jest.spyOn(appService, 'createFivePostOrder').mockResolvedValue({
      ok: true,
      data: { track: 'TRACK-1' },
    });

    await controller.handleWebhook(
      groupUpdate('/register', undefined, [registerCommandEntity]),
    );
    jest.clearAllMocks();

    await controller.handleWebhook(groupUpdate('1'));
    await controller.handleWebhook(groupUpdate('0', 76));
    await controller.handleWebhook(groupUpdate('hello', 77));

    expect(appService.createYaOrder).not.toHaveBeenCalled();
    expect(botService.sendEmployeeMessage).not.toHaveBeenCalled();

    await controller.handleWebhook(groupUpdate('1', 77));
    expect(appService.createYaOrder).toHaveBeenCalledTimes(1);
    expect(shopService.getOrdersForBotRegistration).toHaveBeenCalledTimes(1);
    jest.clearAllMocks();

    await controller.handleWebhook(groupUpdate('2', 77));
    expect(appService.createFivePostOrder).not.toHaveBeenCalled();

    await controller.handleWebhook(groupUpdate('2', 79));
    expect(appService.createFivePostOrder).toHaveBeenCalledWith(
      { orderId: '102' },
      SENDER_1,
    );
  });

  it('should replace a YA prompt with registration', async () => {
    jest.useFakeTimers();

    try {
      jest.spyOn(shopService, 'getOrdersForBotRegistration').mockResolvedValue({
        orders: registrationCandidates,
        yaSourcePlatformIds: {},
        fivePostSender: undefined,
        dpdSourceTerminalIds: {},
      });
      jest.spyOn(appService, 'createYaOrder').mockResolvedValue({
        ok: true,
        data: { sharing_url: 'https://dostavka.yandex.ru/route/EXAMPLE' },
      });

      await controller.handleWebhook({
        ...baseUpdate,
        message: {
          ...baseUpdate.message!,
          text: '/ya',
          entities: [yaCommandEntity],
        },
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

      expect(yaService.findTrackByOrderReference).not.toHaveBeenCalled();
      expect(appService.createYaOrder).toHaveBeenCalledWith(
        { orderId: '101' },
        {},
      );
      jest.clearAllMocks();
      jest.advanceTimersByTime(10 * 60 * 1000);
      expect(botService.sendEmployeeMessage).not.toHaveBeenCalledWith(
        expect.stringContaining('Ожидание кода заказа истекло'),
        false,
        '123',
      );
    } finally {
      jest.useRealTimers();
    }
  });

  it('should replace registration with a YA prompt', async () => {
    jest.useFakeTimers();

    try {
      jest.spyOn(shopService, 'getOrdersForBotRegistration').mockResolvedValue({
        orders: registrationCandidates,
        yaSourcePlatformIds: {},
        fivePostSender: undefined,
        dpdSourceTerminalIds: {},
      });
      jest.spyOn(yaService, 'findTrackByOrderReference').mockResolvedValue({
        reference: '0001',
        requestId: 'req-1',
        trackNumber: 'TRACK-0001',
        sharingUrl: undefined,
        status: YaParcelStatus.CREATED,
      });

      await controller.handleWebhook({
        ...baseUpdate,
        message: {
          ...baseUpdate.message!,
          text: '/register',
          entities: [registerCommandEntity],
        },
      });
      await controller.handleWebhook({
        ...baseUpdate,
        message: {
          ...baseUpdate.message!,
          text: '/ya',
          entities: [yaCommandEntity],
        },
      });
      jest.clearAllMocks();

      await controller.handleWebhook(baseUpdate);

      expect(yaService.findTrackByOrderReference).toHaveBeenCalledWith('0001');
      expect(appService.createYaOrder).not.toHaveBeenCalled();
      jest.clearAllMocks();
      jest.advanceTimersByTime(10 * 60 * 1000);
      expect(botService.sendEmployeeMessage).not.toHaveBeenCalled();
    } finally {
      jest.useRealTimers();
    }
  });

  it('should list orders available for registration on /register', async () => {
    jest.spyOn(shopService, 'getOrdersForBotRegistration').mockResolvedValue({
      orders: [
        { ...registrationCandidates[0], trackingNumber: 'YA-123' },
        ...registrationCandidates.slice(1),
      ],
      yaSourcePlatformIds: { rnd: 'rnd-1', tul: 'tul-1' },
      fivePostSender: SENDER_1,
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
      expect.stringContaining('1. BFWGPFSMQ Васильева | Трек: YA-123'),
      false,
      '123',
    );
    expect(botService.sendEmployeeMessage).toHaveBeenCalledWith(
      expect.stringContaining('2. AXQ12345Z Петров | Трек: нет'),
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
      fivePostSender: undefined,
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
      fivePostSender: SENDER_1,
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
      fivePostSender: SENDER_1,
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
      SENDER_1,
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
      fivePostSender: SENDER_1,
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

  it('should reload the list from the shop after a single registration', async () => {
    jest
      .spyOn(shopService, 'getOrdersForBotRegistration')
      .mockResolvedValueOnce({
        orders: registrationCandidates,
        yaSourcePlatformIds: { rnd: 'rnd-1', tul: 'tul-1' },
        fivePostSender: SENDER_1,
        dpdSourceTerminalIds: { rnd: 'dpd-rnd-1', tul: 'dpd-tul-1' },
      })
      .mockResolvedValue({
        orders: [
          { ...registrationCandidates[0], trackingNumber: 'YA-NEW' },
          { ...registrationCandidates[1], trackingNumber: 'TRACK-EXTERNAL' },
          registrationCandidates[2],
        ],
        yaSourcePlatformIds: { rnd: 'rnd-1', tul: 'tul-1' },
        fivePostSender: SENDER_2,
        dpdSourceTerminalIds: { rnd: 'dpd-rnd-1', tul: 'dpd-tul-1' },
      });
    jest.spyOn(appService, 'createYaOrder').mockResolvedValue({
      ok: true,
      data: { sharing_url: 'https://dostavka.yandex.ru/route/EXAMPLE' },
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
      message: { ...baseUpdate.message!, text: '1' },
    });

    expect(botService.sendEmployeeMessage).toHaveBeenCalledWith(
      expect.stringContaining('1. BFWGPFSMQ Васильева | Трек: YA-NEW'),
      false,
      '123',
    );
    expect(botService.sendEmployeeMessage).toHaveBeenCalledWith(
      expect.stringContaining('2. AXQ12345Z Петров | Трек: TRACK-EXTERNAL'),
      false,
      '123',
    );
    jest.clearAllMocks();

    await controller.handleWebhook({
      ...baseUpdate,
      message: { ...baseUpdate.message!, text: '2' },
    });

    expect(appService.createFivePostOrder).toHaveBeenCalledWith(
      { orderId: '102' },
      SENDER_2,
    );
  });

  it('should clear the session when the shop has no more orders', async () => {
    jest
      .spyOn(shopService, 'getOrdersForBotRegistration')
      .mockResolvedValueOnce({
        orders: [registrationCandidates[0]],
        yaSourcePlatformIds: { rnd: 'rnd-1', tul: 'tul-1' },
        fivePostSender: SENDER_1,
        dpdSourceTerminalIds: { rnd: 'dpd-rnd-1', tul: 'dpd-tul-1' },
      })
      .mockResolvedValue({
        orders: [],
        yaSourcePlatformIds: { rnd: 'rnd-1', tul: 'tul-1' },
        fivePostSender: SENDER_1,
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

    expect(botService.sendEmployeeMessage).toHaveBeenCalledWith(
      expect.stringContaining('Нет заказов'),
      false,
      '123',
    );
    jest.clearAllMocks();

    // Сессии больше нет — число трактуется как обычное необработанное сообщение.
    await controller.handleWebhook({
      ...baseUpdate,
      message: { ...baseUpdate.message!, text: '1' },
    });

    expect(appService.createYaOrder).not.toHaveBeenCalled();
    expect(botService.sendEmployeeMessage).not.toHaveBeenCalled();
  });

  it('should expire the registration session after 10 minutes of inactivity', async () => {
    jest.useFakeTimers();

    try {
      jest.spyOn(shopService, 'getOrdersForBotRegistration').mockResolvedValue({
        orders: registrationCandidates,
        yaSourcePlatformIds: {},
        fivePostSender: undefined,
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

      jest.advanceTimersByTime(10 * 60 * 1000);

      expect(botService.sendEmployeeMessage).toHaveBeenCalledWith(
        expect.stringContaining('истекла'),
        false,
        '123',
      );
      jest.clearAllMocks();

      await controller.handleWebhook({
        ...baseUpdate,
        message: { ...baseUpdate.message!, text: '1' },
      });

      expect(appService.createYaOrder).not.toHaveBeenCalled();
    } finally {
      jest.useRealTimers();
    }
  });

  it('should register all candidates sequentially when "0" is selected', async () => {
    jest.spyOn(shopService, 'getOrdersForBotRegistration').mockResolvedValue({
      orders: registrationCandidates,
      yaSourcePlatformIds: { rnd: 'rnd-1', tul: 'tul-1' },
      fivePostSender: SENDER_1,
      dpdSourceTerminalIds: { rnd: 'dpd-rnd-1', tul: 'dpd-tul-1' },
    });
    jest.spyOn(appService, 'createYaOrder').mockResolvedValue({
      ok: true,
      data: { sharing_url: 'https://dostavka.yandex.ru/route/EXAMPLE' },
    });
    jest.spyOn(appService, 'createFivePostOrder').mockResolvedValue({
      ok: false,
      data: { message: '5Post недоступен' },
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
      message: { ...baseUpdate.message!, text: '0' },
    });

    expect(appService.createYaOrder).toHaveBeenCalledWith(
      { orderId: '101' },
      { rnd: 'rnd-1', tul: 'tul-1' },
    );
    expect(appService.createFivePostOrder).toHaveBeenCalledWith(
      { orderId: '102' },
      SENDER_1,
    );
    expect(appService.createDpdOrder).toHaveBeenCalledWith(
      { orderId: '103' },
      { rnd: 'dpd-rnd-1', tul: 'dpd-tul-1' },
    );
    expect(botService.sendEmployeeMessage).toHaveBeenCalledWith(
      expect.stringContaining('Начинаю регистрацию заказов: 3'),
      false,
      '123',
    );
    expect(botService.sendEmployeeMessage).toHaveBeenCalledWith(
      expect.stringContaining('✅ BFWGPFSMQ'),
      false,
      '123',
    );
    expect(botService.sendEmployeeMessage).toHaveBeenCalledWith(
      expect.stringContaining('❌ AXQ12345Z: 5Post недоступен'),
      false,
      '123',
    );
    expect(botService.sendEmployeeMessage).toHaveBeenCalledWith(
      expect.stringContaining('✅ DPD987654'),
      false,
      '123',
    );
  });

  it('should reject an out-of-range order number', async () => {
    jest.spyOn(shopService, 'getOrdersForBotRegistration').mockResolvedValue({
      orders: registrationCandidates,
      yaSourcePlatformIds: {},
      fivePostSender: undefined,
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
