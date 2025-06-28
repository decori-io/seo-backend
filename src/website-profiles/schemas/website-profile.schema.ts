import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types, PopulatedDoc } from 'mongoose';
import { KeywordDocument } from '../../agents/keywords/schemas/keyword.schema';

export interface IWebsiteProfile {
  _id: Types.ObjectId;
  domain: string;
  userId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  jobId?: string | null;
  lastScrapedAt?: Date | null;
  shortAbout?: string | null;
  businessOverview?: string | null;
  valueProps?: string[] | null;
  intents?: string[] | null;
  ICPs?: string[] | null;
  seedKeywords?: string[] | null;
  leanKeywords?: string[] | null;
  // References to validated keywords from third-party SEO data providers
  seoValidatedKeywords?: Types.ObjectId[] | null;
  // References to filtered relevant keywords
  relevantKeywords?: Types.ObjectId[] | null;
}

// Interface for populated website profile (when keywords are populated)
export interface IWebsiteProfilePopulated extends Omit<IWebsiteProfile, 'seoValidatedKeywords' | 'relevantKeywords'> {
  seoValidatedKeywords?: PopulatedDoc<KeywordDocument>[] | null;
  relevantKeywords?: PopulatedDoc<KeywordDocument>[] | null;
}

export type WebsiteProfileDocument = IWebsiteProfile & Document;
export type WebsiteProfilePopulatedDocument = IWebsiteProfilePopulated & Document;

@Schema({ timestamps: true })
export class WebsiteProfile {
  @Prop({ required: true })
  domain: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false, default: null })
  userId: Types.ObjectId | null;

  @Prop({ type: String, required: false, default: null })
  jobId?: string | null;

  @Prop({ type: Date, required: false, default: null })
  lastScrapedAt?: Date | null;

  @Prop({ type: String, required: false, default: null })
  shortAbout?: string | null;

  @Prop({ type: String, required: false, default: null })
  businessOverview?: string | null;

  @Prop({ type: [String], required: false, default: null })
  valueProps?: string[] | null;

  @Prop({ type: [String], required: false, default: null })
  intents?: string[] | null;

  @Prop({ type: [String], required: false, default: null })
  ICPs?: string[] | null;

  @Prop({ type: [String], required: false, default: null })
  seedKeywords?: string[] | null;

  @Prop({ type: [String], required: false, default: null })
  leanKeywords?: string[] | null;

  // References to validated keywords from third-party SEO data providers
  @Prop({ 
    type: [{ type: Types.ObjectId, ref: 'Keyword' }], 
    required: false, 
    default: null 
  })
  seoValidatedKeywords?: Types.ObjectId[] | null;

  // References to filtered relevant keywords
  @Prop({ 
    type: [{ type: Types.ObjectId, ref: 'Keyword' }], 
    required: false, 
    default: null 
  })
  relevantKeywords?: Types.ObjectId[] | null;
}

export const WebsiteProfileSchema = SchemaFactory.createForClass(WebsiteProfile); 