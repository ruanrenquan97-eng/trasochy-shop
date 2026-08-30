import { Router, Request, Response } from 'express';
import { sqlite } from '../db/index';
import { authMiddleware } from '../middleware/auth';

const router = Router();

function generateOrderNo(): string {
  const d = new Date();
  const prefix = `SK${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
  const suffix = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
  return `${prefix}${suffix}`;
}

// 创建订单
router.post('/', authMiddleware, (req: Request, res: Response) => {
  const { items, recipientName, recipientPhone, address, remark, payMethod, usePoints, isPointsRedemption, isGift, giftMessage, giftWrapFee, couponCode } = req.body;
  if (!items?.length) {
    res.status(400).json({ error: '订单项目不能为空' });
    return;
  }
  if (!recipientName || !recipientPhone || !address) {
    res.status(400).json({ error: '收货信息不完整' });
    return;
  }

  // Get points to money ratio setting
  const settingsRow = sqlite.prepare("SELECT value FROM site_settings WHERE key = 'points_to_money_ratio'").get() as any;
  const pointsToUseRatio = parseInt(settingsRow?.value || '100', 10);

  // 获取用户当前积分
  const userRow = sqlite.prepare('SELECT points FROM users WHERE id = ?').get(req.user!.id) as any;
  const currentPoints = userRow?.points || 0;
  const pointsToUse = parseInt(usePoints || '0', 10);

  if (pointsToUse > 0 && pointsToUse > currentPoints) {
    res.status(400).json({ error: '积分余额不足' });
    return;
  }

  const userLevel = req.user!.level;
  const giftFee = isGift ? parseFloat(giftWrapFee || '0') : 0;
  let totalAmount = giftFee;
  const orderItemsData: any[] = [];

  for (const item of items) {
    const product = sqlite.prepare('SELECT * FROM products WHERE id=? AND is_active=1').get(item.productId) as any;
    if (!product) {
      res.status(404).json({ error: `商品 ${item.productId} 不存在` });
      return;
    }
    if (product.stock < item.quantity) {
      res.status(400).json({ error: `${product.name} 库存不足` });
      return;
    }
    
    let unitPrice = 0;
    if (item.isSample && product.is_sample) {
      unitPrice = 0;
    } else {
      const priceRow = sqlite.prepare('SELECT price FROM product_prices WHERE product_id=? AND level=?').get(product.id, userLevel) as any;
      unitPrice = priceRow?.price ?? product.base_price;
    }
    
    const subtotal = unitPrice * item.quantity;
    totalAmount += subtotal;
    orderItemsData.push({
      productId: product.id,
      productName: product.name,
      productImage: product.main_image,
      quantity: item.quantity,
      unitPrice,
      subtotal,
      isSubscription: item.isSubscription,
      frequencyDays: item.frequencyDays || 30,
    });
  }

  const orderNo = generateOrderNo();
  const now = Date.now();

  // 计算满减优惠
  const promoSettings = sqlite.prepare("SELECT key, value FROM site_settings WHERE key IN ('promo_discount_active', 'promo_discount_threshold', 'promo_discount_amount')").all() as any[];
  const promoSettingsMap = Object.fromEntries(promoSettings.map(s => [s.key, s.value]));
  
  let promoDiscount = 0;
  if (promoSettingsMap.promo_discount_active === '1') {
    const threshold = parseFloat(promoSettingsMap.promo_discount_threshold || '0');
    const amount = parseFloat(promoSettingsMap.promo_discount_amount || '0');
    if ((totalAmount - giftFee) >= threshold && threshold > 0) {
      promoDiscount = amount;
    }
  }

  // 代金券验证与抵扣计算
  let couponDiscount = 0;
  let validatedCoupon: any = null;
  if (couponCode && !isPointsRedemption) {
    const normalizedCouponCode = String(couponCode).replace(/[\s\u00A0\u200B\u200C\u200D\u2060\uFEFF]/g, '').toUpperCase();
    const coupon = sqlite.prepare(
      "SELECT * FROM user_coupons WHERE code = ? AND user_id = ? AND status = 'unused'"
    ).get(normalizedCouponCode, req.user!.id) as any;

    if (!coupon) {
      res.status(400).json({ error: '代金券无效或已使用' });
      return;
    }
    if (Date.now() > coupon.expires_at) {
      sqlite.prepare("UPDATE user_coupons SET status = 'expired' WHERE id = ?").run(coupon.id);
      res.status(400).json({ error: '代金券已过期' });
      return;
    }
    const orderBase = totalAmount - giftFee;
    if (coupon.min_amount > 0 && orderBase < coupon.min_amount) {
      res.status(400).json({ error: `该代金券需满 ¥${coupon.min_amount.toFixed(2)} 方可使用` });
      return;
    }
    if (coupon.type === 'fixed') {
      couponDiscount = Math.min(coupon.value, orderBase);
    } else if (coupon.type === 'percent') {
      couponDiscount = parseFloat((orderBase * coupon.value).toFixed(2));
    }
    validatedCoupon = coupon;
  }

  let discountAmount = promoDiscount + couponDiscount;
  let payAmount = 0;
  let status = 'pending';
  let payTime = null;
  
  if (isPointsRedemption) {
    // 纯积分兑换模式
    discountAmount = totalAmount; // 全额抵扣
    payAmount = 0;
    status = 'paid'; // 自动支付完成
    payTime = now;
  } else {
    // 普通抵扣模式
    if (pointsToUse > 0) {
      discountAmount += Math.floor(pointsToUse / pointsToUseRatio);
    }
    payAmount = totalAmount - discountAmount;
    if (payAmount <= 0) {
      payAmount = 0;
      status = 'paid';
      payTime = now;
    }
  }

  const createOrder = sqlite.transaction(() => {
    const result = sqlite.prepare(`
      INSERT INTO orders (order_no,user_id,user_level,status,total_amount,discount_amount,pay_amount,pay_method,pay_time,recipient_name,recipient_phone,address,remark,is_gift,gift_message,gift_wrap_fee,coupon_code,created_at,updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `).run(orderNo, req.user!.id, userLevel, status, totalAmount, discountAmount, payAmount, payMethod || null, payTime, recipientName, recipientPhone, address, remark || null, isGift ? 1 : 0, giftMessage || null, giftFee, validatedCoupon ? validatedCoupon.code : null, now, now);

    const orderId = result.lastInsertRowid;

    // 扣减积分
    if (pointsToUse > 0) {
      sqlite.prepare('UPDATE users SET points = points - ? WHERE id = ?').run(pointsToUse, req.user!.id);
      sqlite.prepare('INSERT INTO points_history (user_id, amount, type, description, created_at) VALUES (?, ?, ?, ?, ?)').run(
        req.user!.id, -pointsToUse, 'redeem_product', `订单 ${orderNo} 抵扣使用`, now
      );
    }

    for (const item of orderItemsData) {
      sqlite.prepare(`
        INSERT INTO order_items (order_id,product_id,product_name,product_image,quantity,unit_price,subtotal)
        VALUES (?,?,?,?,?,?,?)
      `).run(orderId, item.productId, item.productName, item.productImage, item.quantity, item.unitPrice, item.subtotal);

      // 减少库存
      sqlite.prepare('UPDATE products SET stock = stock - ? WHERE id = ?').run(item.quantity, item.productId);

      // 如果是组合商品，连带扣减包含的单品库存
      const checkBundle = sqlite.prepare('SELECT is_bundle FROM products WHERE id = ?').get(item.productId) as any;
      if (checkBundle && checkBundle.is_bundle) {
        const bundleItems = sqlite.prepare('SELECT product_id FROM product_bundle_items WHERE bundle_id = ?').all(item.productId) as any[];
        for (const comp of bundleItems) {
          sqlite.prepare('UPDATE products SET stock = stock - ? WHERE id = ?').run(item.quantity, comp.product_id);
        }
      }

      // 如果是订阅商品，插入订阅表 (Phase 3)
      if (item.isSubscription) {
        const nextDeliverDate = now + item.frequencyDays * 24 * 60 * 60 * 1000;
        sqlite.prepare(`
          INSERT INTO subscriptions (user_id, product_id, status, frequency_days, discount_percent, next_deliver_date, created_at, updated_at)
          VALUES (?, ?, 'active', ?, 0.9, ?, ?, ?)
        `).run(req.user!.id, item.productId, item.frequencyDays, nextDeliverDate, now, now);
      }
    }

    // 清理购物车中已购商品
    for (const item of items) {
      if (!item.isSubscription && !item.isSample) {
        sqlite.prepare('DELETE FROM cart_items WHERE user_id=? AND product_id=?').run(req.user!.id, item.productId);
      }
    }

    // 核销代金券
    if (validatedCoupon) {
      sqlite.prepare(`
        UPDATE user_coupons SET status = 'used', used_order_no = ?, used_at = ? WHERE id = ?
      `).run(orderNo, now, validatedCoupon.id);
    }

    return orderId;
  });

  const orderId = createOrder();
  res.json({ success: true, orderId, orderNo });
});

// 获取我的订单列表
router.get('/my', authMiddleware, (req: Request, res: Response) => {
  const { status, page = '1', limit = '10' } = req.query;
  const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

  let where = 'user_id = ?';
  const params: any[] = [req.user!.id];

  if (status && status !== 'all') {
    where += ' AND status = ?';
    params.push(status);
  }

  const orders = sqlite.prepare(`
    SELECT * FROM orders WHERE ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?
  `).all(...params, parseInt(limit as string), offset) as any[];

  // 获取每个订单的商品
  const enriched = orders.map((order: any) => {
    const items = sqlite.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
    return { ...order, items };
  });

  const total = (sqlite.prepare(`SELECT COUNT(*) as c FROM orders WHERE ${where}`).get(...params) as any).c;

  res.json({ orders: enriched, total, page: parseInt(page as string) });
});

// 获取订单详情
router.get('/:orderNo', authMiddleware, (req: Request, res: Response) => {
  const order = sqlite.prepare('SELECT * FROM orders WHERE order_no=? AND user_id=?').get(req.params.orderNo, req.user!.id) as any;
  if (!order) {
    res.status(404).json({ error: '订单不存在' });
    return;
  }
  const items = sqlite.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
  res.json({ ...order, items });
});

// 取消订单
router.post('/:orderNo/cancel', authMiddleware, (req: Request, res: Response) => {
  const order = sqlite.prepare('SELECT * FROM orders WHERE order_no=? AND user_id=?').get(req.params.orderNo, req.user!.id) as any;
  if (!order) {
    res.status(404).json({ error: '订单不存在' });
    return;
  }
  if (order.status !== 'pending') {
    res.status(400).json({ error: '已付款订单不能取消，请申请退款' });
    return;
  }
  const cancel = sqlite.transaction(() => {
    sqlite.prepare("UPDATE orders SET status='cancelled',updated_at=? WHERE id=?").run(Date.now(), order.id);
    // 恢复库存
    const items = sqlite.prepare('SELECT * FROM order_items WHERE order_id=?').all(order.id) as any[];
    for (const item of items) {
      sqlite.prepare('UPDATE products SET stock = stock + ? WHERE id = ?').run(item.quantity, item.product_id);

      // 如果是组合商品，恢复连带单品的库存
      const checkBundle = sqlite.prepare('SELECT is_bundle FROM products WHERE id = ?').get(item.product_id) as any;
      if (checkBundle && checkBundle.is_bundle) {
        const bundleItems = sqlite.prepare('SELECT product_id FROM product_bundle_items WHERE bundle_id = ?').all(item.product_id) as any[];
        for (const comp of bundleItems) {
          sqlite.prepare('UPDATE products SET stock = stock + ? WHERE id = ?').run(item.quantity, comp.product_id);
        }
      }
    }
  });
  cancel();
  res.json({ success: true });
});

// 用户申请退款
router.post('/:orderNo/refund-request', authMiddleware, (req: Request, res: Response) => {
  const order = sqlite.prepare('SELECT * FROM orders WHERE order_no=? AND user_id=?').get(req.params.orderNo, req.user!.id) as any;
  if (!order) {
    res.status(404).json({ error: '订单不存在' });
    return;
  }

  if (order.status === 'refund_requested') {
    res.json({ success: true });
    return;
  }

  if (!['paid', 'processing', 'shipped', 'delivered'].includes(order.status)) {
    res.status(400).json({ error: '该状态不可申请退款' });
    return;
  }

  const reason = String(req.body?.reason || '').trim();
  const note = reason ? `退款申请：${reason}` : '退款申请';
  const remark = order.remark ? `${order.remark}\n${note}` : note;

  sqlite.prepare("UPDATE orders SET status='refund_requested',remark=?,updated_at=? WHERE id=?").run(remark, Date.now(), order.id);
  res.json({ success: true });
});

// 获取我的订阅列表 (Phase 3)
router.get('/subscriptions', authMiddleware, (req: Request, res: Response) => {
  const subscriptions = sqlite.prepare(`
    SELECT s.*, p.name as product_name, p.main_image as product_image
    FROM subscriptions s
    JOIN products p ON s.product_id = p.id
    WHERE s.user_id = ?
    ORDER BY s.created_at DESC
  `).all(req.user!.id);
  res.json({ subscriptions });
});

// 更改订阅状态 (Phase 3)
router.put('/subscriptions/:id/status', authMiddleware, (req: Request, res: Response) => {
  const { status } = req.body;
  const sub = sqlite.prepare('SELECT * FROM subscriptions WHERE id = ? AND user_id = ?').get(req.params.id, req.user!.id);
  if (!sub) {
    res.status(404).json({ error: '订阅不存在' });
    return;
  }
  sqlite.prepare('UPDATE subscriptions SET status = ?, updated_at = ? WHERE id = ?').run(status, Date.now(), req.params.id);
  res.json({ success: true });
});

export default router;
