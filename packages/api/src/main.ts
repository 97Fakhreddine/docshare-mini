/**
 * Application bootstrap file.
 *
 * Responsibilities:
 * - Load environment variables
 * - Create and configure the Nest application (security, CORS, validation)
 * - Register global interceptors/guards/pipes
 * - Initialize Swagger (OpenAPI) docs
 * - Start HTTP server and print a friendly startup banner with URLs
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { RequestLoggingInterceptor } from './core/interceptors/request-logging.interceptor';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as dotenv from 'dotenv';

dotenv.config();

/**
 * Pretty-print a startup banner with API & Swagger URLs.
 * Uses ANSI colors; no extra deps required.
 */
function printStartupBanner({
  appName,
  env,
  baseUrl,
  apiPrefix,
  swaggerPath,
}: {
  appName: string;
  env: string;
  baseUrl: string;
  apiPrefix: string;
  swaggerPath: string;
}) {
  const reset = '\x1b[0m';
  const dim = (s: string) => `\x1b[2m${s}${reset}`;
  const cyan = (s: string) => `\x1b[36m${s}${reset}`;
  const green = (s: string) => `\x1b[32m${s}${reset}`;
  const magenta = (s: string) => `\x1b[35m${s}${reset}`;
  const bold = (s: string) => `\x1b[1m${s}${reset}`;

  const apiUrl = `${baseUrl}/${apiPrefix}`
    .replace(/\/+$/, '')
    .replace(/([^:]\/)\/+/g, '$1');
  const swaggerUrl = `${baseUrl}/${swaggerPath}`
    .replace(/\/+$/, '')
    .replace(/([^:]\/)\/+/g, '$1');

  const lines = [
    `${bold(`🚀 ${appName}`)} ${dim(`(${env})`)}`,
    `${green('API     ')} ${cyan(apiUrl)}`,
    `${green('Swagger ')} ${magenta(swaggerUrl)}`,
  ];

  const width =
    Math.max(...lines.map((l) => l.replace(/\x1b\[[0-9;]*m/g, '').length)) + 4;
  const top = '┌' + '─'.repeat(width - 2) + '┐';
  const bottom = '└' + '─'.repeat(width - 2) + '┘';
  const pad = (s: string) => {
    const visible = s.replace(/\x1b\[[0-9;]*m/g, '');
    const padding = ' '.repeat(width - 2 - visible.length);
    return `│ ${s}${padding} │`;
  };

  // Use Nest Logger so it respects the global logger behavior
  Logger.log(top, 'Bootstrap');
  lines.forEach((l) => Logger.log(pad(l), 'Bootstrap'));
  Logger.log(bottom, 'Bootstrap');
}

/**
 * Bootstraps the Nest application.
 * - Applies global pipes, CORS, Helmet, and a request logging interceptor
 * - Configures Swagger and exposes docs
 * - Starts the HTTP server and prints a startup banner
 */
async function bootstrap(): Promise<void> {
  try {
    const app = await NestFactory.create(AppModule, { bufferLogs: true });

    // Validation (DTO enforcement)
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    // Security & CORS
    app.use(helmet());
    app.enableCors({
      origin: true,
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
      credentials: true,
    });

    // HTTP request logging
    app.useGlobalInterceptors(
      new RequestLoggingInterceptor(new Logger('HTTP')),
    );

    // API + Swagger
    const apiPrefix = 'v1/api';
    const swaggerPath = 'v1/docs';
    app.setGlobalPrefix(apiPrefix);

    const swaggerConfig = new DocumentBuilder()
      .setTitle('DocShare Mini API')
      .setDescription(
        'Minimal document sharing API (auth, upload, share, audit)',
      )
      .setVersion('1.0')
      .addBearerAuth({
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'Token',
        description: 'Paste your JWT access token here.',
      })
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup(swaggerPath, app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        docExpansion: 'none',
      },
      customSiteTitle: 'DocShare Mini • API Docs',
    });

    // Start server
    const port = Number(process.env.PORT) || 3000;
    await app.listen(port);

    // Resolve the actual URL Nest is bound to
    const baseUrl = await app.getUrl(); // e.g., http://localhost:3000

    // Fancy banner
    printStartupBanner({
      appName: process.env.APP_NAME ?? 'DocShare Mini',
      env: process.env.NODE_ENV ?? 'development',
      baseUrl,
      apiPrefix,
      swaggerPath,
    });

    // Optional: mask sensitive parts in logs
    const maskedMongo =
      process.env.MONGODB_URI?.replace(/\/\/(.*)@/, '//***:***@') ?? 'not set';
    Logger.debug(`MongoDB: ${maskedMongo}`, 'Bootstrap');
  } catch (err) {
    // Ensure startup failures are clearly visible
    Logger.error('❌ Failed to bootstrap application', err as any, 'Bootstrap');
    process.exit(1);
  }
}

bootstrap();
