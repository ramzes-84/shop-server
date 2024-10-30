import { Test, TestingModule } from '@nestjs/testing';
import { MailerService } from '@nestjs-modules/mailer';
import { MailService } from './mail.service';

describe('MailService', () => {
  let service: MailService;
  let mailerService: MailerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MailService,
        {
          provide: MailerService,
          useValue: {
            sendMail: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<MailService>(MailService);
    mailerService = module.get<MailerService>(MailerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendToAdmin', () => {
    it('should send an email to the admin', async () => {
      process.env.MAIL_ADMIN = 'admin@example.com';
      const sendMailSpy = jest
        .spyOn(mailerService, 'sendMail')
        .mockResolvedValueOnce(undefined);

      await service.sendToAdmin();

      expect(sendMailSpy).toHaveBeenCalledWith({
        to: 'admin@example.com',
        subject: 'Info from Shop Server',
        text: 'The Server is alive!',
      });
    });
  });
});
