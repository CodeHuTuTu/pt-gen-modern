import { load } from 'cheerio';

type CheerioAPI = ReturnType<typeof load>;
import axios, { AxiosRequestConfig } from 'axios';
import { logger } from '../logger';

const DEFAULT_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
};

export async function fetchPage(
  url: string,
  headers?: Record<string, string>,
  config?: AxiosRequestConfig
): Promise<string> {
  try {
    const response = await axios.get(url, {
      headers: { ...DEFAULT_HEADERS, ...headers },
      timeout: 10000,
      ...config,
    });
    return response.data;
  } catch (error) {
    logger.error('Failed to fetch page:', { url, error });
    throw error;
  }
}

export function parseHtml(html: string): CheerioAPI {
  return load(html);
}

export async function fetchAndParse(
  url: string,
  headers?: Record<string, string>
): Promise<CheerioAPI> {
  const html = await fetchPage(url, headers);
  return parseHtml(html);
}

export function extractJson<T>(html: string, selector: string = 'script[type="application/ld+json"]'): T | null {
  try {
    const $ = parseHtml(html);
    const jsonString = $(selector).first().html();
    if (jsonString) {
      return JSON.parse(jsonString);
    }
  } catch (error) {
    logger.debug('Failed to extract JSON:', { selector, error });
  }
  return null;
}

export function cleanText(text: string): string {
  return text.trim().replace(/\s+/g, ' ');
}
