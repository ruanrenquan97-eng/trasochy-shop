/**
 * ==============================================================================
 * TRASOCHY 商城后端入口文件 (Main Entry)
 * ==============================================================================
 * 该文件是 Node.js (Express) 后端服务的主入口。
 * 核心功能包含：
 * 1. 初始化 Express 实例及基础中间件 (跨域 CORS, 安全 Helmet, JSON Body 解析)。
 * 2. 全局注册多语言拦截器 (Interceptor)，实现动态的多语言无缝切换。
 * 3. 全局注册访客/会员 PV/UV 追踪中间件 (Site Visits)。
 * 4. 挂载所有核心业务路由 (Routers)。
 * 5. 处理静态文件服务 (图片上传、生产环境的前端页面代理)。
 * 6. 生成 SEO 所需的 sitemap.xml 和 robots.txt。
 * 7. 启动数据库连接与定时任务 (Cron Jobs)。
 * ==============================================================================
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import dotenv from 'dotenv';

// 导入数据库初始化与定时任务模块
import { initDB, initCouponTables, initSurveyTable } from './db/migrate';
import { initCronJobs } from './utils/cron';

// 导入各业务模块的路由控制器
import authRouter from './routes/auth';             // 认证与注册
import productsRouter from './routes/products';     // 商品展示与管理
import cartRouter from './routes/cart';             // 购物车逻辑
import ordersRouter from './routes/orders';         // 订单生命周期管理
import addressesRouter from './routes/addresses';   // 用户收货地址
import favoritesRouter from './routes/favorites';   // 收藏夹
import reviewsRouter from './routes/reviews';       // 商品评价
import uploadRouter from './routes/upload';         // 文件上传
import adminRouter from './routes/admin';           // B端后台管理核心接口
import aiRouter from './routes/ai';                 // AI大脑中台与问答
import trackingRouter from './routes/tracking';     // 数据埋点与追踪
import articlesRouter from './routes/articles';     // 科普文章与 CMS
import clinicalReportsRouter from './routes/clinical-reports'; // 临床医学报告
import paymentRouter from './routes/payment';       // 支付网关回调
import skinRouter from './routes/skin';             // 皮肤检测功能
import couponsRouter from './routes/coupons';       // 代金券功能
import surveyRouter from './routes/survey';         // 学术调研问卷
import { sqlite } from './db/index';                // SQLite 数据库实例

// 加载环境变量
dotenv.config();

const app = express();
// 从环境变量读取端口，默认为 7100
const PORT = Number(process.env.PORT) || 7100;

// 配置基础安全策略 (禁用严格的 CSP 以允许前端加载外部图片等)
app.use(helmet({ contentSecurityPolicy: false }));

// 配置跨域请求 (CORS)，允许携带 Cookie 等凭证信息
app.use(cors({
  origin: process.env.CORS_ORIGIN || true,
  credentials: true,
}));

// 配置请求体解析器，限制最大负载为 10MB，防止大流量攻击
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 静态文件目录挂载：处理 /uploads 路径下的本地上传图片
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

/**
 * ==============================================================================
 * [核心功能] 多语言 API 拦截器 (I18n Interceptor)
 * ==============================================================================
 * 通过拦截原始的 `res.json` 方法，在数据发送给前端之前进行处理：
 * 1. 提取 HTTP Header 中的 `accept-language`。
 * 2. 如果是 C端(前台)请求，直接将 translations JSON 中的对应语言数据
 *    覆盖合并到对象顶层，并删除 translations 字段，以减少传输体积并让前端无感。
 * 3. 如果是 B端(后台)请求，则保留 translations 结构，方便后台表单编辑多语言。
 * ==============================================================================
 */
app.use((req, res, next) => {
  if (!req.path.startsWith('/api')) return next();
  const langStr = req.headers['accept-language'] || 'zh';
  const lang = langStr.split('-')[0].toLowerCase();
  
  const originalJson = res.json;
  res.json = function (body: any) {
    if (body === null || body === undefined) {
      return originalJson.call(this, body);
    }
    console.log('[Interceptor] originalUrl:', req.originalUrl, 'path:', req.path);
    const isAdmin = req.originalUrl.startsWith('/api/admin') || req.originalUrl.includes('/admin/');
    
    // 递归处理对象的 translations
    const processTranslations = (obj: any, visited = new Set()): any => {
      if (!obj || typeof obj !== 'object') return obj;
      if (visited.has(obj)) return obj;
      visited.add(obj);

      if (Array.isArray(obj)) {
        obj.forEach(item => processTranslations(item, visited));
      } else {
        if ('translations' in obj) {
          try {
            const transObj = typeof obj.translations === 'string' ? JSON.parse(obj.translations) : obj.translations;
            if (isAdmin) {
              // 后台保持结构，仅解析为对象方便前端表单绑定
              obj.translations = transObj || {};
            } else {
              // 前台进行覆盖合并
              if (lang !== 'zh' && transObj && transObj[lang]) {
                Object.assign(obj, transObj[lang]);
              }
              delete obj.translations; // 隐藏原始 translation 字段以减小体积
            }
          } catch (e) {
            if (!isAdmin) delete obj.translations;
            else obj.translations = {};
          }
        }
        // 处理子节点
        for (const key in obj) {
          if (Object.prototype.hasOwnProperty.call(obj, key)) {
            processTranslations(obj[key], visited);
          }
        }
      }
      return obj;
    };

    body = processTranslations(body);
    return originalJson.call(this, body);
  };
  next();
});

