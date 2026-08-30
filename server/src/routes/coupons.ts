import { Router, Request, Response } from 'express';
import { sqlite } from '../db/index';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// ============================================================
// 工具函数：生成唯一券码
// ============================================================
function generateCouponCode(prefix: string = 'QUIZ'): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let suffix = '';
  for (let i = 0; i < 6; i++) {
    suffix += chars[Math.floor(Math.random() * chars.length)];
  }
  const code = `${prefix}-${suffix}`;
  // 检查是否已存在（碰撞概率极低，最多重试 3 次）
  const exists = sqlite.prepare('SELECT id FROM user_coupons WHERE code = ?').get(code);
  if (exists) return generateCouponCode(prefix);
  return code;
}

// ============================================================
// POST /api/coupons/receive-quiz
// 完成问卷后领取代金券（需登录，每人限领一次）
// ============================================================
router.post('/receive-quiz', authMiddleware, (req: Request, res: Response) => {
  const userId = req.user!.id;
  console.log('[CouponReceive] userId=', userId);

  // 检查问卷券是否开启
  const config = sqlite.prepare("SELECT * FROM coupon_configs WHERE source = 'quiz_completion'").get() as any;
  if (!config || !config.is_active) {
    res.status(403).json({ error: '问卷奖励代金券暂未开启' });
    return;
  }

  // 检查该用户是否已经领取过问卷奖励券
  const existing = sqlite.prepare(
    "SELECT id, code, status, expires_at, value, type, min_amount FROM user_coupons WHERE user_id = ? AND source = 'quiz_completion'"
  ).get(userId) as any;

  if (existing) {
    // 已领取，直接返回已有的券
    res.json({
      alreadyClaimed: true,
      coupon: {
        code: existing.code,
        status: existing.status,
        value: existing.value,
        type: existing.type,
        minAmount: existing.min_amount,
        expiresAt: existing.expires_at,
      },
    });
    return;
  }

  // 生成新的券码
  const code = generateCouponCode('QUIZ');
  const now = Date.now();
  const expiresAt = now + config.valid_days * 24 * 60 * 60 * 1000;

  sqlite.prepare(`
    INSERT INTO user_coupons (user_id, code, source, type, value, min_amount, status, expires_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 'unused', ?, ?)
  `).run(userId, code, 'quiz_completion', config.type, config.value, config.min_amount, expiresAt, now);

  res.json({
    alreadyClaimed: false,
    coupon: {
      code,
      status: 'unused',
      value: config.value,
      type: config.type,
      minAmount: config.min_amount,
      expiresAt,
    },
  });
});

// ============================================================
// POST /api/coupons/validate
// 验证券码是否可用于当前订单（需登录）
// Body: { code, orderAmount }
// ============================================================
router.post('/validate', authMiddleware, (req: Request, res: Response) => {
  const { code, orderAmount } = req.body;
  if (!code) {
    res.status(400).json({ error: '请输入代金券码' });
    return;
  }

  // 清理券码：去掉所有空白/零宽字符再转大写，防止复制时带入不可见字符
  const normalizedCode = String(code).replace(/[\s\u00A0\u200B\u200C\u200D\u2060\uFEFF]/g, '').toUpperCase();

  const coupon = sqlite.prepare(
    'SELECT * FROM user_coupons WHERE code = ? AND user_id = ?'
  ).get(normalizedCode, req.user!.id) as any;

  console.log('[CouponValidate] rawCode=', JSON.stringify(code), 'normalized=', normalizedCode, 'userId=', req.user!.id, 'found=', !!coupon);

  if (!coupon) {
    res.status(404).json({ error: '代金券不存在或不属于您' });
    return;
  }

  if (coupon.status === 'used') {
    res.status(400).json({ error: '该代金券已被使用' });
    return;
  }

  if (coupon.status === 'expired' || Date.now() > coupon.expires_at) {
    // 顺便更新状态
    sqlite.prepare("UPDATE user_coupons SET status = 'expired' WHERE id = ?").run(coupon.id);
    res.status(400).json({ error: '该代金券已过期' });
    return;
  }

  const amount = parseFloat(orderAmount || '0');
  if (coupon.min_amount > 0 && amount < coupon.min_amount) {
    res.status(400).json({
      error: `该代金券需满 ¥${coupon.min_amount.toFixed(2)} 方可使用，当前订单金额不足`,
    });
    return;
  }

  // 计算抵扣金额
  let discountValue = 0;
  if (coupon.type === 'fixed') {
    discountValue = Math.min(coupon.value, amount);
  } else if (coupon.type === 'percent') {
    discountValue = parseFloat((amount * coupon.value).toFixed(2));
  }

  res.json({
    valid: true,
    coupon: {
      id: coupon.id,
      code: coupon.code,
      type: coupon.type,
      value: coupon.value,
      minAmount: coupon.min_amount,
      expiresAt: coupon.expires_at,
    },
    discountValue,
  });
});

// ============================================================
// GET /api/coupons/my
// 获取我的代金券列表（需登录）
// ============================================================
router.get('/my', authMiddleware, (req: Request, res: Response) => {
  const now = Date.now();
  // 自动将已过期未标记的券标记为 expired
  sqlite.prepare(
    "UPDATE user_coupons SET status = 'expired' WHERE user_id = ? AND status = 'unused' AND expires_at < ?"
  ).run(req.user!.id, now);

  const coupons = sqlite.prepare(
    'SELECT * FROM user_coupons WHERE user_id = ? ORDER BY created_at DESC'
  ).all(req.user!.id) as any[];

  res.json({ coupons });
});

export default router;
