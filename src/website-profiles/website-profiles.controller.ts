import { Body, Controller, Post } from '@nestjs/common';
import { WebsiteProfilesService } from './website-profiles.service';
import { CreateWebsiteProfileDto } from './dto/create-website-profile.dto';

@Controller('website-profiles')
export class WebsiteProfilesController {
  constructor(private readonly websiteProfilesService: WebsiteProfilesService) {}

  @Post()
  create(@Body() createWebsiteProfileDto: CreateWebsiteProfileDto) {
    return this.websiteProfilesService.create(createWebsiteProfileDto);
  }
}
