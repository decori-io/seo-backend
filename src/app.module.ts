import { Logger, Module, OnApplicationShutdown, OnModuleInit } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { WebsiteProfilesModule } from './website-profiles/website-profiles.module';
import { SharedModule } from './shared';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { ScrapedPagesModule } from './scraped-pages/scraped-pages.module';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    SharedModule,
    UsersModule,
    WebsiteProfilesModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGO_URI'),
      }),
      inject: [ConfigService],
    }),
    ScheduleModule.forRoot(),
    ScrapedPagesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(AppModule.name);
  constructor(@InjectConnection() private readonly connection: Connection) {}

  onModuleInit(): any {
    this.logger.log('Database connection state:', this.connection.readyState);
    this.connection.on('connected', () => {
      this.logger.log('Database connected');
    });
    this.connection.on('error', (error) => {
      this.logger.error('Database connection error:', error);
    });
  }

  onApplicationShutdown(signal?: string) {
    this.logger.log(`Application is shutting down due to ${signal}. Closing database connection.`);
    return this.connection.close();
  }
}
