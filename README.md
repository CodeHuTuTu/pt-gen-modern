# PT-Gen Modern

一个现代化的媒体信息生成工具，支持从多个源（豆瓣、IMDb、Bangumi 等）提取元数据并生成 BBCode 格式的内容。

## 特性

- 🎬 支持多个源：豆瓣、IMDb、Bangumi、Steam、Indienova、Epic Games
- 🚀 现代的 Node.js + Express + TypeScript 技术栈
- 🔍 强大的搜索功能
- 📝 BBCode 格式生成
- 💾 智能缓存（Redis + 内存双层缓存）
- 🛡️ API 密钥认证
- 🌐 Web UI 前端界面
- 📦 友好的部署方式

## 快速开始

### 环境要求

- Node.js >= 18.0.0
- Redis (可选，不配置时使用内存缓存)

### 安装

```bash
npm install
```

### 配置

创建 `.env` 文件：

```bash
cp .env.example .env
```

编辑 `.env` 文件，设置必要的配置：

```
PORT=3000
NODE_ENV=development
APIKEY=your-secret-key
REDIS_URL=redis://localhost:6379
```

### 开发

```bash
npm run dev
```

访问 `http://localhost:3000`

### 构建

```bash
npm run build
```

### 生产环境运行

```bash
npm run start
```

## API 文档

**注意：** API 接口与原始 pt-gen-cfworker 项目完全兼容。

### 搜索接口

```
GET /?search={keyword}&source={source}
```

**参数：**
- `search`: 搜索关键词
- `source`: 源站点 (douban, imdb, bangumi)

**示例请求：**
```bash
curl "http://localhost:3000/?search=肖申克的救赎&source=douban"
```

**响应示例：**
```json
{
  "success": true,
  "data": [
    {
      "title": "肖申克的救赎",
      "year": 1994,
      "subtype": "movie",
      "link": "https://movie.douban.com/subject/1291546/"
    }
  ],
  "copyright": "© 2024 PT-Gen-Modern",
  "version": "1.0.0",
  "generate_at": 1699000000000
}
```

### 生成信息接口

#### 方式一：使用 URL

```
GET /?url={resource_url}
```

**参数：**
- `url`: 资源完整 URL (例如：豆瓣电影链接)

**示例请求：**
```bash
curl "http://localhost:3000/?url=https://movie.douban.com/subject/1291546/"
```

#### 方式二：使用源和 ID

```
GET /?site={site}&sid={id}
```

**参数：**
- `site`: 源站点 (douban, imdb, bangumi)
- `sid`: 资源 ID

**示例请求：**
```bash
curl "http://localhost:3000/?site=douban&sid=1291546"
```

**响应示例：**
```json
{
  "success": true,
  "format": "[img]https://...[/img]\n\n【基本信息】\n标题: 肖申克的救赎\n评分: 9.3/10\n...",
  "title": "肖申克的救赎",
  "rating": "9.3",
  "copyright": "© 2024 PT-Gen-Modern",
  "version": "1.0.0",
  "generate_at": 1699000000000
}
```

## 认证

### API 密钥认证

如果设置了 `APIKEY` 环境变量，所有请求必须提供有效的 API 密钥：

```bash
# 方式一：查询参数
curl "http://localhost:3000/?search=test&source=douban&apikey=your-key"

# 方式二：HTTP 头
curl -H "X-API-Key: your-key" "http://localhost:3000/?search=test&source=douban"
```

### 禁用搜索

设置 `DISABLE_SEARCH=true` 可以禁用搜索功能。

## 部署

### Docker 部署

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

### Vercel 部署

```bash
npm install -g vercel
vercel
```

### 传统服务器部署

```bash
npm install
npm run build
npm start
```

使用 PM2 管理进程：

```bash
npm install -g pm2
pm2 start dist/server.js --name "pt-gen-modern"
```

## 项目结构

```
src/
├── server.ts           # 主服务器文件
├── logger.ts           # 日志配置
├── types/              # TypeScript 类型定义
├── utils/              # 工具函数
│   ├── cache.ts        # 缓存管理
│   ├── parser.ts       # HTML 解析
│   └── formatter.ts    # 数据格式化
├── services/           # 业务逻辑
│   ├── baseService.ts  # 基础服务类
│   └── doubanService.ts
├── routes/             # 路由
│   ├── api.ts          # API 路由
│   └── web.ts          # Web 路由
├── middleware/         # 中间件
│   └── auth.ts         # 认证中间件
└── public/             # 静态文件
    └── index.html      # Web UI
```

## 扩展

### 添加新的源

1. 创建新的服务类，继承 `BaseService`：

```typescript
// src/services/imdbService.ts
import { BaseService } from './baseService';

export class ImdbService extends BaseService {
  constructor() {
    super('imdb');
  }

  async search(query: string) {
    // 实现搜索逻辑
  }

  async getInfo(sid: string) {
    // 实现信息获取逻辑
  }
}

export const imdbService = new ImdbService();
```

2. 在 API 路由中注册：

```typescript
// src/routes/api.ts
import { imdbService } from '../services/imdbService';

// In search endpoint
case 'imdb':
  result = await imdbService.search(search as string);
  break;

// In info endpoint
case 'imdb':
  result = await imdbService.getInfo(id);
  break;
```

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| PORT | 服务器端口 | 3000 |
| NODE_ENV | 运行环境 | development |
| LOG_LEVEL | 日志级别 | info |
| APIKEY | API 密钥 | 无 |
| DISABLE_SEARCH | 禁用搜索 | false |
| REDIS_URL | Redis 连接串 | redis://localhost:6379 |
| CACHE_TTL | 缓存时间(秒) | 172800 |
| AUTHOR | 作者名称 | PT-Gen-Modern |

## License

MIT
