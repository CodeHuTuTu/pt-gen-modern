# 从原始版本迁移指南

本文档说明了从原始 Cloudflare Workers 版本迁移到现代版本的关键差异和优势。

## 架构对比

### 原始版本（CF Worker）

```
User Request
    ↓
Cloudflare Edge
    ↓
Worker JavaScript Runtime
    ↓
External APIs (Douban, IMDb, etc.)
    ↓
Cloudflare KV + Cache API
    ↓
Response
```

**特点：**
- 无服务器、零运维
- 全球 CDN 部署
- 受限的开发环境
- Wrangler 部署工具学习曲线陡峭
- 功能受 CF Workers 平台限制

### 现代版本（Node.js + Express）

```
User Request
    ↓
Express Server
    ↓
Authentication/Middleware
    ↓
Business Logic (Services)
    ↓
Redis + Memory Cache
    ↓
External APIs (Douban, IMDb, etc.)
    ↓
Response
```

**特点：**
- 完全控制和自定义
- 可部署到任何平台
- 完整的本地开发环境
- 熟悉的 Node.js 生态
- TypeScript 类型安全
- 更容易测试和维护

## 功能映射

### API 端点

#### 搜索接口

**原始版本：**
```
GET /?search={keyword}&source={site}
```

**现代版本：**
```
GET /?search={keyword}&source={site}
```

✅ **完全兼容** - API 端点与原版一致。

#### 信息生成

**原始版本（方式1 - 解析URL）：**
```
GET /?url=https://movie.douban.com/subject/1291546/
```

**现代版本：**
```
GET /?url=https://movie.douban.com/subject/1291546/
```

✅ **完全兼容** - API 端点与原版一致。

**原始版本（方式2 - 直接参数）：**
```
GET /?site=douban&sid=1291546
```

**现代版本：**
```
GET /?site=douban&sid=1291546
```

✅ **完全兼容** - API 端点与原版一致。

响应格式保持完全兼容。

### 缓存策略

**原始版本：**
- Cloudflare Cache API（HTTP 层）
- Cloudflare KV Storage（2 天 TTL）

**现代版本：**
- Redis（推荐，分布式缓存）
- 内存缓存（备选方案）
- 配置 TTL：`CACHE_TTL`（默认 2 天）

### 认证

**原始版本：**
```javascript
// 检查环境变量 APIKEY
if (env.APIKEY && request.headers.get('x-api-key') !== env.APIKEY) {
  return error_response('Invalid API key');
}
```

**现代版本：**
```typescript
// middleware/auth.ts
export function apiKeyAuth(req: Request, res: Response, next: NextFunction) {
  const apiKey = process.env.APIKEY;
  if (!apiKey) return next();

  const providedKey = req.query.apikey || req.headers['x-api-key'];
  if (!providedKey || providedKey !== apiKey) {
    return res.status(401).json({ success: false, error: 'Invalid API key' });
  }
  next();
}
```

### 环境变量

| 功能 | 原始版本 | 现代版本 |
|------|---------|---------|
| API 密钥 | `APIKEY` | `APIKEY` |
| 禁用搜索 | `DISABLE_SEARCH` | `DISABLE_SEARCH` |
| 作者 | `AUTHOR` | `AUTHOR` |
| 豆瓣 Cookie | `DOUBAN_COOKIE` | `DOUBAN_COOKIE` |
| Indienova Cookie | `INDIENOVA_COOKIE` | `INDIENOVA_COOKIE` |
| **新增** | - | `PORT`、`LOG_LEVEL`、`REDIS_URL`、`CACHE_TTL` |

## 代码结构迁移

### 模块系统

**原始版本：**
```javascript
// lib/douban.js
export async function search_douban(query) { ... }
export async function gen_douban(sid) { ... }

// index.js
import * as douban from './lib/douban.js';
```

**现代版本：**
```typescript
// services/doubanService.ts
export class DoubanService extends BaseService {
  async search(query: string): Promise<SearchResponse> { ... }
  async getInfo(sid: string): Promise<MediaInfo> { ... }
}

// routes/api.ts
import { doubanService } from '../services/doubanService';
```

### HTML 解析

**原始版本：**
```javascript
import { load } from 'cheerio';

export async function gen_douban(sid) {
  const html = await fetch_page(url);
  const $ = load(html);
  const title = $('title').text();
  // ...
}
```

**现代版本：**
```typescript
import { fetchAndParse } from '../utils/parser';

async getInfo(sid: string): Promise<MediaInfo> {
  const $ = await fetchAndParse(`https://movie.douban.com/subject/${sid}/`);
  const title = $('title').text();
  // ...
}
```

### 响应格式

**原始版本：**
```javascript
const default_body = {
  success: false,
  error: null,
  format: "",
  copyright: "...",
  version: "0.6.4",
  generate_at: timestamp
};

