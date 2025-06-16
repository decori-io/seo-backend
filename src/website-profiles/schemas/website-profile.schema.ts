import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export interface IWebsiteProfile {
  _id: Types.ObjectId;
  domain: string;
  userId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export type WebsiteProfileDocument = IWebsiteProfile & Document;

@Schema({ timestamps: true })
export class WebsiteProfile {
  @Prop({ required: true })
  domain: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;
}

export const WebsiteProfileSchema = SchemaFactory.createForClass(WebsiteProfile); 