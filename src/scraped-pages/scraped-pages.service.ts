import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ScrapedPage, ScrapedPageDocument } from './schemas/scraped-page.schema';
import { PageClassifier } from '../shared/utils/page-classifier.util';
import { FirecrawlDocument } from '@mendable/firecrawl-js';

@Injectable()
export class ScrapedPagesService {
  constructor(
    @InjectModel(ScrapedPage.name)
    private readonly scrapedPageModel: Model<ScrapedPageDocument>,
  ) {}

  async bulkCreateFromFirecrawl(
    pages: FirecrawlDocument[],
    websiteProfileId: Types.ObjectId,
  ): Promise<ScrapedPageDocument[]> {
    const pagesToCreate = pages.reduce(
      (acc, page) => {
        if (page.metadata?.url) {
          const pageType = PageClassifier.classify(page.metadata?.url);
          acc.push({
            url: page.metadata?.url,
            type: pageType,
            context: page,
            websiteProfileId: websiteProfileId,
          });
        }
        return acc;
      },
      [] as Omit<ScrapedPage, 'createdAt' | 'updatedAt'>[],
    );

    if (pagesToCreate.length === 0) {
      return [];
    }

    return this.scrapedPageModel.insertMany(pagesToCreate);
  }
}
