import { Router, Request, Response } from 'express';
import { sqlite } from '../db/index';

const router = Router();

// ============================================================
// POST /api/tracking/view
// 记录页面浏览与停留时间（支持前台 sendBeacon 与 普通 Ajax）
// ============================================================
router.post('/view', async (req: Request, res: Response) => {
  try {
    let body = req.body;
    // 兼容部分浏览器 sendBeacon 发送字符串的情况
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch {}
    }

    const { sessionId, path, dwellTime, productId } = body || {};
    
    if (!sessionId || !path) {
      res.status(400).json({ error: 'Missing required tracking data' });
      return;
    }

    const userId = (req as any).user?.id || null;

    // 智能解析商品 ID（如果前端未直接传入 productId）
    let resolvedProductId = productId || null;
    if (!resolvedProductId && path && typeof path === 'string' && path.startsWith('/products/')) {
      const slug = path.replace('/products/', '').split('?')[0].split('#')[0].trim();
      if (slug) {
        const prod = sqlite.prepare('SELECT id FROM products WHERE slug = ?').get(slug) as any;
        if (prod) resolvedProductId = prod.id;
      }
    }

    const dwellSec = Math.max(0, parseInt(dwellTime, 10) || 0);

    sqlite.prepare(`
      INSERT INTO user_behavior_logs (session_id, user_id, action_type, path, product_id, dwell_time, created_at)
      VALUES (?, ?, 'page_view', ?, ?, ?, ?)
    `).run(
      sessionId,
      userId,
      path,
      resolvedProductId,
      dwellSec,
      Date.now()
    );

    res.json({ success: true, resolvedProductId, dwellTime: dwellSec });
  } catch (err: any) {
    console.error('[Tracking View Error]', err);
    res.status(500).json({ error: 'Tracking failed' });
  }
});

// ============================================================
// POST /api/tracking/event
// 记录用户交互事件（如加购、点击测肤等）
// ============================================================
router.post('/event', async (req: Request, res: Response) => {
  try {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch {}
    }

    const { sessionId, path, actionType, productId } = body || {};
    
    if (!sessionId || !actionType || !path) {
      res.status(400).json({ error: 'Missing required tracking data' });
      return;
    }

    const userId = (req as any).user?.id || null;

    let resolvedProductId = productId || null;
    if (!resolvedProductId && path && typeof path === 'string' && path.startsWith('/products/')) {
      const slug = path.replace('/products/', '').split('?')[0].split('#')[0].trim();
      if (slug) {
        const prod = sqlite.prepare('SELECT id FROM products WHERE slug = ?').get(slug) as any;
        if (prod) resolvedProductId = prod.id;
      }
    }

    sqlite.prepare(`
      INSERT INTO user_behavior_logs (session_id, user_id, action_type, path, product_id, dwell_time, created_at)
      VALUES (?, ?, ?, ?, ?, 0, ?)
    `).run(
      sessionId,
      userId,
      actionType,
      path,
      resolvedProductId,
      Date.now()
    );

    res.json({ success: true });
  } catch (err: any) {
    console.error('[Tracking Event Error]', err);
    res.status(500).json({ error: 'Tracking failed' });
  }
});

// ============================================================
// GET /api/tracking/stats
// 获取 AI 智能运营总监专用的停留时长与行为统计数据
// ============================================================
router.get('/stats', async (_req: Request, res: Response) => {
  try {
    // 1. 全站行为大致统计
    const generalStats = sqlite.prepare(`
      SELECT b.action_type, b.path, p.name as product_name, SUM(b.dwell_time) as total_dwell, COUNT(*) as action_count
      FROM user_behavior_logs b
      LEFT JOIN products p ON b.product_id = p.id OR b.path = ('/products/' || p.slug)
      GROUP BY b.action_type, b.path, p.name
      ORDER BY action_count DESC, total_dwell DESC
      LIMIT 30
    `).all();

    // 2. 专门针对各商品的停留时长深度汇总（Product Dwell Time Leaderboard）
    const productStats = sqlite.prepare(`
      SELECT 
        p.id as product_id,
        p.name as product_name,
        p.slug as product_slug,
        p.main_image as product_image,
        p.base_price as product_price,
        c.name as category_name,
        COUNT(DISTINCT b.session_id) as unique_visitors,
        COUNT(*) as view_count,
        SUM(b.dwell_time) as total_dwell_seconds,
        ROUND(AVG(b.dwell_time), 1) as avg_dwell_seconds,
        MAX(b.dwell_time) as max_dwell_seconds
      FROM user_behavior_logs b
      JOIN products p ON b.product_id = p.id OR b.path = ('/products/' || p.slug)
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE b.action_type = 'page_view'
      GROUP BY p.id, p.name, p.slug, p.main_image, p.base_price, c.name
      ORDER BY total_dwell_seconds DESC, view_count DESC
    `).all() as any[];

    // 3. 统计汇总指标
    const totalProductDwellSeconds = productStats.reduce((sum, p) => sum + (p.total_dwell_seconds || 0), 0);
    const totalProductViews = productStats.reduce((sum, p) => sum + (p.view_count || 0), 0);
    const avgProductDwellSeconds = totalProductViews > 0 ? (totalProductDwellSeconds / totalProductViews).toFixed(1) : 0;
    const topDwellProduct = productStats.length > 0 ? productStats[0] : null;

    // 4. 最近 50 条具体停留记录（含具体客户/访客与商品）
    const recentLogs = sqlite.prepare(`
      SELECT 
        b.id,
        b.session_id,
        b.user_id,
        b.path,
        b.dwell_time,
        b.created_at,
        p.name as product_name,
        p.slug as product_slug,
        u.name as user_name,
        u.email as user_email
      FROM user_behavior_logs b
      LEFT JOIN products p ON b.product_id = p.id OR b.path = ('/products/' || p.slug)
      LEFT JOIN users u ON b.user_id = u.id
      WHERE b.action_type = 'page_view'
      ORDER BY b.created_at DESC
      LIMIT 50
    `).all();

    res.json({
      stats: generalStats,
      productStats,
      summary: {
        totalProductDwellSeconds,
        totalProductViews,
        avgProductDwellSeconds: Number(avgProductDwellSeconds),
        topDwellProduct: topDwellProduct ? {
          name: topDwellProduct.product_name,
          total_dwell_seconds: topDwellProduct.total_dwell_seconds,
          avg_dwell_seconds: topDwellProduct.avg_dwell_seconds
        } : null
      },
      recentLogs
    });
  } catch (err: any) {
    console.error('[Tracking Stats Error]', err);
    res.status(500).json({ error: 'Failed to fetch tracking stats' });
  }
});

export default router;