// 独立访客与会员登录追踪中间件
app.use((req, res, next) => {
  if (!req.path.startsWith('/api')) return next();
  try {
    const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1') as string;
    const actualIp = ip.split(',')[0].trim();
    const dateStr = new Date().toLocaleString('en-CA', { timeZone: 'Asia/Shanghai' }).split(',')[0];
    
    let userId = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
        userId = decoded.id;
      } catch (e) {}
    }
    
    sqlite.prepare('INSERT OR IGNORE INTO site_visits (ip, user_id, date, created_at) VALUES (?, ?, ?, ?)').run(
      actualIp, userId, dateStr, Date.now()
    );
  } catch (e) {
    // ignore
  }
  next();
});

// API 路由
app.use('/api/auth', authRouter);
app.use('/api/products', productsRouter);
app.use('/api/cart', cartRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/addresses', addressesRouter);
app.use('/api/favorites', favoritesRouter);
app.use('/api/reviews', reviewsRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/admin', adminRouter);
app.use('/api/payment', paymentRouter);
app.use('/api/ai', aiRouter);
app.use('/api/tracking', trackingRouter);
app.use('/api/articles', articlesRouter);
app.use('/api/clinical-reports', clinicalReportsRouter);
app.use('/api/skin', skinRouter);
app.use('/api/coupons', couponsRouter);
app.use('/api/survey', surveyRouter);

// 健康检查
app.get('/api/health', (_req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// 公开网站设置接口（无需登录）
app.get('/api/settings', (req, res) => {
  const langStr = req.headers['accept-language'] || 'zh';
  const lang = langStr.split('-')[0].toLowerCase();
  
  // NOTE: If site_settings doesn't have translations column yet, this might throw error
  // But migrate.ts adds it on startup
  let settings: any[] = [];
  try {
    settings = sqlite.prepare('SELECT key, value, translations FROM site_settings').all() as any[];
  } catch (e) {
    // Fallback if translations column doesn't exist yet
    settings = sqlite.prepare('SELECT key, value FROM site_settings').all() as any[];
  }

  const map: Record<string, string> = {};
  settings.forEach(s => {
    let finalValue = s.value;
    if (lang !== 'zh' && s.translations) {
      try {
         const transObj = typeof s.translations === 'string' ? JSON.parse(s.translations) : s.translations;
         if (transObj[lang] && transObj[lang].value) {
            finalValue = transObj[lang].value;
         }
      } catch (e) {}
    }
    map[s.key] = finalValue;
  });
  res.json(map);
});

// SEO: sitemap.xml
app.get('/sitemap.xml', (_req, res) => {
  const baseUrl = 'https://www.trasochy.com';

  // 静态页面
  const staticPages = [
    '', '/products', '/about', '/contact', '/delivery', '/privacy', 
    '/quiz', '/brand-story', '/articles'
  ];

  // 动态商品页面
  const products = sqlite.prepare('SELECT slug, updated_at FROM products WHERE is_active = 1').all() as any[];

  // 动态分类页面
  const categories = sqlite.prepare('SELECT slug FROM categories WHERE is_active = 1').all() as any[];

  // 动态文章页面
  const articles = sqlite.prepare("SELECT slug, updated_at, published_at FROM articles WHERE status = 'published'").all() as any[];

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

  // 添加静态页面
  staticPages.forEach(page => {
    xml += `  <url>\n    <loc>${baseUrl}${page}</loc>\n    <changefreq>daily</changefreq>\n    <priority>${page === '' ? '1.0' : '0.8'}</priority>\n  </url>\n`;
  });

  // 添加分类页面
  categories.forEach(cat => {
    xml += `  <url>\n    <loc>${baseUrl}/products?category=${cat.slug}</loc>\n    <changefreq>daily</changefreq>\n    <priority>0.7</priority>\n  </url>\n`;
  });

  // 添加商品页面
  products.forEach(p => {
    const lastmod = p.updated_at ? new Date(p.updated_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
    xml += `  <url>\n    <loc>${baseUrl}/products/${p.slug}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.9</priority>\n  </url>\n`;
  });

  // 添加文章页面
  articles.forEach(a => {
    const lastmod = (a.updated_at || a.published_at) ? new Date(a.updated_at || a.published_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
    xml += `  <url>\n    <loc>${baseUrl}/articles/${a.slug}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.8</priority>\n  </url>\n`;
  });

  xml += '</urlset>';

  res.header('Content-Type', 'application/xml');
  res.send(xml);
});

// SEO: robots.txt
app.get('/robots.txt', (_req, res) => {
  const baseUrl = 'https://www.trasochy.com';
  const robotsTxt = `User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/
Disallow: /cart
Disallow: /checkout
Disallow: /profile
Disallow: /orders

# GEO AI Crawlers explicitly allowed
User-agent: GPTBot
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: ClaudeBot
Allow: /

Sitemap: ${baseUrl}/sitemap.xml
`;
  res.header('Content-Type', 'text/plain');
  res.send(robotsTxt);
});

// 生产模式下服务前端构建
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(process.cwd(), 'client', 'dist'), {
    maxAge: '1h',
    etag: true,
  }));
  app.get('/{*path}', (_req, res) => {
    res.set('Cache-Control', 'no-cache');
    res.sendFile(path.join(process.cwd(), 'client', 'dist', 'index.html'));
  });
}

// 错误处理
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Server Error]', err);
  res.status(500).json({ error: '服务器内部错误', detail: err.message });
});

async function start() {
  await initDB();
  initCouponTables();
  initSurveyTable();
  initCronJobs();
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] 护肤品商城后端运行在 http://localhost:${PORT}`);
    console.log(`[Server] Admin: admin@skincare.com / admin123`);
  });
}

start().catch(console.error);
