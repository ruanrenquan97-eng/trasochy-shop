"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const index_1 = require("../db/index");
const auth_1 = require("../middleware/auth");
const PaymentConfig = __importStar(require("../services/payment-config"));
const router = (0, express_1.Router)();
router.use(auth_1.authMiddleware);
// 移除全局 adminMiddleware，改为按模块权限控制
// ========== 数据统计（admin/staff 都可访问） ==========
router.get('/stats', auth_1.staffMiddleware, (req, res) => {
    const totalUsers = index_1.sqlite.prepare("SELECT COUNT(*) as c FROM users WHERE level NOT IN ('admin','staff')").get().c;
    const totalProducts = index_1.sqlite.prepare('SELECT COUNT(*) as c FROM products WHERE is_active=1').get().c;
    const totalOrders = index_1.sqlite.prepare('SELECT COUNT(*) as c FROM orders').get().c;
    const totalRevenue = index_1.sqlite.prepare("SELECT COALESCE(SUM(pay_amount),0) as s FROM orders WHERE status IN ('paid','processing','shipped','delivered')").get().s;
    const pendingOrders = index_1.sqlite.prepare("SELECT COUNT(*) as c FROM orders WHERE status='pending'").get().c;
    const levelDist = index_1.sqlite.prepare("SELECT level, COUNT(*) as count FROM users WHERE level NOT IN ('admin','staff') GROUP BY level").all();
    const recentOrders = index_1.sqlite.prepare(`
    SELECT o.order_no, o.pay_amount, o.status, o.created_at, u.name as user_name
    FROM orders o JOIN users u ON o.user_id=u.id
    ORDER BY o.created_at DESC LIMIT 5
  `).all();
    const todayStr = new Date().toLocaleString('en-CA', { timeZone: 'Asia/Shanghai' }).split(',')[0];
    let todayVisitors = 0;
    let todayMembers = 0;
    try {
        todayVisitors = index_1.sqlite.prepare('SELECT COUNT(DISTINCT ip) as c FROM site_visits WHERE date = ?').get(todayStr)?.c || 0;
        todayMembers = index_1.sqlite.prepare('SELECT COUNT(DISTINCT ip) as c FROM site_visits WHERE date = ? AND user_id IS NOT NULL').get(todayStr)?.c || 0;
    }
    catch (e) {
        // If table doesn't exist yet, ignore
    }
    res.json({ totalUsers, totalProducts, totalOrders, totalRevenue, pendingOrders, levelDist, recentOrders, todayVisitors, todayMembers });
});
// ========== 员工管理（仅超级管理员） ==========
// 获取员工列表
router.get('/staff', auth_1.adminMiddleware, (req, res) => {
    const staffList = index_1.sqlite.prepare(`SELECT id, email, name, phone, level, permissions, is_active, created_at FROM users WHERE level IN ('admin','staff') ORDER BY created_at DESC`).all();
    // 解析 permissions JSON
    staffList.forEach((s) => {
        if (s.permissions) {
            try {
                s.permissions = JSON.parse(s.permissions);
            }
            catch {
                s.permissions = [];
            }
        }
        else {
            s.permissions = null; // admin 无限制
        }
    });
    res.json({ staff: staffList });
});
// 创建员工
router.post('/staff', auth_1.adminMiddleware, async (req, res) => {
    try {
        const { email, name, password, permissions } = req.body;
        if (!email || !name || !password) {
            res.status(400).json({ error: '邮箱、姓名、密码为必填项' });
            return;
        }
        if (password.length < 6) {
            res.status(400).json({ error: '密码不能少于6位' });
            return;
        }
        const existing = index_1.sqlite.prepare('SELECT id FROM users WHERE email = ?').get(email);
        if (existing) {
            res.status(409).json({ error: '该邮箱已存在' });
            return;
        }
        const hashed = await bcryptjs_1.default.hash(password, 10);
        const now = Date.now();
        const permsStr = JSON.stringify(permissions || []);
        const r = index_1.sqlite.prepare(`INSERT INTO users (email,password,name,phone,level,permissions,is_active,created_at,updated_at) VALUES (?,?,?,?,?,?,1,?,?)`).run(email, hashed, name, null, 'staff', permsStr, now, now);
        res.json({ success: true, id: r.lastInsertRowid });
    }
    catch (err) {
        console.error('创建员工失败:', err);
        res.status(500).json({ error: '创建员工失败: ' + (err.message || '未知错误') });
    }
});
// 编辑员工（姓名、权限）
router.put('/staff/:id', auth_1.adminMiddleware, (req, res) => {
    const { name, permissions } = req.body;
    const staff = index_1.sqlite.prepare('SELECT id, level FROM users WHERE id = ?').get(req.params.id);
    if (!staff) {
        res.status(404).json({ error: '员工不存在' });
        return;
    }
    if (staff.level === 'admin') {
        res.status(403).json({ error: '不能编辑超级管理员' });
        return;
    }
    const now = Date.now();
    if (name) {
        index_1.sqlite.prepare('UPDATE users SET name=?, updated_at=? WHERE id=?').run(name, now, req.params.id);
    }
    if (permissions !== undefined) {
        const permsStr = JSON.stringify(permissions);
        index_1.sqlite.prepare('UPDATE users SET permissions=?, updated_at=? WHERE id=?').run(permsStr, now, req.params.id);
    }
    res.json({ success: true });
});
// 重置员工密码
router.put('/staff/:id/password', auth_1.adminMiddleware, async (req, res) => {
    try {
        const { password } = req.body;
        if (!password || password.length < 6) {
            res.status(400).json({ error: '密码不能少于6位' });
            return;
        }
        const staff = index_1.sqlite.prepare('SELECT id, level FROM users WHERE id = ?').get(req.params.id);
        if (!staff) {
            res.status(404).json({ error: '员工不存在' });
            return;
        }
        if (staff.level === 'admin') {
            res.status(403).json({ error: '不能修改超级管理员密码' });
            return;
        }
        const hashed = await bcryptjs_1.default.hash(password, 10);
        index_1.sqlite.prepare('UPDATE users SET password=?, updated_at=? WHERE id=?').run(hashed, Date.now(), req.params.id);
        res.json({ success: true });
    }
    catch (err) {
        console.error('重置员工密码失败:', err);
        res.status(500).json({ error: '重置密码失败: ' + (err.message || '未知错误') });
    }
});
// 启用/禁用员工
router.put('/staff/:id/status', auth_1.adminMiddleware, (req, res) => {
    const { isActive } = req.body;
    const staff = index_1.sqlite.prepare('SELECT id, level FROM users WHERE id = ?').get(req.params.id);
    if (!staff) {
        res.status(404).json({ error: '员工不存在' });
        return;
    }
    if (staff.level === 'admin') {
        res.status(403).json({ error: '不能禁用超级管理员' });
        return;
    }
    index_1.sqlite.prepare('UPDATE users SET is_active=?, updated_at=? WHERE id=?').run(isActive ? 1 : 0, Date.now(), req.params.id);
    res.json({ success: true });
});
// ========== 用户管理（需 users 权限） ==========
router.get('/users', (0, auth_1.permissionMiddleware)('users'), (req, res) => {
    const { page = '1', limit = '20', keyword, level } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let where = "level NOT IN ('admin','staff')";
    const params = [];
    if (keyword) {
        where += ' AND (name LIKE ? OR email LIKE ?)';
        params.push(`%${keyword}%`, `%${keyword}%`);
    }
    if (level) {
        where += ' AND level = ?';
        params.push(level);
    }
    const users = index_1.sqlite.prepare(`SELECT u.id, u.email, u.name, u.phone, u.level, u.points, u.total_spend, u.is_active, u.created_at, u.referral_code, 
            (SELECT r.name FROM users r WHERE r.id = u.referred_by) as referrer_name,
            (SELECT COUNT(*) FROM users r WHERE r.referred_by = u.id) as referral_count
     FROM users u WHERE ${where.replace(/level/g, 'u.level').replace(/name/g, 'u.name').replace(/email/g, 'u.email')} ORDER BY u.created_at DESC LIMIT ? OFFSET ?`).all(...params, parseInt(limit), offset);
    const total = index_1.sqlite.prepare(`SELECT COUNT(*) as c FROM users u WHERE ${where.replace(/level/g, 'u.level').replace(/name/g, 'u.name').replace(/email/g, 'u.email')}`).get(...params).c;
    res.json({ users, total });
});
// 修改用户等级
router.put('/users/:id/level', (0, auth_1.permissionMiddleware)('users'), (req, res) => {
    const { level } = req.body;
    const validLevels = ['member', 'silver', 'gold'];
    if (!validLevels.includes(level)) {
        res.status(400).json({ error: '无效等级' });
        return;
    }
    index_1.sqlite.prepare('UPDATE users SET level=?,updated_at=? WHERE id=? AND level NOT IN (?,?)').run(level, Date.now(), req.params.id, 'admin', 'staff');
    res.json({ success: true });
});
// 禁用/启用用户
router.put('/users/:id/status', (0, auth_1.permissionMiddleware)('users'), (req, res) => {
    const { isActive } = req.body;
    index_1.sqlite.prepare('UPDATE users SET is_active=?,updated_at=? WHERE id=? AND level NOT IN (?,?)').run(isActive ? 1 : 0, Date.now(), req.params.id, 'admin', 'staff');
    res.json({ success: true });
});
// ========== 成分百科管理 (需 products 权限) ==========
router.get('/ingredients', (0, auth_1.permissionMiddleware)('products'), (req, res) => {
    const ingredients = index_1.sqlite.prepare('SELECT * FROM ingredients ORDER BY name').all();
    res.json({ ingredients });
});
router.post('/ingredients', (0, auth_1.permissionMiddleware)('products'), (req, res) => {
    const { name, inciName, description, benefits, translations } = req.body;
    if (!name)
        return res.status(400).json({ error: '成分名称必填' });
    const transStr = translations ? (typeof translations === 'string' ? translations : JSON.stringify(translations)) : null;
    const r = index_1.sqlite.prepare('INSERT INTO ingredients (name, inci_name, description, benefits, translations) VALUES (?,?,?,?,?)').run(name, inciName || null, description || null, benefits || null, transStr);
    res.json({ success: true, id: r.lastInsertRowid });
});
router.put('/ingredients/:id', (0, auth_1.permissionMiddleware)('products'), (req, res) => {
    const { name, inciName, description, benefits, translations } = req.body;
    if (!name)
        return res.status(400).json({ error: '成分名称必填' });
    const transStr = translations ? (typeof translations === 'string' ? translations : JSON.stringify(translations)) : null;
    index_1.sqlite.prepare('UPDATE ingredients SET name=?, inci_name=?, description=?, benefits=?, translations=? WHERE id=?').run(name, inciName || null, description || null, benefits || null, transStr, req.params.id);
    res.json({ success: true });
});
router.delete('/ingredients/:id', (0, auth_1.permissionMiddleware)('products'), (req, res) => {
    index_1.sqlite.prepare('DELETE FROM product_ingredients WHERE ingredient_id=?').run(req.params.id);
    index_1.sqlite.prepare('DELETE FROM ingredients WHERE id=?').run(req.params.id);
    res.json({ success: true });
});
// ========== 商品管理（需 products 权限） ==========
// 获取列表
router.get('/products', (0, auth_1.permissionMiddleware)('products'), (req, res) => {
    const { page = '1', limit = '20', keyword, category } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let where = '1=1';
    const params = [];
    if (keyword) {
        where += ' AND (p.name LIKE ? OR p.description LIKE ?)';
        params.push(`%${keyword}%`, `%${keyword}%`);
    }
    if (category) {
        where += ' AND c.slug = ?';
        params.push(category);
    }
    const products = index_1.sqlite.prepare(`
    SELECT p.*, c.name as category_name FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE ${where} ORDER BY p.created_at DESC LIMIT ? OFFSET ?
  `).all(...params, parseInt(limit), offset);
    // 附带价格信息和关联数据
    const enriched = products.map((p) => {
        const prices = index_1.sqlite.prepare('SELECT level,price,discount FROM product_prices WHERE product_id=?').all(p.id);
        const ingItems = index_1.sqlite.prepare('SELECT ingredient_id FROM product_ingredients WHERE product_id=?').all(p.id);
        const ingredientIds = ingItems.map((i) => i.ingredient_id);
        let bundleProductIds = [];
        if (p.is_bundle) {
            const bItems = index_1.sqlite.prepare('SELECT product_id FROM product_bundle_items WHERE bundle_id=?').all(p.id);
            bundleProductIds = bItems.map((b) => b.product_id);
        }
        return { ...p, prices, ingredientIds, bundleProductIds };
    });
    const total = index_1.sqlite.prepare(`SELECT COUNT(*) as c FROM products p LEFT JOIN categories c ON p.category_id=c.id WHERE ${where}`).get(...params).c;
    res.json({ products: enriched, total });
});
// 创建商品
router.post('/products', (0, auth_1.permissionMiddleware)('products'), (req, res) => {
    const { name, slug, description, detail, categoryId, basePrice, pointsPrice, stock, unit, prices, mainImage, images, sortOrder, tags, isBundle, bundleProductIds, skinTypes, concerns, beforeAfterImages, ingredientIds, isSample, isStoryPage, translations } = req.body;
    if (!name || !basePrice) {
        res.status(400).json({ error: '商品名称和基础价格必填' });
        return;
    }
    const now = Date.now();
    const imagesStr = images ? (typeof images === 'string' ? images : JSON.stringify(images)) : null;
    const tagsStr = tags ? (typeof tags === 'string' ? tags : JSON.stringify(tags)) : null;
    const skinTypesStr = skinTypes ? (typeof skinTypes === 'string' ? skinTypes : JSON.stringify(skinTypes)) : null;
    const concernsStr = concerns ? (typeof concerns === 'string' ? concerns : JSON.stringify(concerns)) : null;
    const beforeAfterStr = beforeAfterImages ? (typeof beforeAfterImages === 'string' ? beforeAfterImages : JSON.stringify(beforeAfterImages)) : null;
    const bundleFlag = isBundle ? 1 : 0;
    const sampleFlag = isSample ? 1 : 0;
    const storyFlag = isStoryPage ? 1 : 0;
    const transStr = translations ? (typeof translations === 'string' ? translations : JSON.stringify(translations)) : null;
    const r = index_1.sqlite.prepare(`INSERT INTO products (name,slug,description,detail,category_id,base_price,points_price,stock,unit,main_image,images,is_active,sort_order,tags,is_bundle,skin_types,concerns,before_after_images,is_sample,is_story_page,translations,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,1,?,?,?,?,?,?,?,?,?,?,?)`).run(name, slug || name.replace(/\s+/g, '-'), description, detail || null, categoryId, basePrice, pointsPrice || null, stock || 0, unit || '件', mainImage || null, imagesStr, sortOrder || 0, tagsStr, bundleFlag, skinTypesStr, concernsStr, beforeAfterStr, sampleFlag, storyFlag, transStr, now, now);
    const productId = r.lastInsertRowid;
    // 绑定成分
    if (ingredientIds && Array.isArray(ingredientIds)) {
        const insertIng = index_1.sqlite.prepare('INSERT INTO product_ingredients (product_id, ingredient_id) VALUES (?, ?)');
        for (const iid of ingredientIds) {
            insertIng.run(productId, iid);
        }
    }
    if (isBundle && bundleProductIds && Array.isArray(bundleProductIds)) {
        const insertBundle = index_1.sqlite.prepare('INSERT INTO product_bundle_items (bundle_id, product_id) VALUES (?, ?)');
        for (const pid of bundleProductIds) {
            insertBundle.run(productId, pid);
        }
    }
    // 插入等级价格
    if (prices) {
        for (const [level, info] of Object.entries(prices)) {
            index_1.sqlite.prepare('INSERT INTO product_prices (product_id,level,price,discount) VALUES (?,?,?,?)').run(productId, level, info.price, info.discount || null);
        }
    }
    else {
        // 默认折扣
        const discounts = { guest: 1.0, member: 0.9, silver: 0.8, gold: 0.7 };
        for (const [level, d] of Object.entries(discounts)) {
            index_1.sqlite.prepare('INSERT INTO product_prices (product_id,level,price,discount) VALUES (?,?,?,?)').run(productId, level, Math.round(basePrice * d * 100) / 100, d);
        }
    }
    res.json({ success: true, productId });
});
// 获取单个商品详情
router.get('/products/:id', (0, auth_1.permissionMiddleware)('products'), (req, res) => {
    const product = index_1.sqlite.prepare(`
    SELECT p.*, c.name as category_name
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.id = ?
  `).get(req.params.id);
    if (!product) {
        res.status(404).json({ error: '商品不存在' });
        return;
    }
    const prices = index_1.sqlite.prepare('SELECT level, price, discount FROM product_prices WHERE product_id = ?').all(product.id);
    const priceMap = {};
    prices.forEach((p) => { priceMap[p.level] = p; });
    let bundleProductIds = [];
    if (product.is_bundle) {
        const bItems = index_1.sqlite.prepare('SELECT product_id FROM product_bundle_items WHERE bundle_id = ?').all(product.id);
        bundleProductIds = bItems.map((b) => b.product_id);
    }
    const ingItems = index_1.sqlite.prepare('SELECT ingredient_id FROM product_ingredients WHERE product_id = ?').all(product.id);
    const ingredientIds = ingItems.map((i) => i.ingredient_id);
    res.json({
        ...product,
        images: product.images ? JSON.parse(product.images) : [],
        tags: product.tags ? JSON.parse(product.tags) : [],
        skin_types: product.skin_types ? JSON.parse(product.skin_types) : [],
        concerns: product.concerns ? JSON.parse(product.concerns) : [],
        before_after_images: product.before_after_images ? JSON.parse(product.before_after_images) : [],
        prices: priceMap,
        bundleProductIds,
        ingredientIds
    });
});
// 更新商品
router.put('/products/:id', (0, auth_1.permissionMiddleware)('products'), (req, res) => {
    const { name, description, detail, categoryId, basePrice, pointsPrice, stock, unit, isActive, prices, mainImage, images, sortOrder, tags, isBundle, bundleProductIds, skinTypes, concerns, beforeAfterImages, ingredientIds, isSample, isStoryPage, translations } = req.body;
    const oldProduct = index_1.sqlite.prepare('SELECT stock FROM products WHERE id = ?').get(req.params.id);
    const imagesStr = images ? (typeof images === 'string' ? images : JSON.stringify(images)) : null;
    const tagsStr = tags ? (typeof tags === 'string' ? tags : JSON.stringify(tags)) : null;
    const skinTypesStr = skinTypes ? (typeof skinTypes === 'string' ? skinTypes : JSON.stringify(skinTypes)) : null;
    const concernsStr = concerns ? (typeof concerns === 'string' ? concerns : JSON.stringify(concerns)) : null;
    const beforeAfterStr = beforeAfterImages ? (typeof beforeAfterImages === 'string' ? beforeAfterImages : JSON.stringify(beforeAfterImages)) : null;
    const bundleFlag = isBundle ? 1 : 0;
    const sampleFlag = isSample ? 1 : 0;
    const storyFlag = isStoryPage ? 1 : 0;
    const transStr = translations ? (typeof translations === 'string' ? translations : JSON.stringify(translations)) : null;
    const now = Date.now();
    index_1.sqlite.prepare(`UPDATE products SET name=?,description=?,detail=?,category_id=?,base_price=?,points_price=?,stock=?,unit=?,main_image=?,images=?,is_active=?,sort_order=?,tags=?,is_bundle=?,skin_types=?,concerns=?,before_after_images=?,is_sample=?,is_story_page=?,translations=?,updated_at=? WHERE id=?`).run(name, description, detail || null, categoryId, basePrice, pointsPrice || null, stock, unit, mainImage || null, imagesStr, isActive ? 1 : 0, sortOrder || 0, tagsStr, bundleFlag, skinTypesStr, concernsStr, beforeAfterStr, sampleFlag, storyFlag, transStr, now, req.params.id);
    if (isBundle && bundleProductIds && Array.isArray(bundleProductIds)) {
        index_1.sqlite.prepare('DELETE FROM product_bundle_items WHERE bundle_id = ?').run(req.params.id);
        const insertBundle = index_1.sqlite.prepare('INSERT INTO product_bundle_items (bundle_id, product_id) VALUES (?, ?)');
        for (const pid of bundleProductIds) {
            insertBundle.run(req.params.id, pid);
        }
    }
    // 更新成分关联
    if (ingredientIds && Array.isArray(ingredientIds)) {
        index_1.sqlite.prepare('DELETE FROM product_ingredients WHERE product_id = ?').run(req.params.id);
        const insertIng = index_1.sqlite.prepare('INSERT INTO product_ingredients (product_id, ingredient_id) VALUES (?, ?)');
        for (const iid of ingredientIds) {
            insertIng.run(req.params.id, iid);
        }
    }
    if (prices) {
        for (const [level, info] of Object.entries(prices)) {
            const existing = index_1.sqlite.prepare('SELECT id FROM product_prices WHERE product_id=? AND level=?').get(req.params.id, level);
            if (existing) {
                index_1.sqlite.prepare('UPDATE product_prices SET price=?,discount=? WHERE product_id=? AND level=?').run(info.price, info.discount, req.params.id, level);
            }
            else {
                index_1.sqlite.prepare('INSERT INTO product_prices (product_id,level,price,discount) VALUES (?,?,?,?)').run(req.params.id, level, info.price, info.discount);
            }
        }
    }
    // Phase 3: 到货提醒检查
    if (oldProduct && oldProduct.stock <= 0 && stock > 0) {
        const settings = index_1.sqlite.prepare("SELECT value FROM site_settings WHERE key = 'feature_restock_notify'").get();
        if (settings && settings.value === '1') {
            const requests = index_1.sqlite.prepare("SELECT id, email FROM restock_requests WHERE product_id = ? AND status = 'pending'").all(req.params.id);
            if (requests.length > 0) {
                // 模拟发送邮件
                console.log(`[Notification] 商品 ${name} 已补货，准备向 ${requests.length} 位用户发送提醒邮件。`);
                requests.forEach(reqObj => {
                    console.log(`[Notification] Sending to ${reqObj.email}...`);
                    index_1.sqlite.prepare("UPDATE restock_requests SET status = 'notified', notified_at = ? WHERE id = ?").run(now, reqObj.id);
                });
            }
        }
    }
    res.json({ success: true });
});
// 删除商品
router.delete('/products/:id', (0, auth_1.permissionMiddleware)('products'), (req, res) => {
    index_1.sqlite.prepare('UPDATE products SET is_active=0,updated_at=? WHERE id=?').run(Date.now(), req.params.id);
    res.json({ success: true });
});
// ========== 订单管理（需 orders 权限） ==========
router.get('/orders', (0, auth_1.permissionMiddleware)('orders'), (req, res) => {
    const { page = '1', limit = '20', status, keyword } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let where = '1=1';
    const params = [];
    if (status && status !== 'all') {
        where += ' AND o.status = ?';
        params.push(status);
    }
    if (keyword) {
        where += ' AND (o.order_no LIKE ? OR o.recipient_name LIKE ?)';
        params.push(`%${keyword}%`, `%${keyword}%`);
    }
    const orders = index_1.sqlite.prepare(`
    SELECT o.*, u.name as user_name, u.email as user_email
    FROM orders o JOIN users u ON o.user_id = u.id
    WHERE ${where} ORDER BY o.created_at DESC LIMIT ? OFFSET ?
  `).all(...params, parseInt(limit), offset);
    const enriched = orders.map((o) => ({
        ...o,
        items: index_1.sqlite.prepare('SELECT * FROM order_items WHERE order_id=?').all(o.id)
    }));
    const total = index_1.sqlite.prepare(`SELECT COUNT(*) as c FROM orders o JOIN users u ON o.user_id=u.id WHERE ${where}`).get(...params).c;
    res.json({ orders: enriched, total });
});
// 更新订单状态
router.put('/orders/:id/status', (0, auth_1.permissionMiddleware)('orders'), (req, res) => {
    const { status } = req.body;
    const validStatus = ['processing', 'shipped', 'delivered', 'cancelled', 'refunded'];
    if (!validStatus.includes(status)) {
        res.status(400).json({ error: '无效状态' });
        return;
    }
    index_1.sqlite.prepare('UPDATE orders SET status=?,updated_at=? WHERE id=?').run(status, Date.now(), req.params.id);
    res.json({ success: true });
});
// ========== 网站设置管理（需 settings 权限） ==========
// 获取所有设置
router.get('/settings', (0, auth_1.permissionMiddleware)('settings', 'marketing', 'articles', 'ai'), (_req, res) => {
    const settings = index_1.sqlite.prepare('SELECT key, value, description FROM site_settings ORDER BY id').all();
    const map = {};
    settings.forEach(s => { map[s.key] = s.value; });
    res.json({ settings, map });
});
// 更新单个设置
router.put('/settings/:key', (0, auth_1.permissionMiddleware)('settings', 'marketing', 'articles', 'ai'), (req, res) => {
    const { value } = req.body;
    if (value === undefined) {
        res.status(400).json({ error: 'value required' });
        return;
    }
    index_1.sqlite.prepare(`
    INSERT INTO site_settings (key, value, updated_at) 
    VALUES (?, ?, ?) 
    ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at
  `).run(req.params.key, String(value), Date.now());
    res.json({ success: true });
});
// 批量更新设置
router.put('/settings', (0, auth_1.permissionMiddleware)('settings', 'marketing', 'articles', 'ai'), (req, res) => {
    const { settings } = req.body; // { key: value, ... }
    if (!settings || typeof settings !== 'object') {
        res.status(400).json({ error: 'settings object required' });
        return;
    }
    const now = Date.now();
    const stmt = index_1.sqlite.prepare(`
    INSERT INTO site_settings (key, value, updated_at) 
    VALUES (?, ?, ?) 
    ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at
  `);
    for (const [key, value] of Object.entries(settings)) {
        stmt.run(key, String(value), now);
    }
    res.json({ success: true });
});
// ========== 支付配置管理（需 settings 权限） ==========
// 获取支付配置（敏感字段掩码处理）
router.get('/payment-settings', (0, auth_1.permissionMiddleware)('settings'), (_req, res) => {
    const settings = PaymentConfig.getAllPaymentSettings();
    // 对敏感字段做掩码处理：有值则只显示前4后4
    const sensitiveKeys = ['wechat_api_key_v3', 'alipay_private_key', 'alipay_public_key'];
    const masked = settings.map(s => {
        if (sensitiveKeys.includes(s.key) && s.value && s.value.length > 8) {
            return { ...s, value: s.value.slice(0, 4) + '****' + s.value.slice(-4), _masked: true };
        }
        return { ...s, _masked: false };
    });
    res.json({ settings: masked, paymentMode: PaymentConfig.getPaymentMode() });
});
// 保存支付配置（敏感字段如果没修改则保持原值）
router.put('/payment-settings', (0, auth_1.permissionMiddleware)('settings'), (req, res) => {
    const { settings } = req.body;
    if (!settings || typeof settings !== 'object') {
        res.status(400).json({ error: 'settings 对象必填' });
        return;
    }
    const sensitiveKeys = ['wechat_api_key_v3', 'alipay_private_key', 'alipay_public_key'];
    const toSave = {};
    for (const [key, value] of Object.entries(settings)) {
        if (sensitiveKeys.includes(key)) {
            // 如果值包含 **** 说明是掩码值（用户没改），保持原值（跳过更新）
            if (String(value).includes('****'))
                continue;
        }
        toSave[key] = String(value);
    }
    try {
        PaymentConfig.savePaymentSettings(toSave);
        res.json({ success: true, message: '支付配置保存成功', paymentMode: PaymentConfig.getPaymentMode() });
    }
    catch (e) {
        res.status(500).json({ error: '保存失败: ' + e.message });
    }
});
// ========== 弃单挽回系统 (Phase 3) ==========
router.post('/abandoned-cart/recover', (0, auth_1.permissionMiddleware)('orders'), (req, res) => {
    const settings = index_1.sqlite.prepare("SELECT value FROM site_settings WHERE key = 'feature_abandoned_cart'").get();
    if (!settings || settings.value !== '1') {
        res.status(403).json({ error: '弃单挽回功能未开启' });
        return;
    }
    // 扫描 pending 状态，且超过 2 小时未支付的订单
    const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
    const abandonedOrders = index_1.sqlite.prepare(`
    SELECT o.id, o.order_no, o.user_id, u.email 
    FROM orders o
    JOIN users u ON o.user_id = u.id
    WHERE o.status = 'pending' AND o.created_at < ?
  `).all(twoHoursAgo);
    if (abandonedOrders.length === 0) {
        res.json({ success: true, message: '未发现待挽回弃单', recoveredCount: 0 });
        return;
    }
    // 模拟发送挽回邮件
    let recoveredCount = 0;
    for (const order of abandonedOrders) {
        console.log(`[Abandoned Cart] 发现弃单 ${order.order_no}，正在向 ${order.email} 发送挽回邮件...`);
        // 这里为了演示挽回效果，直接给用户加上 50 积分
        index_1.sqlite.prepare('UPDATE users SET points = points + 50 WHERE id = ?').run(order.user_id);
        index_1.sqlite.prepare('INSERT INTO points_history (user_id, amount, type, description, created_at) VALUES (?, ?, ?, ?, ?)').run(order.user_id, 50, 'admin_adjust', `弃单挽回系统 - 限时付款奖励`, Date.now());
        recoveredCount++;
    }
    res.json({ success: true, message: `成功向 ${recoveredCount} 位用户发送了弃单挽回邮件与积分奖励`, recoveredCount });
});
exports.default = router;
