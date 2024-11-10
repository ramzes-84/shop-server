import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MailerModule, MailerService } from '@nestjs-modules/mailer';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { YaModule } from './ya/ya.module';
import { ShopModule } from './shop/shop.module';
import { AuthModule } from './auth/auth.module';
import { MailService } from './mail/mail.service';
import { BxbModule } from './bxb/bxb.module';
import { CashModule } from './cash/cash.module';
import { BotModule } from './bot/bot.module';

describe('AppModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
        }),
        YaModule,
        ShopModule,
        AuthModule,
        BxbModule,
        CashModule,
        BotModule,
        MailerModule.forRootAsync({
          imports: [ConfigModule],
          useFactory: async (configService: ConfigService) => ({
            transport: {
              host: configService.get<string>('MAIL_HOST'),
              port: 465,
              auth: {
                user: configService.get<string>('MAIL_USER'),
                pass: configService.get<string>('MAIL_PASS'),
              },
            },
            defaults: {
              from: `"No Reply" <${configService.get<string>('MAIL_USER')}>`,
            },
          }),
          inject: [ConfigService],
        }),
      ],
      controllers: [AppController],
      providers: [AppService, MailService],
    }).compile();
  });

  it('should provide AppService', () => {
    const appService = module.get<AppService>(AppService);
    expect(appService).toBeDefined();
  });

  it('should provide AppController', () => {
    const appController = module.get<AppController>(AppController);
    expect(appController).toBeDefined();
  });

  it('should provide MailService', () => {
    const mailService = module.get<MailService>(MailService);
    expect(mailService).toBeDefined();
  });

  it('should provide MailerService', () => {
    const mailerService = module.get<MailerService>(MailerService);
    expect(mailerService).toBeDefined();
  });

  it('should import YaModule', () => {
    const yaModule = module.get<YaModule>(YaModule);
    expect(yaModule).toBeDefined();
  });

  it('should import ShopModule', () => {
    const shopModule = module.get<ShopModule>(ShopModule);
    expect(shopModule).toBeDefined();
  });

  it('should import BxbModule', () => {
    const bxbModule = module.get<BxbModule>(BxbModule);
    expect(bxbModule).toBeDefined();
  });

  it('should import CashModule', () => {
    const cashModule = module.get<CashModule>(CashModule);
    expect(cashModule).toBeDefined();
  });

  it('should import BotModule', () => {
    const botModule = module.get<BotModule>(BotModule);
    expect(botModule).toBeDefined();
  });

  it('should import AuthModule', () => {
    const authModule = module.get<AuthModule>(AuthModule);
    expect(authModule).toBeDefined();
  });

  it('should import ConfigModule', () => {
    const configModule = module.get<ConfigModule>(ConfigModule);
    expect(configModule).toBeDefined();
  });
});
