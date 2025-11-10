import { BaseService } from './baseService.js';
import { SearchResponse, MediaInfo } from '../types/index.js';
import { createSearchResponse, createMediaResponse, formatBBCode } from '../utils/formatter.js';
import { fetchAndParse, extractJson } from '../utils/parser.js';
import axios from 'axios';

export class DoubanService extends BaseService {
  constructor() {
    super('douban');
  }

  async search(query: string): Promise<SearchResponse> {
    const cacheKey = this.getCacheKey('search', query);

    try {
      // Check cache first
      const cached = await this.getFromCache<SearchResponse>(cacheKey);
      if (cached) {
        return cached;
      }

      // Fetch from Douban API
      const response = await axios.get('https://movie.douban.com/j/subject_suggest', {
        params: { q: query },
        timeout: 10000,
      });

      const data = response.data.map((item: any) => ({
        year: item.year,
        subtype: item.type,
        title: item.title,
        link: `https://movie.douban.com/subject/${item.id}/`,
      }));

      const result = createSearchResponse(data);
      await this.saveToCache(cacheKey, result);

      return result;
    } catch (error) {
      const errorMsg = this.handleError(error, 'search');
      return createSearchResponse([], false, errorMsg);
    }
  }

  async getInfo(sid: string): Promise<MediaInfo> {
    const cacheKey = this.getCacheKey('info', sid);

    try {
      // Check cache first
      const cached = await this.getFromCache<MediaInfo>(cacheKey);
      if (cached) {
        return cached;
      }

      const url = `https://movie.douban.com/subject/${sid}/`;
      const $ = await fetchAndParse(url);

      // Extract metadata
      const data: Record<string, any> = {};
      const ldJson = extractJson($('html').html() || '');

      if (ldJson) {
        const ld = ldJson as any;
        data['title'] = ld.name;
        data['poster'] = ld.image;
        data['rating'] = ld.aggregateRating?.ratingValue;
        data['actors'] = ld.actor?.map((a: any) => a.name).join(', ');
        data['director'] = ld.director?.map((d: any) => d.name).join(', ');
        data['description'] = ld.description;
      }

      // Build BBCode format
      let format = '';
      if (data.poster) {
        format += `[img]${data.poster}[/img]\n\n`;
      }
      format += `【基本信息】\n`;
      format += `标题: ${data.title}\n`;
      if (data.rating) {
        format += `评分: ${data.rating}/10\n`;
      }
      if (data.director) {
        format += `导演: ${data.director}\n`;
      }
      if (data.actors) {
        format += `演员: ${data.actors}\n`;
      }
      format += `链接: [url=${url}]${url}[/url]\n`;

      const result = createMediaResponse(format, true, null, data);
      await this.saveToCache(cacheKey, result);

      return result;
    } catch (error) {
      const errorMsg = this.handleError(error, 'getInfo');
      return createMediaResponse('', false, errorMsg);
    }
  }
}

export const doubanService = new DoubanService();
