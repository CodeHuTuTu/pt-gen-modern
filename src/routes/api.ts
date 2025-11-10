import { Router, Request, Response } from 'express';
import { doubanService } from '../services/doubanService';
import { searchEnabled } from '../middleware/auth';
import { logger } from '../logger';
import { GenerationRequest } from '../types';

const router = Router();

// Unified endpoint matching pt-gen-cfworker API
router.get('/', searchEnabled, async (req: Request, res: Response, next) => {
  const { search, source, site, sid, url } = req.query as any;

  // If no API parameters, pass to next handler (Web UI)
  if (!search && !source && !site && !sid && !url) {
    return next();
  }

  const startTime = Date.now();

  // Log detailed request information
  logger.info({
    action: 'API_REQUEST',
    method: req.method,
    path: req.path,
    fullUrl: req.originalUrl,
    queryParams: req.query,
    headers: {
      'user-agent': req.headers['user-agent'],
      'referer': req.headers['referer'],
      'x-forwarded-for': req.headers['x-forwarded-for'],
    },
    ip: req.ip,
  }, 'Incoming API request');

  try {

    // Determine request type based on parameters
    let result;
    let requestType: string;

    if (search && source) {
      // Search request
      requestType = 'SEARCH';
      logger.info({
        action: 'SEARCH_REQUEST',
        keyword: search,
        source: source,
      }, `Search request: keyword="${search}", source="${source}"`);

      switch (source) {
        case 'douban':
          result = await doubanService.search(search as string);
          break;
        // Add more sources here
        default:
          logger.warn({
            action: 'SEARCH_ERROR',
            error: 'Unknown source',
            source: source,
          }, `Unknown source: ${source}`);

          return res.status(400).json({
            success: false,
            error: `Unknown source: ${source}`,
          });
      }
    } else if (url || (site && sid)) {
      // Info generation request
      requestType = 'GENERATE_INFO';

      let sourceType = site;
      let resourceId = sid;

      // Parse URL if provided
      if (url && !site) {
        logger.info({
          action: 'PARSE_URL',
          url: url,
        }, `Parsing URL: ${url}`);

        const urlObj = new URL(url as string);
        const domain = urlObj.hostname;

        if (domain?.includes('douban')) {
          sourceType = 'douban';
          const match = urlObj.pathname.match(/subject\/(\d+)/);
          resourceId = match ? match[1] : undefined;
        }
        // Add more URL patterns here

        logger.info({
          action: 'URL_PARSED',
          parsedSource: sourceType,
          parsedId: resourceId,
          originalUrl: url,
        }, `URL parsed: source="${sourceType}", id="${resourceId}"`);
      }

      logger.info({
        action: 'INFO_GENERATION_REQUEST',
        source: sourceType,
        id: resourceId,
        method: url ? 'url' : 'params',
      }, `Info generation: source="${sourceType}", id="${resourceId}"`);

      if (!sourceType || !resourceId) {
        logger.warn({
          action: 'GENERATION_ERROR',
          error: 'Missing or invalid parameters',
          site: site,
          sid: sid,
          url: url,
        }, 'Missing or invalid source and id');

        return res.status(400).json({
          success: false,
          error: 'Missing or invalid source and id',
        });
      }

      switch (sourceType) {
        case 'douban':
          result = await doubanService.getInfo(resourceId);
          break;
        // Add more sources here
        default:
          logger.warn({
            action: 'GENERATION_ERROR',
            error: 'Unknown source',
            source: sourceType,
          }, `Unknown source: ${sourceType}`);

          return res.status(400).json({
            success: false,
            error: `Unknown source: ${sourceType}`,
          });
      }
    } else {
      // Invalid request
      logger.warn({
        action: 'INVALID_REQUEST',
        queryParams: req.query,
      }, 'Invalid request: missing required parameters');

      return res.status(400).json({
        success: false,
        error: 'Missing required parameters. Use either: 1) search + source for searching, or 2) url OR (site + sid) for info generation',
      });
    }

    const duration = Date.now() - startTime;

    // Log detailed response information
    logger.info({
      action: 'API_RESPONSE',
      requestType: requestType,
      success: result?.success ?? true,
      duration: duration,
      responseKeys: Object.keys(result || {}),
      responseSize: JSON.stringify(result).length,
      // Log key response data (but avoid logging huge format strings)
      responseSummary: {
        success: result?.success,
        title: result?.title,
        rating: result?.rating,
        dataCount: Array.isArray(result?.data) ? result.data.length : undefined,
        hasFormat: !!result?.format,
        formatLength: result?.format?.length,
      },
    }, `API response sent: ${requestType}, duration=${duration}ms`);

    // Log full response in debug mode
    if (process.env.LOG_LEVEL === 'debug') {
      logger.debug({
        action: 'API_RESPONSE_FULL',
        fullResponse: result,
      }, 'Full response data');
    }

    res.json(result);
  } catch (error) {
    const duration = Date.now() - startTime;

    logger.error({
      action: 'API_ERROR',
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      duration: duration,
      queryParams: req.query,
    }, 'API request failed');

    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

export default router;
