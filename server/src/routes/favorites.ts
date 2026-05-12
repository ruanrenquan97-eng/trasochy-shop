import { Router, Request, Response } from 'express';
import { sqlite } from '../db/index';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// 获取收藏列表
router.get('/', authMiddleware, (req: Request, res: Response) => {
  const items = sqlite.prepare(`
    SELECT f.id as favorite_id, f.created_at as favorited_at, p.id, p.name, p.slug, p.main_image,
           p.base_price, p.stock, p.unit, c.name as category_name,
           COALESCE(pp.price, p.base_price) as price
    FROM favorites f
    LEFT JOIN products p ON f.product_id = p.id
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN product_prices pp ON pp.product_id = p.id AND pp.level = ?
    WHERE f.user_id = ? AND p.is_active = 1
    ORDER BY f.created_at DESC
  `).all(req.user!.level || 'guest', req.user!.id) as any[];
  res.json(items);
});

// 添加收藏
router.post('/', authMiddleware, (req: Request, res: Response) => {
  const { productId } = req.body;
  if (!productId) {
    res.status(400).json({ error: '缺少商品ID' });
    return;
  }
  // 检查商品是否存在
  const product = sqlite.prepare('SELECT id FROM products WHERE id = ? AND is_active = 1').get(productId);
  if (!product) {
    res.status(404).json({ error: '商品不存在' });
    return;
  }
  // 检查是否已收藏
  const existing = sqlite.prepare('SELECT id FROM favorites WHERE user_id = ? AND product_id = ?').get(
    req.user!.id, productId
  );
  if (existing) {
    res.status(409).json({ error: '已收藏该商品' });
    return;
  }
  sqlite.prepare('INSERT INTO favorites (user_id, product_id, created_at) VALUES (?, ?, ?)').run(
    req.user!.id, productId, Date.now()
  );
  res.json({ success: true });
});

// 取消收藏
router.delete('/:productId', authMiddleware, (req: Request, res: Response) => {
  sqlite.prepare('DELETE FROM favorites WHERE user_id = ? AND product_id = ?').run(
    req.user!.id, req.params.productId
  );
  res.json({ success: true });
});

// 检查是否已收藏（单个商品）
router.get('/check/:productId', authMiddleware, (req: Request, res: Response) => {
  const row = sqlite.prepare('SELECT id FROM favorites WHERE user_id = ? AND product_id = ?').get(
    req.user!.id, req.params.productId
  );
  res.json({ isFavorited: !!row });
});

// 批量检查收藏状态
router.post('/batch-check', authMiddleware, (req: Request, res: Response) => {
  const { productIds } = req.body;
  if (!Array.isArray(productIds)) {
    res.status(400).json({ error: '参数格式错误' });
    return;
  }
  const favorites = sqlite.prepare(
    `SELECT product_id FROM favorites WHERE user_id = ? AND product_id IN (${productIds.map(() => '?').join(',')})`
  ).all(req.user!.id, ...productIds) as any[];
  const set = new Set(favorites.map((f: any) => f.product_id));
  res.json(productIds.map((id: number) => ({ productId: id, isFavorited: set.has(id) })));
});

export default router;
