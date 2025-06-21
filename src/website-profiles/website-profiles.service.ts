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
    const newProfile = new this.websiteProfileModel(createWebsiteProfileDto);
    const savedProfile = await newProfile.save();

    return savedProfile;
  }

  async findById(id: string): Promise<WebsiteProfileDocument | null> {
    return this.websiteProfileModel.findById(id).exec();
  }

  async update(id: string, update: Partial<WebsiteProfile>): Promise<WebsiteProfileDocument | null> {
    return this.websiteProfileModel.findByIdAndUpdate(id, update, { new: true }).exec();
  }
}
