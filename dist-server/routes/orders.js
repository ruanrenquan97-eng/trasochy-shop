"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const index_1 = require("../db/index");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
function generateOrderNo() {
    const d = new Date();
    const prefix = `SK${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
    const suffix = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
    return `${prefix}${suffix}`;
}
// 创建订单
router.post('/', auth_1.authMiddleware, (req, res) => {
    const { items, recipientName, recipientPhone, address, remark, payMethod, usePoints, isPointsRedemption, isGift, giftMessage, giftWrapFee } = req.body;
    if (!items?.length) {
        res.status(400).json({ error: '订单项目不能为空' });
        return;
    }
    if (!recipientName || !recipientPhone || !address) {
        res.status(400).json({ error: '收货信息不完整' });
        return;
    }
    // Get points to money ratio setting
    const settingsRow = index_1.sqlite.prepare("SELECT value FROM site_settings WHERE key = 'points_to_money_ratio'").get();
    const pointsToUseRatio = parseInt(settingsRow?.value || '100', 10);
    // 获取用户当前积分
    const userRow = index_1.sqlite.prepare('SELECT points FROM users WHERE id = ?').get(req.user.id);
    const currentPoints = userRow?.points || 0;
    const pointsToUse = parseInt(usePoints || '0', 10);
    if (pointsToUse > 0 && pointsToUse > currentPoints) {
        res.status(400).json({ error: '积分余额不足' });
        return;
    }
    const userLevel = req.user.level;
    const giftFee = isGift ? parseFloat(giftWrapFee || '0') : 0;
    let totalAmount = giftFee;
    const orderItemsData = [];
    for (const item of items) {
        const product = index_1.sqlite.prepare('SELECT * FROM products WHERE id=? AND is_active=1').get(item.productId);
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
        }
        else {
            const priceRow = index_1.sqlite.prepare('SELECT price FROM product_prices WHERE product_id=? AND level=?').get(product.id, userLevel);
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
    const promoSettings = index_1.sqlite.prepare("SELECT key, value FROM site_settings WHERE key IN ('promo_discount_active', 'promo_discount_threshold', 'promo_discount_amount')").all();
    const promoSettingsMap = Object.fromEntries(promoSettings.map(s => [s.key, s.value]));
    let promoDiscount = 0;
    if (promoSettingsMap.promo_discount_active === '1') {
        const threshold = parseFloat(promoSettingsMap.promo_discount_threshold || '0');
        const amount = parseFloat(promoSettingsMap.promo_discount_amount || '0');
        if ((totalAmount - giftFee) >= threshold && threshold > 0) {
            promoDiscount = amount;
        }
    }
    let discountAmount = promoDiscount;
    let payAmount = 0;
    let status = 'pending';
    let payTime = null;
    if (isPointsRedemption) {
        // 纯积分兑换模式
        discountAmount = totalAmount; // 全额抵扣
        payAmount = 0;
        status = 'paid'; // 自动支付完成
        payTime = now;
    }
    else {
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
    const createOrder = index_1.sqlite.transaction(() => {
        const result = index_1.sqlite.prepare(`
      INSERT INTO orders (order_no,user_id,user_level,status,total_amount,discount_amount,pay_amount,pay_method,pay_time,recipient_name,recipient_phone,address,remark,is_gift,gift_message,gift_wrap_fee,created_at,updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `).run(orderNo, req.user.id, userLevel, status, totalAmount, discountAmount, payAmount, payMethod || null, payTime, recipientName, recipientPhone, address, remark || null, isGift ? 1 : 0, giftMessage || null, giftFee, now, now);
        const orderId = result.lastInsertRowid;
        // 扣减积分
        if (pointsToUse > 0) {
            index_1.sqlite.prepare('UPDATE users SET points = points - ? WHERE id = ?').run(pointsToUse, req.user.id);
            index_1.sqlite.prepare('INSERT INTO points_history (user_id, amount, type, description, created_at) VALUES (?, ?, ?, ?, ?)').run(req.user.id, -pointsToUse, 'redeem_product', `订单 ${orderNo} 抵扣使用`, now);
        }
        for (const item of orderItemsData) {
            index_1.sqlite.prepare(`
        INSERT INTO order_items (order_id,product_id,product_name,product_image,quantity,unit_price,subtotal)
        VALUES (?,?,?,?,?,?,?)
      `).run(orderId, item.productId, item.productName, item.productImage, item.quantity, item.unitPrice, item.subtotal);
            // 减少库存
            index_1.sqlite.prepare('UPDATE products SET stock = stock - ? WHERE id = ?').run(item.quantity, item.productId);
            // 如果是组合商品，连带扣减包含的单品库存
            const checkBundle = index_1.sqlite.prepare('SELECT is_bundle FROM products WHERE id = ?').get(item.productId);
            if (checkBundle && checkBundle.is_bundle) {
                const bundleItems = index_1.sqlite.prepare('SELECT product_id FROM product_bundle_items WHERE bundle_id = ?').all(item.productId);
                for (const comp of bundleItems) {
                    index_1.sqlite.prepare('UPDATE products SET stock = stock - ? WHERE id = ?').run(item.quantity, comp.product_id);
                }
            }
            // 如果是订阅商品，插入订阅表 (Phase 3)
            if (item.isSubscription) {
                const nextDeliverDate = now + item.frequencyDays * 24 * 60 * 60 * 1000;
                index_1.sqlite.prepare(`
          INSERT INTO subscriptions (user_id, product_id, status, frequency_days, discount_percent, next_deliver_date, created_at, updated_at)
          VALUES (?, ?, 'active', ?, 0.9, ?, ?, ?)
        `).run(req.user.id, item.productId, item.frequencyDays, nextDeliverDate, now, now);
            }
        }
        // 清理购物车中已购商品
        for (const item of items) {
            if (!item.isSubscription && !item.isSample) {
                index_1.sqlite.prepare('DELETE FROM cart_items WHERE user_id=? AND product_id=?').run(req.user.id, item.productId);
            }
        }
        return orderId;
    });
    const orderId = createOrder();
    res.json({ success: true, orderId, orderNo });
});
// 获取我的订单列表
router.get('/my', auth_1.authMiddleware, (req, res) => {
    const { status, page = '1', limit = '10' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let where = 'user_id = ?';
    const params = [req.user.id];
    if (status && status !== 'all') {
        where += ' AND status = ?';
        params.push(status);
    }
    const orders = index_1.sqlite.prepare(`
    SELECT * FROM orders WHERE ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?
  `).all(...params, parseInt(limit), offset);
    // 获取每个订单的商品
    const enriched = orders.map((order) => {
        const items = index_1.sqlite.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
        return { ...order, items };
    });
    const total = index_1.sqlite.prepare(`SELECT COUNT(*) as c FROM orders WHERE ${where}`).get(...params).c;
    res.json({ orders: enriched, total, page: parseInt(page) });
});
// 获取订单详情
router.get('/:orderNo', auth_1.authMiddleware, (req, res) => {
    const order = index_1.sqlite.prepare('SELECT * FROM orders WHERE order_no=? AND user_id=?').get(req.params.orderNo, req.user.id);
    if (!order) {
        res.status(404).json({ error: '订单不存在' });
        return;
    }
    const items = index_1.sqlite.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
    res.json({ ...order, items });
});
// 取消订单
router.post('/:orderNo/cancel', auth_1.authMiddleware, (req, res) => {
    const order = index_1.sqlite.prepare('SELECT * FROM orders WHERE order_no=? AND user_id=?').get(req.params.orderNo, req.user.id);
    if (!order) {
        res.status(404).json({ error: '订单不存在' });
        return;
    }
    if (!['pending', 'paid'].includes(order.status)) {
        res.status(400).json({ error: '该状态不可取消' });
        return;
    }
    const cancel = index_1.sqlite.transaction(() => {
        index_1.sqlite.prepare("UPDATE orders SET status='cancelled',updated_at=? WHERE id=?").run(Date.now(), order.id);
        // 恢复库存
        const items = index_1.sqlite.prepare('SELECT * FROM order_items WHERE order_id=?').all(order.id);
        for (const item of items) {
            index_1.sqlite.prepare('UPDATE products SET stock = stock + ? WHERE id = ?').run(item.quantity, item.product_id);
            // 如果是组合商品，恢复连带单品的库存
            const checkBundle = index_1.sqlite.prepare('SELECT is_bundle FROM products WHERE id = ?').get(item.product_id);
            if (checkBundle && checkBundle.is_bundle) {
                const bundleItems = index_1.sqlite.prepare('SELECT product_id FROM product_bundle_items WHERE bundle_id = ?').all(item.product_id);
                for (const comp of bundleItems) {
                    index_1.sqlite.prepare('UPDATE products SET stock = stock + ? WHERE id = ?').run(item.quantity, comp.product_id);
                }
            }
        }
    });
    cancel();
    res.json({ success: true });
});
// 获取我的订阅列表 (Phase 3)
router.get('/subscriptions', auth_1.authMiddleware, (req, res) => {
    const subscriptions = index_1.sqlite.prepare(`
    SELECT s.*, p.name as product_name, p.main_image as product_image
    FROM subscriptions s
    JOIN products p ON s.product_id = p.id
    WHERE s.user_id = ?
    ORDER BY s.created_at DESC
  `).all(req.user.id);
    res.json({ subscriptions });
});
// 更改订阅状态 (Phase 3)
router.put('/subscriptions/:id/status', auth_1.authMiddleware, (req, res) => {
    const { status } = req.body;
    const sub = index_1.sqlite.prepare('SELECT * FROM subscriptions WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!sub) {
        res.status(404).json({ error: '订阅不存在' });
        return;
    }
    index_1.sqlite.prepare('UPDATE subscriptions SET status = ?, updated_at = ? WHERE id = ?').run(status, Date.now(), req.params.id);
    res.json({ success: true });
});
exports.default = router;