return Object.assign(data, default_body);
```

**现代版本：**
```typescript
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
```

## 部署迁移

### 原始版本部署

```bash
# 1. 安装 Wrangler
npm install -g @cloudflare/wrangler

# 2. 认证
wrangler login

# 3. 配置 wrangler.toml
# 设置 KV namespace 等

# 4. 部署
wrangler publish
```

**缺点：**
- 学习 Wrangler 配置
- CF Workers 账户依赖
- 受限的调试环境
- 部署过程相对复杂

### 现代版本部署

#### 本地测试
```bash
npm install
npm run dev
```

#### Docker 部署
```bash
docker-compose up  # 完整生产就绪环境
```

#### 云平台部署

**Vercel：**
```bash
vercel
```

**Railway：**
```bash
railway up
```

**Heroku：**
```bash
git push heroku main
```

**自建服务器：**
```bash
npm run build && npm start  # 或使用 PM2
```

**优势：**
- 标准 Node.js 部署流程
- 支持多个平台
- 灵活的配置
- 完整的本地开发环境

## 功能增强

### 新增功能

1. **TypeScript 支持**
   - 类型安全
   - 更好的 IDE 支持
   - 减少运行时错误

2. **双层缓存**
   - Redis（分布式）
   - 内存（快速降级）

3. **结构化日志**
   - Pino 日志库
   - 彩色输出（开发模式）
   - 多种日志级别

4. **改进的中间件系统**
   - Express 标准中间件
   - 易于扩展
   - 认证、日志等

5. **更好的错误处理**
   - 统一的错误响应
   - 详细的错误日志
   - 调试模式支持

6. **ESLint 配置**
   - 代码质量检查
   - TypeScript 规则

## 性能对比

| 指标 | 原始版本 | 现代版本 | 备注 |
|------|--------|--------|------|
| **冷启动时间** | < 1ms | 100-200ms | Worker 胜，但现代版本可预热 |
| **缓存延迟** | KV 10-100ms | Redis < 5ms | Redis 更快 |
| **全局CDN** | 是 | 可选 | 需配置 Cloudflare 或 CDN |
| **可定制性** | 受限 | 完全开放 | 现代版本胜 |
| **成本** | 按请求计费 | 按服务器计费 | 高流量下现代版本更便宜 |
| **扩展性** | 自动 | 需配置 | Worker 胜 |

## 迁移步骤

### 1. 保留原始版本作为备份

```bash
# 在新目录创建新项目
mkdir pt-gen-modern
cd pt-gen-modern
# 初始化新项目...
```

### 2. 复制源代码逻辑

对每个源（douban.js、imdb.js 等）：
- 创建对应的服务类（e.g., `services/doubanService.ts`）
- 移植搜索和生成逻辑
- 调整 HTML 解析代码

### 3. 测试迁移

```bash
# 本地测试
npm run dev

# 对比原始版本和新版本的输出
curl "http://localhost:3000/api/search?search=test&source=douban"
```

### 4. 部署新版本

选择合适的部署方案（Docker、Vercel、自建等）

### 5. 切换流量

更新 DNS 或负载均衡器指向新版本

## 常见问题

### Q: 我能同时运行两个版本吗？

**A:** 可以。建议：
- 原始版本保持运行
- 新版本部署到不同的 URL
- 通过特性开关或 A/B 测试逐步切换

### Q: 如何迁移 Cloudflare KV 缓存数据？

**A:** 没有直接的迁移工具。建议：
- KV 数据的 TTL 默认会自动过期
- 用户请求时重新获取并缓存
- 或导出 KV 数据并导入到 Redis

### Q: 新版本能达到原始版本的性能吗？

**A:** 取决于部署方式：
- **本地/自建**：可能略低于 CF Worker
- **CDN + 服务器**：可以达到相当的性能
- **高流量场景**：新版本成本更低

### Q: 支持 Cloudflare Workers 功能吗？

**A:** 基本上是重新编写。但可以：
- 部署到 Cloudflare Pages Functions（兼容 Workers 的全新功能）
- 使用 Hono 框架（原生支持 CF Workers）

### Q: 如何处理 Douban 的反爬虫机制？

**A:** 现代版本提供了更多工具：
- 自定义 User-Agent
- Cookie 支持（通过 `DOUBAN_COOKIE` 环境变量）
- 代理支持（可配置 axios）
- 请求限流

## 总结

| 方面 | 原始版本 | 现代版本 |
|------|--------|--------|
| 学习曲线 | 陡峭 | 平缓 |
| 部署友好度 | 中等 | 高 |
| 代码可维护性 | 中等 | 高 |
| 功能扩展性 | 受限 | 高 |
| 本地开发体验 | 差 | 优 |
| 社区支持 | 小众 | 主流 |
| 类型安全 | 无 | TypeScript |
| 全球 CDN | 内置 | 可选 |

**建议：** 如果你希望有更好的开发体验和部署灵活性，现代版本是理想选择。如果你专注于全球 CDN 和零运维，考虑使用 Hono + CF Workers。
