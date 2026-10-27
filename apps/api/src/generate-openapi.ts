import '@flama/env/load';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { cleanupOpenApiDoc } from 'nestjs-zod';
import { AppModule } from './app.module';

async function generate() {
  const app = await NestFactory.create(AppModule, {
    logger: false,
    abortOnError: false,
  });
  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  const config = new DocumentBuilder()
    .setTitle('Flama API')
    .setDescription('Flama REST API documentation')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();

  const document = cleanupOpenApiDoc(
    SwaggerModule.createDocument(app, config, {
      operationIdFactory: (_controller, method) => method,
    }),
  );
  const outputPath = resolve(__dirname, '../openapi.json');
  writeFileSync(outputPath, JSON.stringify(document, null, 2));
  console.log(`OpenAPI spec written to ${outputPath}`);

  await app.close();
  // Redis/BullMQ keep handles open even after the app closes, which would
  // leave this one-shot generator hanging; the document is already on disk.
  process.exit(0);
}

generate();
