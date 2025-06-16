import { Module } from '@nestjs/common';
import { WebsiteProfilesService } from './website-profiles.service';
import { WebsiteProfilesController } from './website-profiles.controller';

@Module({
  providers: [WebsiteProfilesService],
  controllers: [WebsiteProfilesController]
})
export class WebsiteProfilesModule {}
