import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type KeywordDocument = Keyword & Document;

export enum KeywordDifficulty {
  UNKNOWN = 'UNKNOWN',
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH'
}

@Schema({ timestamps: true, toJSON: { virtuals: true } })
export class Keyword {
  @Prop({ required: true, index: true })
  keyword: string;

  @Prop({ required: true, min: 0 })
  searchVolume: number;

  @Prop({ 
    required: true, 
    enum: KeywordDifficulty,
    default: KeywordDifficulty.UNKNOWN
  })
  difficulty: KeywordDifficulty;

  @Prop({ type: Date })
  lastUpdated?: Date;

  @Prop({ type: String })
  provider?: string;

  @Prop({ type: MongooseSchema.Types.Mixed })
  rawSource?: any;
}

export const KeywordSchema = SchemaFactory.createForClass(Keyword);

// Create index on keyword for faster lookups
KeywordSchema.index({ keyword: 1 }, { unique: true }); 