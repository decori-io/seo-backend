import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

// ScrapeJob schema tracks the status and result of a scraping job for a website profile
export type ScrapeJobDocument = ScrapeJob & Document;

export enum ScrapeJobStatus {
  Pending = 'pending',
  Processing = 'processing',
  Complete = 'complete',
  Failed = 'failed',
}

@Schema({ timestamps: true })
export class ScrapeJob {
  @Prop({ type: Types.ObjectId, ref: 'WebsiteProfile', required: true })
  websiteProfileId: Types.ObjectId;

  @Prop({ required: true })
  domain: string;

  @Prop({
    type: String,
    enum: ScrapeJobStatus,
    default: ScrapeJobStatus.Pending,
    required: true,
  })
  status: ScrapeJobStatus;

  @Prop({ type: [Types.ObjectId], ref: 'ScrapedPage', default: [] })
  resultPageIds: Types.ObjectId[];

  @Prop({ type: String, default: null })
  error: string | null;

  @Prop({ type: String, default: null })
  jobId?: string | null;

  @Prop({ type: Date, default: null })
  processingStartedAt?: Date | null;
}

export const ScrapeJobSchema = SchemaFactory.createForClass(ScrapeJob); 