import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { WebsiteProfile, WebsiteProfileDocument } from './schemas/website-profile.schema';
import { CreateWebsiteProfileDto } from './dto/create-website-profile.dto';

@Injectable()
export class WebsiteProfilesService {
  constructor(
    @InjectModel(WebsiteProfile.name) private websiteProfileModel: Model<WebsiteProfileDocument>,
  ) {}

  async create(createWebsiteProfileDto: CreateWebsiteProfileDto): Promise<WebsiteProfileDocument> {
    const createdProfile = new this.websiteProfileModel(createWebsiteProfileDto);
    return createdProfile.save();
  }
}
