import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WebsiteProfilesService } from './website-profiles.service';
import { WebsiteProfile, WebsiteProfileSchema } from './schemas/website-profile.schema';
import { WebsiteProfilesController } from './website-profiles.controller';
import { WorkflowsController } from './workflows/workflows.controller';
import { WorkflowsService } from './workflows/workflows.service';

@Module({
  imports: [MongooseModule.forFeature([{ name: WebsiteProfile.name, schema: WebsiteProfileSchema }])],
  providers: [WebsiteProfilesService, WorkflowsService],
  controllers: [WebsiteProfilesController, WorkflowsController],
  exports: [WebsiteProfilesService, WorkflowsService],
})
export class WebsiteProfilesModule {}
