"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const index_1 = require("../db/index");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// 获取购物车
router.get('/', auth_1.authMiddleware, (req, res) => {
    const userLevel = req.user.level;
    const items = index_1.sqlite.prepare(`
    SELECT ci.id, ci.product_id, ci.quantity,
           p.name, p.slug, p.main_image, p.stock, p.unit,
           COALESCE(pp.price, p.base_price) as unit_price,
           COALESCE(pp.price, p.base_price) * ci.quantity as subtotal
    FROM cart_items ci
    JOIN products p ON ci.product_id = p.id
    LEFT JOIN product_prices pp ON pp.product_id = p.id AND pp.level = ?
    WHERE ci.user_id = ? AND p.is_active = 1
  `).all(userLevel, req.user.id);
    const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
    // 获取满减优惠配置
    const settings = index_1.sqlite.prepare("SELECT key, value FROM site_settings WHERE key IN ('promo_discount_active', 'promo_discount_threshold', 'promo_discount_amount')").all();
    const settingsMap = Object.fromEntries(settings.map(s => [s.key, s.value]));
    let promoDiscount = 0;
    if (settingsMap.promo_discount_active === '1') {
        const threshold = parseFloat(settingsMap.promo_discount_threshold || '0');
        const amount = parseFloat(settingsMap.promo_discount_amount || '0');
        if (subtotal >= threshold && threshold > 0) {
            promoDiscount = amount;
        }
    }
    const finalTotal = Math.max(0, subtotal - promoDiscount);
    res.json({ items, subtotal, promoDiscount, total: finalTotal, count: items.length });
});
// 添加商品到购物车
router.post('/', auth_1.authMiddleware, (req, res) => {
    const { productId, quantity = 1 } = req.body;
    if (!productId) {
        res.status(400).json({ error: '商品ID不能为空' });
        return;
    }
    const product = index_1.sqlite.prepare('SELECT id, stock FROM products WHERE id=? AND is_active=1').get(productId);
    if (!product) {
        res.status(404).json({ error: '商品不存在' });
        return;
    }
    // 检查是否已在购物车
    const existing = index_1.sqlite.prepare('SELECT id, quantity FROM cart_items WHERE user_id=? AND product_id=?').get(req.user.id, productId);
    if (existing) {
        const newQty = Math.min(existing.quantity + quantity, product.stock, 99);
        index_1.sqlite.prepare('UPDATE cart_items SET quantity=? WHERE id=?').run(newQty, existing.id);
    }
    else {
        const qty = Math.min(quantity, product.stock, 99);
        index_1.sqlite.prepare('INSERT INTO cart_items (user_id,product_id,quantity,created_at) VALUES (?,?,?,?)').run(req.user.id, productId, qty, Date.now());
    }
    res.json({ success: true });
});
// 更新购物车数量
router.put('/:id', auth_1.authMiddleware, (req, res) => {
    const { quantity } = req.body;
    if (!quantity || quantity < 1) {
        res.status(400).json({ error: '数量无效' });
        return;
    }
    const item = index_1.sqlite.prepare('SELECT * FROM cart_items WHERE id=? AND user_id=?').get(req.params.id, req.user.id);
    if (!item) {
        res.status(404).json({ error: '购物车项目不存在' });
        return;
    }
    index_1.sqlite.prepare('UPDATE cart_items SET quantity=? WHERE id=?').run(Math.min(quantity, 99), req.params.id);
    res.json({ success: true });
});
// 删除购物车项目
router.delete('/:id', auth_1.authMiddleware, (req, res) => {
    index_1.sqlite.prepare('DELETE FROM cart_items WHERE id=? AND user_id=?').run(req.params.id, req.user.id);
    res.json({ success: true });
});
// 清空购物车
router.delete('/', auth_1.authMiddleware, (req, res) => {
    index_1.sqlite.prepare('DELETE FROM cart_items WHERE user_id=?').run(req.user.id);
    res.json({ success: true });
});
exports.default = router;
