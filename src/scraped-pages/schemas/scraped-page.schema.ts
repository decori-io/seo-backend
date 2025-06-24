import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';

export type ScrapedPageDocument = ScrapedPage & Document;

@Schema({ timestamps: true, toJSON: { virtuals: true } })
export class ScrapedPage {
  @Prop({ required: true })
  url: string;

  @Prop({ required: true })
  type: string;

  @Prop({ type: MongooseSchema.Types.Mixed, required: true })
  context: any;

  @Prop({ type: Types.ObjectId, ref: 'WebsiteProfile', required: true })
  websiteProfileId: Types.ObjectId;
}

export const ScrapedPageSchema = SchemaFactory.createForClass(ScrapedPage);

// Create compound unique index on websiteProfileId + url
ScrapedPageSchema.index({ websiteProfileId: 1, url: 1 }, { unique: true }); 