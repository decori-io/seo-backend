import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WebsiteProfilesService } from './website-profiles.service';
import { WebsiteProfile, WebsiteProfileSchema } from './schemas/website-profile.schema';
import { WebsiteProfilesController } from './website-profiles.controller';

@Module({
  imports: [MongooseModule.forFeature([{ name: WebsiteProfile.name, schema: WebsiteProfileSchema }])],
  providers: [WebsiteProfilesService],
  controllers: [WebsiteProfilesController],
  exports: [WebsiteProfilesService],
})
export class WebsiteProfilesModule {}
