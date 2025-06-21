import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export interface IWebsiteProfile {
  _id: Types.ObjectId;
  domain: string;
  userId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  jobId?: string | null;
  lastScrapedAt?: Date | null;
}

export type WebsiteProfileDocument = IWebsiteProfile & Document;

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
}

export const WebsiteProfileSchema = SchemaFactory.createForClass(WebsiteProfile); 