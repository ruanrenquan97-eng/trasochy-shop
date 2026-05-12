import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import dotenv from 'dotenv';
import { initDB } from './db/migrate';
import { initCronJobs } from './utils/cron';

import authRouter from './routes/auth';
import productsRouter from './routes/products';
import cartRouter from './routes/cart';
import ordersRouter from './routes/orders';
import addressesRouter from './routes/addresses';
import favoritesRouter from './routes/favorites';
import reviewsRouter from './routes/reviews';
import uploadRouter from './routes/upload';
import adminRouter from './routes/admin';
import paymentRouter from './routes/payment';
import aiRouter from './routes/ai';
import trackingRouter from './routes/tracking';
import articlesRouter from './routes/articles';
import { sqlite } from './db/index';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 5173;

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: process.env.CORS_ORIGIN || true,
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 静态文件（上传图片）
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// 多语言 API 拦截器 (动态覆盖 translated fields)
app.use((req, res, next) => {
  if (!req.path.startsWith('/api')) return next();
  const langStr = req.headers['accept-language'] || 'zh';
  const lang = langStr.split('-')[0].toLowerCase();
  
  const originalJson = res.json;
  res.json = function (body: any) {
    if (body === null || body === undefined) {
      return originalJson.call(this, body);
    }
    const isAdmin = req.path.startsWith('/api/admin') || req.path.includes('/admin/');
    
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

// 健康检查
app.get('/api/health', (_req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// 公开网站设置接口（无需登录）
app.get('/api/settings', (_req, res) => {
  const settings = sqlite.prepare('SELECT key, value FROM site_settings').all() as any[];
  const map: Record<string, string> = {};
  settings.forEach(s => { map[s.key] = s.value; });
  res.json(map);
});

// SEO: sitemap.xml
app.get('/sitemap.xml', (_req, res) => {
  const baseUrl = 'https://www.trasochy.com';

  // 静态页面
  const staticPages = [
    '', '/products', '/about', '/contact', '/delivery', '/privacy'
  ];

  // 动态商品页面
  const products = sqlite.prepare('SELECT slug, updated_at FROM products WHERE is_active = 1').all() as any[];

  // 动态分类页面
  const categories = sqlite.prepare('SELECT slug FROM categories WHERE is_active = 1').all() as any[];

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
  initCronJobs();
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] 护肤品商城后端运行在 http://localhost:${PORT}`);
    console.log(`[Server] Admin: admin@skincare.com / admin123`);
  });
}

start().catch(console.error);
