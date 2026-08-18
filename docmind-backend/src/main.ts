import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors({
    origin: config.get<string>('FRONTEND_ORIGIN', 'http://localhost:3000'),
  });

  // Vercel injects PORT; local default stays 3001.
  const port = Number(process.env.PORT ?? config.get<string>('PORT') ?? 3001);
  await app.listen(port);
}
bootstrap();
