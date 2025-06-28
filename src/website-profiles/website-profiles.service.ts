import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { WebsiteProfile, WebsiteProfileDocument, WebsiteProfilePopulatedDocument } from './schemas/website-profile.schema';
import { CreateWebsiteProfileDto } from './dto/create-website-profile.dto';
import { SemanticUnderstandingService } from '../agents/semantic-understanding/semantic-understanding.service';
import { ScrapedPage, ScrapedPageDocument } from '../scraped-pages/schemas/scraped-page.schema';
import { PageType } from '../shared/utils/page-classifier.util';

@Injectable()
export class WebsiteProfilesService {
  constructor(
    @InjectModel(WebsiteProfile.name) private websiteProfileModel: Model<WebsiteProfileDocument>,
    @InjectModel(ScrapedPage.name) private scrapedPageModel: Model<ScrapedPageDocument>,
    private readonly semanticUnderstandingService: SemanticUnderstandingService,
  ) {}

  async create(createWebsiteProfileDto: CreateWebsiteProfileDto): Promise<WebsiteProfileDocument> {
    const newProfile = new this.websiteProfileModel(createWebsiteProfileDto);
    const savedProfile = await newProfile.save();

    return savedProfile;
  }

  async findById(id: string): Promise<WebsiteProfileDocument | null> {
    return this.websiteProfileModel.findById(id).exec();
  }

  async findByIdWithPopulatedKeywords(id: string): Promise<WebsiteProfilePopulatedDocument | null> {
    return this.websiteProfileModel.findById(id).populate('seoValidatedKeywords').exec();
  }

  async update(id: string, update: Partial<WebsiteProfile>): Promise<WebsiteProfileDocument | null> {
    return this.websiteProfileModel.findByIdAndUpdate(id, update, { new: true }).exec();
  }

  /**
   * Generates a semantic analysis summary for a website profile using scraped page content
   * Filters for only the most valuable page types for product analysis
   */
  async generateSummary(websiteProfileId: string): Promise<WebsiteProfileDocument> {
    // Find the website profile
    const profile = await this.findById(websiteProfileId);
    if (!profile) {
      throw new NotFoundException('Website profile not found');
    }

    // If summary already exists, return the profile as-is
    if (profile.shortAbout) {
      return profile;
    }

    // Get scraped pages for this profile - filter for valuable page types only
    const scrapedPages = await this.scrapedPageModel
      .find({ 
        websiteProfileId: new Types.ObjectId(websiteProfileId),
        type: { 
          $in: [
            PageType.HOME,
            PageType.PRODUCT,
            PageType.CONTACT,
            PageType.ABOUT,
            PageType.PRICING
          ] 
        }
      })
      .limit(10) // Limit to first 10 pages to avoid token limits
      .exec();

    if (!scrapedPages.length) {
      throw new NotFoundException('No valuable pages found for this profile. Please scrape the website first.');
    }

    // Combine page content for analysis
    const combinedContent = scrapedPages
      .map(page => {
        const content = page.context as any;
        return `Page Type: ${page.type}\nURL: ${page.url}\nTitle: ${content?.metadata?.title || 'No title'}\nContent: ${content?.markdown || content?.content || 'No content'}`;
      })
      .join('\n\n---\n\n');

    // Generate semantic analysis
    const semanticResult = await this.semanticUnderstandingService.semanticUnderstanding(combinedContent);

    // Update the profile with all semantic analysis fields (converting from snake_case to camelCase)
    const updatedProfile = await this.update(websiteProfileId, {
      shortAbout: semanticResult.ai_summary.shortAbout,
      business_overview: semanticResult.ai_summary.business_overview,
      valueProps: semanticResult.ai_summary.value_props,
      intents: semanticResult.ai_summary.intents,
      ICPs: semanticResult.ai_summary.ICPs,
      seedKeywords: semanticResult.ai_summary.seed_keywords,
    });

    if (!updatedProfile) {
      throw new Error('Failed to update profile with summary');
    }

    return updatedProfile;
  }
}
