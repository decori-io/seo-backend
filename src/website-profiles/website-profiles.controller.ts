import { Body, Controller, Post, Get, Param, NotFoundException } from '@nestjs/common';
import { WebsiteProfilesService } from './website-profiles.service';
import { CreateWebsiteProfileDto } from './dto/create-website-profile.dto';

@Controller('website-profiles')
export class WebsiteProfilesController {
  constructor(private readonly websiteProfilesService: WebsiteProfilesService) {}

  @Post()
  create(@Body() createWebsiteProfileDto: CreateWebsiteProfileDto) {
    return this.websiteProfilesService.create(createWebsiteProfileDto);
  }

  // Get a website profile by ID
  @Get(':id')
  async findById(@Param('id') id: string) {
    const profile = await this.websiteProfilesService.findById(id);
    if (!profile) throw new NotFoundException('WebsiteProfile not found');
    return profile;
  }
}
