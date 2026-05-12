"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const index_1 = require("../db/index");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// 获取分类列表（必须在 /:slug 之前）
router.get('/categories/list', (req, res) => {
    const cats = index_1.sqlite.prepare('SELECT * FROM categories WHERE is_active = 1 ORDER BY sort_order').all();
    res.json(cats);
});
// 搜索建议（必须在 /:slug 之前）
router.get('/search/suggestions', (req, res) => {
    const { q = '' } = req.query;
    if (!q || q.length < 1) {
        res.json([]);
        return;
    }
    const keyword = `%${q}%`;
    const suggestions = index_1.sqlite.prepare(`
    SELECT name, slug, main_image FROM products
    WHERE is_active = 1 AND (name LIKE ? OR COALESCE(tags, '') LIKE ?)
    ORDER BY sort_order ASC LIMIT 6
  `).all(keyword, keyword);
    // 去重名称并返回
    const seen = new Set();
    const unique = suggestions.filter((s) => {
        if (seen.has(s.name))
            return false;
        seen.add(s.name);
        return true;
    });
    res.json(unique);
});
// 热门搜索标签（必须在 /:slug 之前）
router.get('/search/hot', (_req, res) => {
    const tags = ['氨基酸', '美白', '保湿', '防晒', '抗老', '烟酰胺', '玻尿酸', '面膜', '洁面'];
    res.json(tags);
});
// 获取公开标签 (肤质/诉求/剂型)
router.get('/tags/:type', (req, res) => {
    const typeMap = {
        'skin-types': 'skin_types',
        'skin-concerns': 'skin_concerns',
        'dosage-forms': 'dosage_forms'
    };
    const typeStr = req.params.type;
    const tableName = typeMap[typeStr];
    if (!tableName)
        return res.status(400).json({ error: 'Invalid tag type' });
    const items = index_1.sqlite.prepare(`SELECT * FROM ${tableName} WHERE is_active = 1 ORDER BY sort_order`).all();
    const mapped = items.map(item => ({ ...item, original_name: item.name }));
    res.json(mapped);
});
// 获取商品列表（支持等级价格）
router.get('/', auth_1.optionalAuth, (req, res) => {
    const category = req.query.category;
    const keyword = req.query.keyword;
    const isBundle = req.query.bundle;
    const isSample = req.query.isSample;
    const isFeatured = req.query.isFeatured;
    const skinType = req.query.skinType;
    const concern = req.query.concern;
    const page = req.query.page || '1';
    const limit = req.query.limit || '12';
    const sort = req.query.sort || 'sort_order';
    const userLevel = req.user?.level || 'guest';
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let where = 'p.is_active = 1';
    const params = [];
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
    if (isFeatured === '1') {
        where += ' AND p.is_featured = 1';
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
    const sortMap = {
        sort_order: 'p.sort_order ASC',
        price_asc: 'pp.price ASC',
        price_desc: 'pp.price DESC',
        newest: 'p.created_at DESC',
    };
    const orderBy = sortMap[sort] || 'p.sort_order ASC';
    const countRow = index_1.sqlite.prepare(`SELECT COUNT(*) as total FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE ${where}`).get(...params);
    const rows = index_1.sqlite.prepare(`
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
  `).all(userLevel, ...params, parseInt(limit), offset);
    res.json({
        items: rows,
        total: countRow.total,
        page: parseInt(page),
        limit: parseInt(limit),
        userLevel,
    });
});
// 获取单个商品详情（含所有等级价格）- 必须放在最后作为参数路由
router.get('/:slug', auth_1.optionalAuth, (req, res) => {
    const userLevel = req.user?.level || 'guest';
    const product = index_1.sqlite.prepare(`
    SELECT p.*, c.name as category_name, c.slug as category_slug
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.slug = ? AND p.is_active = 1
  `).get(req.params.slug);
    if (!product) {
        res.status(404).json({ error: '商品不存在' });
        return;
    }
    // 获取所有等级价格
    const prices = index_1.sqlite.prepare('SELECT level, price, discount FROM product_prices WHERE product_id = ?').all(product.id);
    const priceMap = {};
    prices.forEach((p) => { priceMap[p.level] = p; });
    // 当前用户看到的价格
    const currentPrice = priceMap[userLevel]?.price ?? product.base_price;
    // 获取包含此商品的组合
    const relatedBundles = index_1.sqlite.prepare(`
    SELECT p.id, p.name, p.slug, p.main_image, p.base_price,
           COALESCE(pp.price, p.base_price) as current_price
    FROM products p
    JOIN product_bundle_items pbi ON p.id = pbi.bundle_id
    LEFT JOIN product_prices pp ON pp.product_id = p.id AND pp.level = ?
    WHERE pbi.product_id = ? AND p.is_active = 1 AND p.is_bundle = 1
  `).all(userLevel, product.id);
    // 为每个组合获取其包含的单品信息
    const bundlesWithItems = relatedBundles.map(bundle => {
        const items = index_1.sqlite.prepare(`
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
    const ingredients = index_1.sqlite.prepare(`
    SELECT i.* FROM ingredients i
    JOIN product_ingredients pi ON i.id = pi.ingredient_id
    WHERE pi.product_id = ?
  `).all(product.id);
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
        }
        catch (e) { }
    }
    index_1.sqlite.prepare(`
    INSERT INTO restock_requests (product_id, user_id, email, status, created_at)
    VALUES (?, ?, ?, 'pending', ?)
  `).run(productId, userId, email, Date.now());
    res.json({ success: true });
});
exports.default = router;
