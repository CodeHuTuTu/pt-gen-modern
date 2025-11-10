/**
 * Common data types for PT-Gen Modern
 */

export interface SearchResult {
  year?: string | number;
  subtype?: string;
  title: string;
  link: string;
  [key: string]: any;
}

export interface SearchResponse {
  success: boolean;
  error?: string | null;
  data: SearchResult[];
  copyright: string;
  version: string;
  generate_at: number;
}

export interface MediaInfo {
  success: boolean;
  error?: string | null;
  format: string; // BBCode formatted content
  copyright: string;
  version: string;
  generate_at: number;
  [key: string]: any;
}

export interface GenerationRequest {
  site?: string;
  sid?: string;
  url?: string;
  search?: string;
  source?: string;
}

export interface CacheOptions {
  ttl?: number;
  key: string;
}
