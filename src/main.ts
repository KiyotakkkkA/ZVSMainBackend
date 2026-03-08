import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');

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
