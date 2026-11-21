import 'reflect-metadata';
import 'dotenv/config';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { SWAGGER_TAGS } from './swagger/swagger-tags';
// import { SWAGGER_FAVICON_URL, SWAGGER_THEME_CSS } from './swagger/swagger-theme';


async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  const origins = (
    process.env.CORS_ALLOWED_ORIGINS ?? 'http://localhost:3000,http://localhost:5173'
  )
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
  const docsEnabled =
    process.env.SWAGGER_ENABLED === 'true' ||
    (process.env.NODE_ENV !== 'production' && process.env.SWAGGER_ENABLED !== 'false');

  if (docsEnabled) {
    const documentBuilder = new DocumentBuilder()
      .setTitle('Dylan Grand Hotel | API Reference')
      .setDescription([
        'Single-hotel booking and management API.',
        '',
        '**Current phase: Swagger-first foundation.**',
        '- **LIVE**: service health endpoint.',
        '- **DEMO**: public hotel profile and room catalog using presentation-only data.',
        '- **PLANNED**: reservation, payment, inventory, administration and authentication endpoints return HTTP 501.',
        '',
        'One API for **User Site** (Next.js) and **Admin Site** (React/Vite).',
        'Database and RBAC implementation will follow approved business decisions.',
      ].join('\n'))
      .setVersion('1.0.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Planned: JWT access token. Not active in this foundation.',
        },
        'access-token',
      );

    for (const tag of SWAGGER_TAGS) {
      documentBuilder.addTag(tag.name, tag.description);
    }

    const config = documentBuilder.build();
    const documentFactory = () =>
      SwaggerModule.createDocument(app, config, {
        autoTagControllers: false,
        operationIdFactory: (controller, method) => `${controller}_${method}`,
      });

    SwaggerModule.setup('api/docs', app, documentFactory, {
      jsonDocumentUrl: 'api/docs/json',
      yamlDocumentUrl: 'api/docs/yaml',
      customSiteTitle: 'Dylan Grand Hotel | API Reference',
   
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
