import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { DatabaseModule } from './database/database.module';
import { ConfigModule } from './config/config.module';
import { VstoragesModule } from './vstorages/vstorages.module';

@Module({
  imports: [AuthModule, UsersModule, DatabaseModule, ConfigModule, VstoragesModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
