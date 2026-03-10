import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { DatabaseModule } from './database/database.module';
import { ConfigModule } from './config/config.module';
import { VstoragesModule } from './vstorages/vstorages.module';
import { MailModule } from './mail/mail.module';

@Module({
  imports: [AuthModule, UsersModule, DatabaseModule, ConfigModule, VstoragesModule, MailModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
