import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

function corsOrigins(config: ConfigService): string[] {
  const origins = new Set<string>(['http://localhost:3000']);
  const configured = config.get<string>('FRONTEND_ORIGIN');
  if (configured) {
    origins.add(configured.replace(/\/+$/, ''));
  }
  return [...origins];
}

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
    origin: corsOrigins(config),
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Vercel injects PORT. If PORT=3001 is set in the Vercel dashboard it
  // overwrites that value and the function crashes — delete it there.
  if (process.env.VERCEL === '1' && process.env.PORT === '3001') {
    console.error(
      'PORT=3001 is set in Vercel env vars. Remove it so Vercel can inject its own PORT.',
    );
  }

  const port = Number(process.env.PORT ?? 3001);
  await app.listen(port);
}

bootstrap().catch((error: unknown) => {
  console.error('NestJS bootstrap failed:', error);
  throw error;
});
