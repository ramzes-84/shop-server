import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class MailService {
  constructor(private readonly mailerService: MailerService) {}

  async emitHealth() {
    await this.mailerService.sendMail({
      to: process.env.MAIL_ADMIN,
      subject: 'Info from Shop Server',
      text: 'The Server is alive!',
    });
  }

  async sendToAdmin(subject: string, text: string) {
    await this.mailerService.sendMail({
      to: process.env.MAIL_ADMIN,
      subject,
      text,
    });
  }
}
