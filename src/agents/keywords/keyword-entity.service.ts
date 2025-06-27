import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Keyword, KeywordDocument } from './schemas/keyword.schema';
import { CreateKeywordDto } from './dto/keyword.dto';

@Injectable()
export class KeywordEntityService {
  private readonly logger = new Logger(KeywordEntityService.name);

  constructor(
    @InjectModel(Keyword.name) private keywordModel: Model<KeywordDocument>
  ) {}

  /**
   * Create a new keyword entry in the database
   */
  async create(createKeywordDto: CreateKeywordDto): Promise<KeywordDocument> {
    try {
      const keyword = new this.keywordModel(createKeywordDto);
      return await keyword.save();
    } catch (error) {
      if (error.code === 11000) {
        // Duplicate key error - keyword already exists
        this.logger.warn(`Keyword "${createKeywordDto.keyword}" already exists`);
        throw new Error(`Keyword "${createKeywordDto.keyword}" already exists`);
      }
      throw error;
    }
  }

  /**
   * Find all keywords with optional filtering
   */
  async findAll(filters?: Partial<Keyword>): Promise<KeywordDocument[]> {
    return this.keywordModel.find(filters || {}).exec();
  }

  /**
   * Find a keyword by its text value
   */
  async findByKeyword(keyword: string): Promise<KeywordDocument | null> {
    return this.keywordModel.findOne({ keyword }).exec();
  }

  /**
   * Find keyword by ID
   */
  async findById(id: string): Promise<KeywordDocument> {
    const keyword = await this.keywordModel.findById(id).exec();
    if (!keyword) {
      throw new NotFoundException(`Keyword with ID "${id}" not found`);
    }
    return keyword;
  }

  /**
   * Update a keyword by ID
   */
  async update(id: string, updateData: Partial<CreateKeywordDto>): Promise<KeywordDocument> {
    const keyword = await this.keywordModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .exec();
    
    if (!keyword) {
      throw new NotFoundException(`Keyword with ID "${id}" not found`);
    }
    
    return keyword;
  }

  /**
   * Delete a keyword by ID
   */
  async delete(id: string): Promise<void> {
    const result = await this.keywordModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`Keyword with ID "${id}" not found`);
    }
  }

  /**
   * Upsert keyword - create if not exists, update if exists
   */
  async upsert(createKeywordDto: CreateKeywordDto): Promise<KeywordDocument> {
    const existingKeyword = await this.findByKeyword(createKeywordDto.keyword);
    
    if (existingKeyword) {
      const updated = await this.keywordModel
        .findByIdAndUpdate((existingKeyword as KeywordDocument)._id, createKeywordDto, { new: true })
        .exec();
      return updated!;
    }
    
    return this.create(createKeywordDto);
  }

  /**
   * Bulk create keywords - useful for importing from external APIs
   */
  async bulkCreate(keywords: CreateKeywordDto[]): Promise<KeywordDocument[]> {
    const results: KeywordDocument[] = [];
    
    for (const keywordDto of keywords) {
      try {
        const keyword = await this.upsert(keywordDto);
        results.push(keyword);
      } catch (error) {
        this.logger.error(`Failed to create keyword "${keywordDto.keyword}": ${error.message}`);
      }
    }
    
    return results;
  }
} 