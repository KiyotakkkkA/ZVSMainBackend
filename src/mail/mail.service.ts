import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { ConfigService } from 'src/config/config.service';

@Injectable()
export class MailService {
  constructor(
    private readonly configService: ConfigService,
    private readonly mailerService: MailerService,
  ) {}

  async sendVerificationCode(email: string, code: string): Promise<void> {
    const appName = this.configService.getMailAppName();

    await this.mailerService.sendMail({
      from: this.configService.getMailFrom(),
      to: email,
      subject: `${appName}: Подтверждение электронной почты`,
      html: this.createVerificationCodeHtml(code),
      text: `${appName}: Подтвердите ваш адрес электронной почты, используя код: ${code}`,
    });
  }

  private createVerificationCodeHtml(code: string): string {
    return `
			<div style="background-color: rgb(245, 245, 245); padding: 24px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: rgb(38, 38, 38);">
				<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 560px; margin: 0 auto; background-color: rgb(250, 250, 250); border: 1px solid rgb(229, 229, 229); border-radius: 14px; overflow: hidden;">
					<tr>
						<td style="padding: 20px 24px; background: linear-gradient(135deg, rgb(64, 64, 64), rgb(23, 23, 23)); color: rgb(250, 250, 250); font-size: 18px; font-weight: 700; letter-spacing: 0.3px;">
							Код подтверждения
						</td>
					</tr>
					<tr>
						<td style="padding: 24px;">
							<p style="margin: 0 0 10px; font-size: 14px; line-height: 1.6; color: rgb(82, 82, 82);">
								Используйте этот код для подтверждения вашего адреса электронной почты.
							</p>
							<div style="margin: 18px 0; padding: 16px; border-radius: 10px; border: 1px solid rgb(212, 212, 212); background-color: rgb(245, 245, 245); text-align: center;">
								<span style="display: inline-block; font-size: 34px; line-height: 1; letter-spacing: 10px; font-weight: 800; color: rgb(23, 23, 23);">${code}</span>
							</div>
							<p style="margin: 0; font-size: 13px; line-height: 1.6; color: rgb(115, 115, 115);">
								Если вы не запрашивали этот код, просто проигнорируйте это письмо.
							</p>
						</td>
					</tr>
				</table>
			</div>
		`;
  }
}
