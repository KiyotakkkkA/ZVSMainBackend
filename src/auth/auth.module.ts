import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule } from 'src/config/config.module';
import { ConfigService } from 'src/config/config.service';
import { DatabaseModule } from 'src/database/database.module';
import { UsersModule } from 'src/users/users.module';
import { AuthGuard } from './auth.guard';
import { JwtStrategy } from './jwt.strategy';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwksController } from './jwks.controller';

@Module({
  imports: [
    ConfigModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        privateKey: configService.getJwtPrivateKey(),
        publicKey: configService.getJwtPublicKey(),
        signOptions: {
          algorithm: 'RS256',
          expiresIn: configService.getJwtAccessExpiresInSeconds(),
          keyid: configService.getJwtKid(),
        },
        verifyOptions: {
          algorithms: ['RS256'],
        },
      }),
    }),
    UsersModule,
    DatabaseModule,
  ],
  providers: [AuthService, AuthGuard, JwtStrategy],
  controllers: [AuthController, JwksController],
  exports: [AuthService, AuthGuard],
})
export class AuthModule {}
