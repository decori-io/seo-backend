import { KeywordsAnalysisResponse } from '../schemas/keywords-analysis.schema';

export { KeywordsAnalysisResponse };

export interface KeywordItem {
  keyword: string;
  search_volume: number;
  difficulty: number;
  competition: number;
  ourScore?: number; // Our calculated score for sorting
}

export interface ICPLongTailKeywords {
  [icp: string]: string[];
}

export interface KeywordsAnalysisResult {
  lean_keywords: string[];
  validated_keywords: KeywordItem[];
  relevant_keywords: KeywordItem[];
  icp_long_tail: ICPLongTailKeywords;
  business_context: string;
  final_keywords: {
    validated_lean_keywords: KeywordItem[];
    icp_specific_long_tail: ICPLongTailKeywords;
  };
} 