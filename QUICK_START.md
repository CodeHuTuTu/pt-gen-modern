# 快速开始指南

## 项目概述

这是一个现代化的媒体信息生成工具的完整重构版本。相比原始的 Cloudflare Workers 版本，新版本使用了当代最流行的 Node.js 技术栈，部署更加友好。

### 核心改进

| 特性 | 原始版本 (CF Worker) | 现代版本 |
|------|------------------|--------|
| **框架** | Cloudflare Workers (无服务器) | Express.js (Node.js) |
| **语言** | 纯 JavaScript | TypeScript |
| **部署** | Wrangler CLI (复杂) | npm + 标准 Node.js |
| **缓存** | Cloudflare KV | Redis + 内存双层 |
| **开发体验** | 受限 | 完整的本地开发环境 |
| **部署方式** | 仅限 CF Workers | 云平台、Docker、自建服务器 |

## 第 1 步：项目设置

### 克隆或进入项目目录

```bash
cd /Users/elliott/Code/Git/pt-gen-modern
```

### 安装依赖

```bash
npm install
```

### 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env` 文件（可选，有默认值）：

```env
PORT=3000
NODE_ENV=development
LOG_LEVEL=debug
# APIKEY=your-secret-key  # 可选：设置 API 密钥
# REDIS_URL=redis://localhost:6379  # 可选：Redis 缓存
```

## 第 2 步：开发模式

### 启动开发服务器

```bash
npm run dev
```

输出示例：
```
[timestamp] INFO  Server running on http://localhost:3000
```

### 访问应用

打开浏览器访问：`http://localhost:3000`

你会看到一个漂亮的 Web UI，可以：
- 🔍 搜索媒体（豆瓣、IMDb、Bangumi）
- 📝 生成 BBCode 格式的内容
- 📋 复制到剪贴板

### 测试 API

#### 搜索示例

```bash
curl "http://localhost:3000/?search=肖申克的救赎&source=douban"
```

响应：
```json
{
  "success": true,
  "data": [
    {
      "title": "肖申克的救赎",
      "year": "1994",
      "subtype": "movie",
      "link": "https://movie.douban.com/subject/1291546/"
    }
  ],
  "generate_at": 1699000000000
}
```

#### 生成信息示例

```bash
curl "http://localhost:3000/?site=douban&sid=1291546"
```

## 第 3 步：生产构建

### 编译 TypeScript

```bash
npm run build
```

生成文件在 `dist/` 目录中。

### 运行生产版本

```bash
npm start
```

## 第 4 步：部署

### 方案 A：Docker 部署（推荐）

#### 本地测试

```bash
docker-compose up
```

这会启动：
- Redis 缓存服务
- Node.js 应用服务器

访问 `http://localhost:3000`

#### 生产部署

```bash
# 构建镜像
docker build -t pt-gen-modern:latest .

# 运行容器
docker run -p 3000:3000 -e REDIS_URL=redis://redis:6379 pt-gen-modern:latest
```

### 方案 B：Vercel 部署

```bash
# 安装 Vercel CLI
npm install -g vercel

# 部署
vercel
```

### 方案 C：自建服务器部署

#### 使用 PM2（进程管理）

```bash
npm install -g pm2

# 启动应用
pm2 start dist/server.js --name "pt-gen-modern"

# 查看进程
pm2 list

# 停止应用
pm2 stop pt-gen-modern
```

#### 使用 Systemd（Linux）

创建 `/etc/systemd/system/pt-gen-modern.service`：

