"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
const migrate_1 = require("./db/migrate");
const cron_1 = require("./utils/cron");
const auth_1 = __importDefault(require("./routes/auth"));
const products_1 = __importDefault(require("./routes/products"));
const cart_1 = __importDefault(require("./routes/cart"));
const orders_1 = __importDefault(require("./routes/orders"));
const addresses_1 = __importDefault(require("./routes/addresses"));
const favorites_1 = __importDefault(require("./routes/favorites"));
const reviews_1 = __importDefault(require("./routes/reviews"));
const upload_1 = __importDefault(require("./routes/upload"));
const admin_1 = __importDefault(require("./routes/admin"));
const payment_1 = __importDefault(require("./routes/payment"));
const ai_1 = __importDefault(require("./routes/ai"));
const tracking_1 = __importDefault(require("./routes/tracking"));
const articles_1 = __importDefault(require("./routes/articles"));
const index_1 = require("./db/index");
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = Number(process.env.PORT) || 5173;
app.use((0, helmet_1.default)({ contentSecurityPolicy: false }));
app.use((0, cors_1.default)({
    origin: process.env.CORS_ORIGIN || true,
    credentials: true,
}));
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
// 静态文件（上传图片）
app.use('/uploads', express_1.default.static(path_1.default.join(process.cwd(), 'uploads')));
// 多语言 API 拦截器 (动态覆盖 translated fields)
app.use((req, res, next) => {
    if (!req.path.startsWith('/api'))
        return next();
    const langStr = req.headers['accept-language'] || 'zh';
    const lang = langStr.split('-')[0].toLowerCase();
    const originalJson = res.json;
    res.json = function (body) {
        if (body === null || body === undefined) {
            return originalJson.call(this, body);
        }
        const isAdmin = req.path.startsWith('/api/admin') || req.path.includes('/admin/');
        // 递归处理对象的 translations
        const processTranslations = (obj, visited = new Set()) => {
            if (!obj || typeof obj !== 'object')
                return obj;
            if (visited.has(obj))
                return obj;
            visited.add(obj);
            if (Array.isArray(obj)) {
                obj.forEach(item => processTranslations(item, visited));
            }
            else {
                if ('translations' in obj) {
                    try {
                        const transObj = typeof obj.translations === 'string' ? JSON.parse(obj.translations) : obj.translations;
                        if (isAdmin) {
                            // 后台保持结构，仅解析为对象方便前端表单绑定
                            obj.translations = transObj || {};
                        }
                        else {
                            // 前台进行覆盖合并
                            if (lang !== 'zh' && transObj && transObj[lang]) {
                                Object.assign(obj, transObj[lang]);
                            }
                            delete obj.translations; // 隐藏原始 translation 字段以减小体积
                        }
                    }
                    catch (e) {
                        if (!isAdmin)
                            delete obj.translations;
                        else
                            obj.translations = {};
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
    if (!req.path.startsWith('/api'))
        return next();
    try {
        const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1');
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
            }
            catch (e) { }
        }
        index_1.sqlite.prepare('INSERT OR IGNORE INTO site_visits (ip, user_id, date, created_at) VALUES (?, ?, ?, ?)').run(actualIp, userId, dateStr, Date.now());
    }
    catch (e) {
        // ignore
    }
    next();
});
// API 路由
app.use('/api/auth', auth_1.default);
app.use('/api/products', products_1.default);
app.use('/api/cart', cart_1.default);
app.use('/api/orders', orders_1.default);
app.use('/api/addresses', addresses_1.default);
app.use('/api/favorites', favorites_1.default);
app.use('/api/reviews', reviews_1.default);
app.use('/api/upload', upload_1.default);
app.use('/api/admin', admin_1.default);
app.use('/api/payment', payment_1.default);
app.use('/api/ai', ai_1.default);
app.use('/api/tracking', tracking_1.default);
app.use('/api/articles', articles_1.default);
// 健康检查
app.get('/api/health', (_req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));
// 公开网站设置接口（无需登录）
app.get('/api/settings', (_req, res) => {
    const settings = index_1.sqlite.prepare('SELECT key, value FROM site_settings').all();
    const map = {};
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
    const products = index_1.sqlite.prepare('SELECT slug, updated_at FROM products WHERE is_active = 1').all();
    // 动态分类页面
    const categories = index_1.sqlite.prepare('SELECT slug FROM categories WHERE is_active = 1').all();
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
    app.use(express_1.default.static(path_1.default.join(process.cwd(), 'client', 'dist'), {
        maxAge: '1h',
        etag: true,
    }));
    app.get('/{*path}', (_req, res) => {
        res.set('Cache-Control', 'no-cache');
        res.sendFile(path_1.default.join(process.cwd(), 'client', 'dist', 'index.html'));
    });
}
// 错误处理
app.use((err, _req, res, _next) => {
    console.error('[Server Error]', err);
    res.status(500).json({ error: '服务器内部错误', detail: err.message });
});
async function start() {
    await (0, migrate_1.initDB)();
    (0, cron_1.initCronJobs)();
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`[Server] 护肤品商城后端运行在 http://localhost:${PORT}`);
        console.log(`[Server] Admin: admin@skincare.com / admin123`);
    });
}
start().catch(console.error);
