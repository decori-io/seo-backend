import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as express from 'express';

// Initialize and configure the NestJS application with proper middleware and settings
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Enable JSON body parsing middleware for incoming requests
  app.use(express.json());

  // Apply global validation pipe for automatic DTO validation
  app.useGlobalPipes(new ValidationPipe());
  
  // Enable graceful shutdown hooks for proper cleanup
  app.enableShutdownHooks();
  
  // Start the application on the specified port or default to 3000
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
