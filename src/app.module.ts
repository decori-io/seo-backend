import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { WebsiteProfilesModule } from './website-profiles/website-profiles.module';
import { WebsiteProfilesModule } from './website-profiles/website-profiles.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [UsersModule, WebsiteProfilesModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
