import { Router, Request, Response } from 'express';
import { sqlite } from '../db/index';
import { optionalAuth } from '../middleware/auth';

const router = Router();

// 获取分类列表（必须在 /:slug 之前）
router.get('/categories/list', (req: Request, res: Response) => {
  const cats = sqlite.prepare('SELECT * FROM categories WHERE is_active = 1 ORDER BY sort_order').all();
  res.json(cats);
});

// 搜索建议（必须在 /:slug 之前）
router.get('/search/suggestions', (req: Request, res: Response) => {
  const { q = '' } = req.query;
  if (!q || (q as string).length < 1) {
    res.json([]);
    return;
  }
  const keyword = `%${q}%`;
  const suggestions = sqlite.prepare(`
    SELECT name, slug, main_image FROM products
    WHERE is_active = 1 AND (name LIKE ? OR COALESCE(tags, '') LIKE ?)
    ORDER BY sort_order ASC LIMIT 6
  `).all(keyword, keyword) as any[];
  // 去重名称并返回
  const seen = new Set<string>();
  const unique = suggestions.filter((s: any) => {
    if (seen.has(s.name)) return false;
    seen.add(s.name);
    return true;
  });
  res.json(unique);
});

// 热门搜索标签（必须在 /:slug 之前）
router.get('/search/hot', (_req: Request, res: Response) => {
  const tags = ['氨基酸', '美白', '保湿', '防晒', '抗老', '烟酰胺', '玻尿酸', '面膜', '洁面'];
  res.json(tags);
});

// 获取商品列表（支持等级价格）
router.get('/', optionalAuth, (req: Request, res: Response) => {
  const category = req.query.category as string | undefined;
  const keyword = req.query.keyword as string | undefined;
  const isBundle = req.query.bundle as string | undefined;
  const isSample = req.query.isSample as string | undefined;
  const skinType = req.query.skinType as string | undefined;
  const concern = req.query.concern as string | undefined;
  const page = (req.query.page as string) || '1';
  const limit = (req.query.limit as string) || '12';
  const sort = (req.query.sort as string) || 'sort_order';
  const userLevel = req.user?.level || 'guest';
  const offset = (parseInt(page) - 1) * parseInt(limit);

  let where = 'p.is_active = 1';
  const params: any[] = [];

  if (category) {
    where += ' AND c.slug = ?';
    params.push(category);
  }
  if (isBundle === '1') {
    where += ' AND p.is_bundle = 1';
  }
  if (isSample === 'true' || isSample === '1') {
    where += ' AND p.is_sample = 1';
  }
  if (keyword) {
    where += ' AND (p.name LIKE ? OR p.description LIKE ? OR COALESCE(p.tags, \'\') LIKE ?)';
    params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
  }
  if (skinType) {
    where += ' AND COALESCE(p.skin_types, \'\') LIKE ?';
    params.push(`%${skinType}%`);
  }
  if (concern) {
    where += ' AND COALESCE(p.concerns, \'\') LIKE ?';
    params.push(`%${concern}%`);
  }

  const sortMap: Record<string, string> = {
    sort_order: 'p.sort_order ASC',
    price_asc: 'pp.price ASC',
    price_desc: 'pp.price DESC',
    newest: 'p.created_at DESC',
  };
  const orderBy = sortMap[sort as string] || 'p.sort_order ASC';

  const countRow = sqlite.prepare(
    `SELECT COUNT(*) as total FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE ${where}`
  ).get(...params) as any;

  const rows = sqlite.prepare(`
    SELECT p.id, p.name, p.slug, p.main_image, p.description, p.detail, p.base_price, p.stock, p.unit,
           c.name as category_name, c.slug as category_slug,
           COALESCE(pp.price, p.base_price) as price,
           COALESCE(pp.discount, 1.0) as discount
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN product_prices pp ON pp.product_id = p.id AND pp.level = ?
    WHERE ${where}
    ORDER BY ${orderBy}
    LIMIT ? OFFSET ?
  `).all(userLevel, ...params, parseInt(limit as string), offset) as any[];

  res.json({
    items: rows,
    total: countRow.total,
    page: parseInt(page as string),
    limit: parseInt(limit as string),
    userLevel,
  });
});

// 获取单个商品详情（含所有等级价格）- 必须放在最后作为参数路由
router.get('/:slug', optionalAuth, (req: Request, res: Response) => {
  const userLevel = req.user?.level || 'guest';
  const product = sqlite.prepare(`
    SELECT p.*, c.name as category_name, c.slug as category_slug
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.slug = ? AND p.is_active = 1
  `).get(req.params.slug) as any;

  if (!product) {
    res.status(404).json({ error: '商品不存在' });
    return;
  }

  // 获取所有等级价格
  const prices = sqlite.prepare(
    'SELECT level, price, discount FROM product_prices WHERE product_id = ?'
  ).all(product.id) as any[];

  const priceMap: Record<string, any> = {};
  prices.forEach((p: any) => { priceMap[p.level] = p; });

  // 当前用户看到的价格
  const currentPrice = priceMap[userLevel]?.price ?? product.base_price;

  // 获取包含此商品的组合
  const relatedBundles = sqlite.prepare(`
    SELECT p.id, p.name, p.slug, p.main_image, p.base_price,
           COALESCE(pp.price, p.base_price) as current_price
    FROM products p
    JOIN product_bundle_items pbi ON p.id = pbi.bundle_id
    LEFT JOIN product_prices pp ON pp.product_id = p.id AND pp.level = ?
    WHERE pbi.product_id = ? AND p.is_active = 1 AND p.is_bundle = 1
  `).all(userLevel, product.id) as any[];

  // 为每个组合获取其包含的单品信息
  const bundlesWithItems = relatedBundles.map(bundle => {
    const items = sqlite.prepare(`
      SELECT p.id, p.name, p.main_image, p.base_price,
             COALESCE(pp.price, p.base_price) as current_price
      FROM products p
      JOIN product_bundle_items pbi ON p.id = pbi.product_id
      LEFT JOIN product_prices pp ON pp.product_id = p.id AND pp.level = ?
      WHERE pbi.bundle_id = ?
    `).all(userLevel, bundle.id);
    return { ...bundle, items };
  });

  // 获取成分
  const ingredients = sqlite.prepare(`
    SELECT i.* FROM ingredients i
    JOIN product_ingredients pi ON i.id = pi.ingredient_id
    WHERE pi.product_id = ?
  `).all(product.id) as any[];

  res.json({
    ...product,
    images: product.images ? JSON.parse(product.images) : [],
    tags: product.tags ? JSON.parse(product.tags) : [],
    skin_types: product.skin_types ? JSON.parse(product.skin_types) : [],
    concerns: product.concerns ? JSON.parse(product.concerns) : [],
    before_after_images: product.before_after_images ? JSON.parse(product.before_after_images) : [],
    prices: priceMap,
    currentPrice,
    userLevel,
    bundles: bundlesWithItems,
    ingredients,
  });
});

// 登记到货提醒
router.post('/restock-request', (req, res) => {
  const { productId, email } = req.body;
  if (!productId || !email) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }
  
  // Try to extract user ID if authenticated (optional, req.user might be undefined since authMiddleware is not global here)
  const authHeader = req.headers.authorization;
  let userId = null;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
      userId = decoded.id;
    } catch(e) {}
  }

  sqlite.prepare(`
    INSERT INTO restock_requests (product_id, user_id, email, status, created_at)
    VALUES (?, ?, ?, 'pending', ?)
  `).run(productId, userId, email, Date.now());

  res.json({ success: true });
});

export default router;