```ini
[Unit]
Description=PT-Gen Modern Service
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/pt-gen-modern
ExecStart=/usr/bin/node /opt/pt-gen-modern/dist/server.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

启动服务：

```bash
sudo systemctl enable pt-gen-modern
sudo systemctl start pt-gen-modern
```

### 方案 D：云平台部署

#### Heroku

```bash
heroku create pt-gen-modern
git push heroku main
heroku open
```

#### Railway

```bash
npm install -g railway
railway init
railway up
```

## 项目结构详解

```
pt-gen-modern/
├── src/
│   ├── server.ts              ← 主入口文件
│   ├── logger.ts              ← 日志配置
│   ├── types/
│   │   └── index.ts           ← TypeScript 类型定义
│   ├── utils/
│   │   ├── cache.ts           ← 缓存管理（Redis + 内存）
│   │   ├── parser.ts          ← HTML 解析工具
│   │   └── formatter.ts       ← 数据格式化和 BBCode
│   ├── services/
│   │   ├── baseService.ts     ← 基础服务类
│   │   └── doubanService.ts   ← 豆瓣服务实现
│   ├── routes/
│   │   ├── api.ts             ← API 路由
│   │   └── web.ts             ← Web 界面路由
│   ├── middleware/
│   │   └── auth.ts            ← API 密钥验证
│   └── public/
│       └── index.html         ← Web UI 前端
├── dist/                      ← 编译后的代码（npm run build）
├── package.json               ← 依赖配置
├── tsconfig.json              ← TypeScript 配置
├── Dockerfile                 ← Docker 镜像配置
├── docker-compose.yml         ← Docker Compose 配置
├── .env.example               ← 环境变量模板
└── README.md                  ← 完整文档
```

## 添加新的源

以添加 IMDb 为例：

### 步骤 1：创建服务类

创建 `src/services/imdbService.ts`：

```typescript
import { BaseService } from './baseService';
import { SearchResponse, MediaInfo } from '../types';
import { createSearchResponse, createMediaResponse } from '../utils/formatter';

export class ImdbService extends BaseService {
  constructor() {
    super('imdb');
  }

  async search(query: string): Promise<SearchResponse> {
    // 实现搜索逻辑
    const cacheKey = this.getCacheKey('search', query);
    const cached = await this.getFromCache<SearchResponse>(cacheKey);
    if (cached) return cached;

    try {
      // 调用 IMDb API 或爬虫逻辑
      const data = []; // 处理后的数据

      const result = createSearchResponse(data);
      await this.saveToCache(cacheKey, result);
      return result;
    } catch (error) {
      return createSearchResponse([], false, this.handleError(error, 'search'));
    }
  }

  async getInfo(sid: string): Promise<MediaInfo> {
    // 实现信息获取逻辑
    // ...
  }
}

export const imdbService = new ImdbService();
```

### 步骤 2：在路由中注册

编辑 `src/routes/api.ts`，在搜索和生成端点中添加 case：

```typescript
import { imdbService } from '../services/imdbService';

// 在搜索逻辑中
switch (source) {
  case 'imdb':
    result = await imdbService.search(search as string);
    break;
}

// 在信息生成逻辑中
switch (source) {
  case 'imdb':
    result = await imdbService.getInfo(id);
    break;
}
```

### 步骤 3：更新前端

编辑 `src/public/index.html`，在 select 中添加选项：

```html
<select class="form-select" id="searchSource">
  <option value="douban">豆瓣</option>
  <option value="imdb">IMDb</option>
  <option value="bangumi">Bangumi</option>
</select>
```

## 常见问题

### Q: 我需要 Redis 吗？

**A:** 不一定。项目内置了内存缓存作为 Redis 的备选方案。如果不配置 Redis，缓存会存储在内存中。对于生产环境，建议使用 Redis 以获得持久化和分布式缓存支持。

### Q: 如何设置 API 密钥？

**A:** 在 `.env` 中添加：

```env
APIKEY=your-secret-key-here
```

然后在请求中提供密钥：

```bash
curl "http://localhost:3000/?search=test&source=douban&apikey=your-secret-key-here"
# 或
curl -H "X-API-Key: your-secret-key-here" "http://localhost:3000/?search=test&source=douban"
```

### Q: 如何禁用搜索功能？

**A:** 在 `.env` 中添加：

```env
DISABLE_SEARCH=true
```

### Q: 如何增加日志详细程度？

**A:** 在 `.env` 中设置：

```env
LOG_LEVEL=debug
```

### Q: 如何处理 CORS 跨域问题？

**A:** 项目已默认启用 CORS。如需自定义，编辑 `src/server.ts`：

```typescript
app.use(cors({
  origin: ['http://localhost:3000', 'https://example.com'],
  credentials: true
}));
```

## 下一步

1. **扩展功能**：添加更多源（IMDb、Bangumi、Steam 等）
2. **优化性能**：调整缓存策略和爬虫超时
3. **增强 UI**：改进前端界面和用户体验
4. **API 文档**：使用 Swagger/OpenAPI 生成 API 文档
5. **监控告警**：集成 Prometheus、Datadog 等监控工具
6. **单元测试**：添加 Jest 单元测试

## 获取帮助

- 📖 查看完整文档：`README.md`
- 🐛 报告问题：GitHub Issues
- 💬 讨论功能：GitHub Discussions

---

**祝你使用愉快！** 🚀
