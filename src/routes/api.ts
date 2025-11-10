import { Router, Request, Response } from 'express';
import { doubanService } from '../services/doubanService';
import { searchEnabled } from '../middleware/auth';
import { logger } from '../logger';
import { GenerationRequest } from '../types';

const router = Router();

// Search endpoint
router.get('/search', searchEnabled, async (req: Request, res: Response) => {
  try {
    const { search, source } = req.query;

    if (!search || !source) {
      return res.status(400).json({
        success: false,
        error: 'Missing search or source parameter',
      });
    }

    let result;

    switch (source) {
      case 'douban':
        result = await doubanService.search(search as string);
        break;
      // Add more sources here
      default:
        return res.status(400).json({
          success: false,
          error: `Unknown source: ${source}`,
        });
    }

    res.json(result);
  } catch (error) {
    logger.error('Search error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

// Generate info endpoint
router.get('/info', async (req: Request, res: Response) => {
  try {
    const { site, sid, url } = req.query as GenerationRequest;

    let source = site;
    let id = sid;

    // Parse URL if provided
    if (url && !site) {
      const urlObj = new URL(url);
      const domain = urlObj.hostname;

      if (domain?.includes('douban')) {
        source = 'douban';
        const match = urlObj.pathname.match(/subject\/(\d+)/);
        id = match ? match[1] : undefined;
      }
      // Add more URL patterns here
    }

    if (!source || !id) {
      return res.status(400).json({
        success: false,
        error: 'Missing or invalid source and id',
      });
    }

    let result;

    switch (source) {
      case 'douban':
        result = await doubanService.getInfo(id);
        break;
      // Add more sources here
      default:
        return res.status(400).json({
          success: false,
          error: `Unknown source: ${source}`,
        });
    }

    res.json(result);
  } catch (error) {
    logger.error('Info generation error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

export default router;
