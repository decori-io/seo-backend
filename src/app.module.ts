import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { WebsiteProfilesModule } from './website-profiles/website-profiles.module';
import { SharedModule } from './shared';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    SharedModule,
    UsersModule,
    WebsiteProfilesModule,
    ConfigModule.forRoot({
      isGlobal: true, 
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
