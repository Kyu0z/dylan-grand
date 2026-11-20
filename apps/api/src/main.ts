import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const origins = (process.env.CORS_ALLOWED_ORIGINS ?? 'http://localhost:3000,http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  app.enableCors({ origin: origins });
  app.setGlobalPrefix('api/v1');
  const port = Number(process.env.PORT ?? 4000);
  await app.listen(port, '0.0.0.0');
}
void bootstrap();
