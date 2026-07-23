import 'dotenv/config';
import 'reflect-metadata';
import { NestFactory, Reflector } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from '@libs/shared/system/common/filters/http-exception.filter';
import { TransformInterceptor } from '@libs/shared/system/common/interceptors/transform.interceptor';
import { AppLoggerService } from '@libs/shared/system/logger/logger.service';
import {
  ZodValidationPipe,
  ZodSerializerInterceptor,
  cleanupOpenApiDoc,
} from 'nestjs-zod';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    rawBody: true,
    bufferLogs: true,
  });

  const logger = app.get(AppLoggerService);
  app.useLogger(logger);

  app.use(cookieParser());

  app.enableCors({
    origin: [
      'http://localhost:3000',
      'http://localhost:3001',
      'https://jebbs-deli.vercel.app',
      'https://jebbs-deli-admin.vercel.app',
    ],
    credentials: true,
  });

  app.setGlobalPrefix('api');

  app.useGlobalPipes(new ZodValidationPipe());
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(
    new TransformInterceptor(),
    new ZodSerializerInterceptor(app.get(Reflector)),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Jebbs Deli Admin API')
    .setDescription('Admin backend API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = cleanupOpenApiDoc(
    SwaggerModule.createDocument(app, swaggerConfig),
  );
  SwaggerModule.setup('docs', app, document);

  const port = process.env.PORT || 8080;
  await app.listen(port);
  logger.log(`NestJS app listening on port ${port}`, 'Bootstrap');
  logger.log(
    `Swagger docs available at http://localhost:${port}/docs`,
    'Bootstrap',
  );
}

bootstrap();
