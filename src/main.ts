import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { RequestMethod } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.set('trust proxy', ['loopback', 'linklocal', 'uniquelocal']);

  app.setGlobalPrefix('api', {
    exclude: [{ path: '.well-known/jwks.json', method: RequestMethod.GET }],
  });

  app.enableCors({
    origin: [
      ...[
        ...(process.env.ALLOW_ORIGINS || '')
          .split(',')
          .map((origin) => origin.trim()),
      ],
    ],
    credentials: true,
  });

  await app.listen(8080);
}
void bootstrap();
