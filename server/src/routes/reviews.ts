import { Router, Request, Response } from 'express';
import { sqlite } from '../db/index';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// 获取商品评价列表（公开）
router.get('/product/:productId', (req: Request, res: Response) => {
  const { page = '1', limit = '10' } = req.query;
  const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
  const productId = req.params.productId;

  const reviews = sqlite.prepare(`
    SELECT r.*, u.name as user_name, u.level as user_level
    FROM reviews r
    LEFT JOIN users u ON r.user_id = u.id
    WHERE r.product_id = ? AND (r.is_visible = 1 OR r.is_visible IS NULL)
    ORDER BY r.created_at DESC
    LIMIT ? OFFSET ?
  `).all(productId, parseInt(limit as string), offset) as any[];

  const total = (sqlite.prepare(
    'SELECT COUNT(*) as c FROM reviews WHERE product_id = ? AND (is_visible = 1 OR is_visible IS NULL)'
  ).get(productId) as any)?.c || 0;

  // 计算平均评分
  const stats = sqlite.prepare(
    'SELECT AVG(rating) as avg_rating, COUNT(*) as count FROM reviews WHERE product_id = ? AND (is_visible = 1 OR is_visible IS NULL)'
  ).get(productId) as any;

  res.json({
    reviews,
    totalCount: total,
    total,
    page: parseInt(page as string),
    avgRating: stats?.avg_rating ? Math.round(stats.avg_rating * 10) / 10 : 0,
    reviewCount: stats?.count || 0,
  });
});

// 创建评价（需登录）
router.post('/', authMiddleware, (req: Request, res: Response) => {
  const { orderId, productId, rating, content } = req.body;
  if (!orderId || !productId || !rating || rating < 1 || rating > 5) {
    res.status(400).json({ error: '评价参数不完整，评分需1-5星' });
    return;
  }

  // 检查订单是否属于当前用户且已完成
  const order = sqlite.prepare(
    "SELECT * FROM orders WHERE id = ? AND user_id = ? AND status = 'delivered'"
  ).get(orderId, req.user!.id) as any;
  if (!order) {
    res.status(403).json({ error: '只能评价已收货的订单' });
    return;
  }

  // 检查订单是否包含该商品
  const orderItem = sqlite.prepare(
    'SELECT * FROM order_items WHERE order_id = ? AND product_id = ?'
  ).get(orderId, productId) as any;
  if (!orderItem) {
    res.status(400).json({ error: '该订单不包含此商品' });
    return;
  }

  // 检查是否已评价
  const existing = sqlite.prepare(
    'SELECT id FROM reviews WHERE order_id = ? AND product_id = ? AND user_id = ?'
  ).get(orderId, productId, req.user!.id);
  if (existing) {
    res.status(409).json({ error: '该商品已评价' });
    return;
  }

  const result = sqlite.prepare(
    `INSERT INTO reviews (user_id, product_id, order_id, rating, content, is_visible, created_at)
     VALUES (?, ?, ?, ?, ?, 1, ?)`
  ).run(req.user!.id, productId, orderId, rating, content || '', Date.now());

  res.json({ success: true, reviewId: result.lastInsertRowid });
});

// 检查订单商品是否已评价
router.get('/check/:orderId/:productId', authMiddleware, (req: Request, res: Response) => {
  const row = sqlite.prepare(
    'SELECT id FROM reviews WHERE order_id = ? AND product_id = ? AND user_id = ?'
  ).get(req.params.orderId, req.params.productId, req.user!.id);
  res.json({ reviewed: !!row });
});

export default router;
