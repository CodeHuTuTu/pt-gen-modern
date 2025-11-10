import html2bbcode from 'html2bbcode';
import { MediaInfo, SearchResponse } from '../types/index.js';

export function createSearchResponse(
  data: any[],
  success: boolean = true,
  error: string | null = null
): SearchResponse {
  return {
    success,
    error,
    data,
    copyright: `© ${new Date().getFullYear()} PT-Gen-Modern`,
    version: '1.0.0',
    generate_at: Date.now(),
  };
}

export function createMediaResponse(
  format: string,
  success: boolean = true,
  error: string | null = null,
  additionalData: Record<string, any> = {}
): MediaInfo {
  return {
    success,
    error,
    format,
    copyright: `© ${new Date().getFullYear()} PT-Gen-Modern`,
    version: '1.0.0',
    generate_at: Date.now(),
    ...additionalData,
  };
}

export function htmlToBBCode(html: string): string {
  try {
    return html2bbcode(html);
  } catch (error) {
    return html;
  }
}

export function formatBBCode(template: string, data: Record<string, any>): string {
  let result = template;
  Object.entries(data).forEach(([key, value]) => {
    const placeholder = `{{${key}}}`;
    result = result.replace(new RegExp(placeholder, 'g'), String(value || ''));
  });
  return result;
}
