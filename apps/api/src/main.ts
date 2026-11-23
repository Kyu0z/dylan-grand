import 'reflect-metadata';
import 'dotenv/config';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { SWAGGER_TAGS } from './swagger/swagger-tags';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  const origins = (process.env.CORS_ALLOWED_ORIGINS ?? 'http://localhost:3000,http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.enableCors({ origin: origins });
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );

  // Swagger is intentionally opt-in in production, until access protection is implemented.
  const docsEnabled = process.env.SWAGGER_ENABLED === 'true' ||
    (process.env.NODE_ENV !== 'production' && process.env.SWAGGER_ENABLED !== 'false');

  if (docsEnabled) {
    const documentBuilder = new DocumentBuilder()
      .setTitle('Dylan Grand Hotel | REST API')
      .setDescription([
        'Single-hotel booking and management API.',
        '',
        '**Current phase: database-backed API workflows (development / Swagger testing).**',
        '- **DB**: Room Types, Physical Rooms, rates, continuous availability, booking, check-in/out, housekeeping, manual payments/refunds, extras, accounts and reports.',
        '- **MANUAL PAYMENTS ONLY**: no online payment gateway, no card capture and no automatic bank verification.',
        '- **SECURITY**: staff endpoints require Bearer JWT + RBAC; use auth/setup-admin once in development, then auth/login.',
        '- **OPERATIONS**: check-out is exclusive, all dates use Asia/Ho_Chi_Minh hotel business date, expired holds release inventory.',
        '',
        'One API for **User Site** (Next.js) and **Admin Site** (React/Vite). Frontend integration is intentionally deferred.',
      ].join('\n'))
      .setVersion('1.0.0')
      .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT', description: 'JWT access token from POST /api/v1/auth/login.' }, 'access-token');

    for (const tag of SWAGGER_TAGS) {
      documentBuilder.addTag(tag.name, tag.description);
    }

    const config = documentBuilder.build();
    const documentFactory = () => SwaggerModule.createDocument(app, config, {
      autoTagControllers: false,
      operationIdFactory: (controller, method) => `${controller}_${method}`,
    });

    SwaggerModule.setup('api/docs', app, documentFactory, {
      jsonDocumentUrl: 'api/docs/json',
      yamlDocumentUrl: 'api/docs/yaml',
      customSiteTitle: 'Dylan Grand Hotel | API Reference',
      customCss: `
        .swagger-ui .topbar { background: #19352a; border-bottom: 3px solid #b9a27a; }
        .swagger-ui .topbar .download-url-wrapper { display: none; }
        .swagger-ui .info hgroup.main h2, .swagger-ui .info .title { color: #19352a; }
        .swagger-ui .opblock-tag { border-bottom-color: #ded8cc; }
        .swagger-ui .opblock-tag:hover { background: #f6f3ec; }
        .swagger-ui .btn.execute { background: #254b3d; border-color: #254b3d; }
        .swagger-ui .information-container { padding-top: 12px; }
      `,
      swaggerOptions: {
        docExpansion: 'none',
        filter: true,
        deepLinking: true,
        displayRequestDuration: true,
        persistAuthorization: false,
        tryItOutEnabled: false,
        defaultModelsExpandDepth: 0,
        tagsSorter: 'none',
        operationsSorter: 'method',
      },
    });
  }

  const port = Number(process.env.PORT ?? 4000);
  await app.listen(port, '0.0.0.0');
}

void bootstrap();
