import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { sqlite } from '../db/index';
import { authMiddleware, adminMiddleware, staffMiddleware, permissionMiddleware } from '../middleware/auth';
import * as PaymentConfig from '../services/payment-config';

const router = Router();
router.use(authMiddleware);
// 移除全局 adminMiddleware，改为按模块权限控制

// ========== 数据统计（admin/staff 都可访问） ==========
router.get('/stats', staffMiddleware, (req: Request, res: Response) => {
  const totalUsers = (sqlite.prepare("SELECT COUNT(*) as c FROM users WHERE level NOT IN ('admin','staff')").get() as any).c;
  const totalProducts = (sqlite.prepare('SELECT COUNT(*) as c FROM products WHERE is_active=1').get() as any).c;
  const totalOrders = (sqlite.prepare('SELECT COUNT(*) as c FROM orders').get() as any).c;
  const totalRevenue = (sqlite.prepare("SELECT COALESCE(SUM(pay_amount),0) as s FROM orders WHERE status IN ('paid','processing','shipped','delivered')").get() as any).s;
  const pendingOrders = (sqlite.prepare("SELECT COUNT(*) as c FROM orders WHERE status='pending'").get() as any).c;

  const levelDist = sqlite.prepare("SELECT level, COUNT(*) as count FROM users WHERE level NOT IN ('admin','staff') GROUP BY level").all();

  const recentOrders = sqlite.prepare(`
    SELECT o.order_no, o.pay_amount, o.status, o.created_at, u.name as user_name
    FROM orders o JOIN users u ON o.user_id=u.id
    ORDER BY o.created_at DESC LIMIT 5
  `).all();

  const pendingShipmentOrders = sqlite.prepare(`
    SELECT o.order_no, o.pay_amount, o.status, o.created_at, u.name as user_name, o.recipient_name, o.recipient_phone, o.address as recipient_address,
      (SELECT GROUP_CONCAT(product_name || ' x' || quantity, ', ') FROM order_items WHERE order_id = o.id) as products_summary
    FROM orders o JOIN users u ON o.user_id=u.id
    WHERE o.status = 'paid'
    ORDER BY o.created_at ASC LIMIT 10
  `).all();

  const todayStr = new Date().toLocaleString('en-CA', { timeZone: 'Asia/Shanghai' }).split(',')[0];
  let todayVisitors = 0;
  let todayMembers = 0;
  try {
    todayVisitors = (sqlite.prepare('SELECT COUNT(DISTINCT ip) as c FROM site_visits WHERE date = ?').get(todayStr) as any)?.c || 0;
    todayMembers = (sqlite.prepare('SELECT COUNT(DISTINCT ip) as c FROM site_visits WHERE date = ? AND user_id IS NOT NULL').get(todayStr) as any)?.c || 0;
  } catch (e) {
    // If table doesn't exist yet, ignore
  }

  res.json({ totalUsers, totalProducts, totalOrders, totalRevenue, pendingOrders, levelDist, recentOrders, pendingShipmentOrders, todayVisitors, todayMembers });
});

// ========== 员工管理（仅超级管理员） ==========
// 获取员工列表
router.get('/staff', adminMiddleware, (req: Request, res: Response) => {
  const staffList = sqlite.prepare(
    `SELECT id, email, name, phone, level, permissions, is_active, pro_test_limit, created_at FROM users WHERE level IN ('admin','staff') ORDER BY created_at DESC`
  ).all() as any[];
  // 解析 permissions JSON
  staffList.forEach((s: any) => {
    if (s.permissions) {
      try { s.permissions = JSON.parse(s.permissions); } catch { s.permissions = []; }
    } else {
      s.permissions = null; // admin 无限制
    }
  });
  res.json({ staff: staffList });
});

// 创建员工
router.post('/staff', adminMiddleware, async (req: Request, res: Response) => {
  try {
    const { email, name, password, permissions, proTestLimit } = req.body;
    if (!email || !name || !password) {
      res.status(400).json({ error: '邮箱、姓名、密码为必填项' });
      return;
    }
    if (password.length < 6) {
      res.status(400).json({ error: '密码不能少于6位' });
      return;
    }
    const existing = sqlite.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      res.status(409).json({ error: '该邮箱已存在' });
      return;
    }
    const hashed = await bcrypt.hash(password, 10);
    const now = Date.now();
    const permsStr = JSON.stringify(permissions || []);
    const limitNum = parseInt(proTestLimit) || 0;
    const r = sqlite.prepare(
      `INSERT INTO users (email,password,name,phone,level,permissions,pro_test_limit,is_active,created_at,updated_at) VALUES (?,?,?,?,?,?,?,1,?,?)`
    ).run(email, hashed, name, null, 'staff', permsStr, limitNum, now, now);
    res.json({ success: true, id: r.lastInsertRowid });
  } catch (err: any) {
    console.error('创建员工失败:', err);
    res.status(500).json({ error: '创建员工失败: ' + (err.message || '未知错误') });
  }
});

// 编辑员工（姓名、权限、测肤上限）
router.put('/staff/:id', adminMiddleware, (req: Request, res: Response) => {
  const { name, permissions, proTestLimit } = req.body;
  const staff = sqlite.prepare('SELECT id, level FROM users WHERE id = ?').get(req.params.id) as any;
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
    sqlite.prepare('UPDATE users SET name=?, updated_at=? WHERE id=?').run(name, now, req.params.id);
  }
  if (permissions !== undefined) {
    const permsStr = JSON.stringify(permissions);
    sqlite.prepare('UPDATE users SET permissions=?, updated_at=? WHERE id=?').run(permsStr, now, req.params.id);
  }
  if (proTestLimit !== undefined) {
    const limitNum = parseInt(proTestLimit) || 0;
    sqlite.prepare('UPDATE users SET pro_test_limit=?, updated_at=? WHERE id=?').run(limitNum, now, req.params.id);
  }
  res.json({ success: true });
});

// 重置员工密码
router.put('/staff/:id/password', adminMiddleware, async (req: Request, res: Response) => {
  try {
    const { password } = req.body;
    if (!password || password.length < 6) {
      res.status(400).json({ error: '密码不能少于6位' });
      return;
    }
    const staff = sqlite.prepare('SELECT id, level FROM users WHERE id = ?').get(req.params.id) as any;
    if (!staff) {
      res.status(404).json({ error: '员工不存在' });
      return;
    }
    if (staff.level === 'admin') {
      res.status(403).json({ error: '不能修改超级管理员密码' });
      return;
    }
    const hashed = await bcrypt.hash(password, 10);
    sqlite.prepare('UPDATE users SET password=?, updated_at=? WHERE id=?').run(hashed, Date.now(), req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    console.error('重置员工密码失败:', err);
    res.status(500).json({ error: '重置密码失败: ' + (err.message || '未知错误') });
  }
});

// 启用/禁用员工
router.put('/staff/:id/status', adminMiddleware, (req: Request, res: Response) => {
  const { isActive } = req.body;
  const staff = sqlite.prepare('SELECT id, level FROM users WHERE id = ?').get(req.params.id) as any;
  if (!staff) {
    res.status(404).json({ error: '员工不存在' });
    return;
  }
  if (staff.level === 'admin') {
    res.status(403).json({ error: '不能禁用超级管理员' });
    return;
  }
  sqlite.prepare('UPDATE users SET is_active=?, updated_at=? WHERE id=?').run(isActive ? 1 : 0, Date.now(), req.params.id);
  res.json({ success: true });
});

// 修改员工深度测肤上限
router.put('/staff/:id/pro-test-limit', adminMiddleware, (req: Request, res: Response) => {
  const { proTestLimit } = req.body;
  const limitNum = parseInt(proTestLimit);
  if (isNaN(limitNum) || limitNum < 0) {
    res.status(400).json({ error: '无效的次数上限' });
    return;
  }
  const staff = sqlite.prepare('SELECT id, level FROM users WHERE id = ?').get(req.params.id) as any;
  if (!staff || !['admin', 'staff'].includes(staff.level)) {
    res.status(404).json({ error: '员工不存在' });
    return;
  }
  sqlite.prepare('UPDATE users SET pro_test_limit=?, updated_at=? WHERE id=?').run(limitNum, Date.now(), req.params.id);
  res.json({ success: true });
});

// ========== 用户管理（需 users 权限） ==========
router.get('/users', permissionMiddleware('users'), (req: Request, res: Response) => {
  const { page = '1', limit = '20', keyword, level } = req.query;
  const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
  let where = "level NOT IN ('admin','staff')";
  const params: any[] = [];
  if (keyword) { where += ' AND (name LIKE ? OR email LIKE ?)'; params.push(`%${keyword}%`, `%${keyword}%`); }
  if (level) { where += ' AND level = ?'; params.push(level); }

  const users = sqlite.prepare(
    `SELECT u.id, u.email, u.name, u.phone, u.level, u.points, u.total_spend, u.is_active, u.created_at, u.referral_code, u.partner_tier, u.pro_test_limit, 
            (SELECT r.name FROM users r WHERE r.id = u.referred_by) as referrer_name,
            (SELECT COUNT(*) FROM users r WHERE r.referred_by = u.id) as referral_count
     FROM users u WHERE ${where.replace(/level/g, 'u.level').replace(/name/g, 'u.name').replace(/email/g, 'u.email')} ORDER BY u.created_at DESC LIMIT ? OFFSET ?`
  ).all(...params, parseInt(limit as string), offset);
  const total = (sqlite.prepare(`SELECT COUNT(*) as c FROM users u WHERE ${where.replace(/level/g, 'u.level').replace(/name/g, 'u.name').replace(/email/g, 'u.email')}`).get(...params) as any).c;
  res.json({ users, total });
});

// 修改用户等级
router.put('/users/:id/level', permissionMiddleware('users'), (req: Request, res: Response) => {
  const { level } = req.body;
  const validLevels = ['member', 'silver', 'gold', 'diamond'];
  if (!validLevels.includes(level)) {
    res.status(400).json({ error: '无效等级' });
    return;
  }
  sqlite.prepare('UPDATE users SET level=?,updated_at=? WHERE id=? AND level NOT IN (?,?)').run(level, Date.now(), req.params.id, 'admin', 'staff');
  res.json({ success: true });
});

// 修改合伙人等级
router.put('/users/:id/partner-tier', permissionMiddleware('users'), (req: Request, res: Response) => {
  const { partnerTier } = req.body;
  const validTiers = [null, 'advanced', 'super', 'gold', 'diamond'];
  if (partnerTier !== undefined && !validTiers.includes(partnerTier)) {
    res.status(400).json({ error: '无效合伙人等级' });
    return;
  }
  sqlite.prepare('UPDATE users SET partner_tier=?,updated_at=? WHERE id=? AND level NOT IN (?,?)').run(partnerTier || null, Date.now(), req.params.id, 'admin', 'staff');
  res.json({ success: true });
});

// 修改深度测肤上限
router.put('/users/:id/pro-test-limit', permissionMiddleware('users'), (req: Request, res: Response) => {
  const { proTestLimit } = req.body;
  const limitNum = parseInt(proTestLimit);
  if (isNaN(limitNum) || limitNum < 0) {
    res.status(400).json({ error: '无效的次数上限' });
    return;
  }
  sqlite.prepare('UPDATE users SET pro_test_limit=?,updated_at=? WHERE id=? AND level NOT IN (?,?)').run(limitNum, Date.now(), req.params.id, 'admin', 'staff');
  res.json({ success: true });
});

// 禁用/启用用户
router.put('/users/:id/status', permissionMiddleware('users'), (req: Request, res: Response) => {
  const { isActive } = req.body;
  sqlite.prepare('UPDATE users SET is_active=?,updated_at=? WHERE id=? AND level NOT IN (?,?)').run(isActive ? 1 : 0, Date.now(), req.params.id, 'admin', 'staff');
  res.json({ success: true });
});

// ========== 商品分类管理 (需 products 权限) ==========
router.get('/categories', permissionMiddleware('products'), (req: Request, res: Response) => {
  const categories = sqlite.prepare('SELECT * FROM categories ORDER BY sort_order').all();
  res.json({ categories });
});

router.post('/categories', permissionMiddleware('products'), (req: Request, res: Response) => {
  const { name, slug, description, image, sort_order, is_active, translations } = req.body;
  if (!name || !slug) return res.status(400).json({ error: '分类名称和别名必填' });
  const transStr = translations ? (typeof translations === 'string' ? translations : JSON.stringify(translations)) : null;
  try {
    const r = sqlite.prepare(`
      INSERT INTO categories (name, slug, description, image, sort_order, is_active, translations)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(name, slug, description || null, image || null, sort_order || 0, is_active === undefined ? 1 : is_active, transStr);
    res.json({ success: true, id: r.lastInsertRowid });
  } catch (err: any) {
    if (err.message.includes('UNIQUE constraint failed: categories.slug')) {
      res.status(409).json({ error: '分类别名已存在' });
    } else {
      res.status(500).json({ error: '保存失败' });
    }
  }
});

router.put('/categories/:id', permissionMiddleware('products'), (req: Request, res: Response) => {
  const { name, slug, description, image, sort_order, is_active, translations } = req.body;
  if (!name || !slug) return res.status(400).json({ error: '分类名称和别名必填' });
  const transStr = translations ? (typeof translations === 'string' ? translations : JSON.stringify(translations)) : null;
  try {
    sqlite.prepare(`
      UPDATE categories SET name=?, slug=?, description=?, image=?, sort_order=?, is_active=?, translations=?
      WHERE id=?
    `).run(name, slug, description || null, image || null, sort_order || 0, is_active === undefined ? 1 : is_active, transStr, req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    if (err.message.includes('UNIQUE constraint failed: categories.slug')) {
      res.status(409).json({ error: '分类别名已存在' });
    } else {
      res.status(500).json({ error: '更新失败' });
    }
  }
});

router.delete('/categories/:id', permissionMiddleware('products'), (req: Request, res: Response) => {
  // Check if any products are using this category
  const productsCount = (sqlite.prepare('SELECT COUNT(*) as c FROM products WHERE category_id=?').get(req.params.id) as any).c;
  if (productsCount > 0) {
    res.status(400).json({ error: '该分类下还有商品，无法删除' });
    return;
  }
  sqlite.prepare('DELETE FROM categories WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

// ========== 通用标签分类 CRUD (dosage_forms / skin_concerns / skin_types) ==========
const TAG_TABLES = ['dosage_forms', 'skin_concerns', 'skin_types'] as const;

for (const tableName of TAG_TABLES) {
  const route = tableName.replace(/_/g, '-'); // dosage-forms, skin-concerns, skin-types

  router.get(`/${route}`, permissionMiddleware('products'), (req: Request, res: Response) => {
    const items = sqlite.prepare(`SELECT * FROM ${tableName} ORDER BY sort_order`).all();
    res.json({ items });
  });

  router.post(`/${route}`, permissionMiddleware('products'), (req: Request, res: Response) => {
    const { name, slug, sort_order = 0, is_active = 1, translations } = req.body;
    try {
      sqlite.prepare(
        `INSERT INTO ${tableName} (name, slug, sort_order, is_active, translations) VALUES (?,?,?,?,?)`
      ).run(name, slug, sort_order || 0, is_active ?? 1, translations ? JSON.stringify(translations) : null);
      res.json({ success: true });
    } catch (err: any) {
      if (err.message.includes('UNIQUE constraint failed')) {
        res.status(400).json({ error: '别名(slug)已存在' });
      } else {
        res.status(500).json({ error: err.message });
      }
    }
  });

  router.put(`/${route}/:id`, permissionMiddleware('products'), (req: Request, res: Response) => {
    const { name, slug, sort_order = 0, is_active = 1, translations } = req.body;
    try {
      sqlite.prepare(
        `UPDATE ${tableName} SET name=?, slug=?, sort_order=?, is_active=?, translations=? WHERE id=?`
      ).run(name, slug, sort_order || 0, is_active ?? 1, translations ? JSON.stringify(translations) : null, req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      if (err.message.includes('UNIQUE constraint failed')) {
        res.status(400).json({ error: '别名(slug)已存在' });
      } else {
        res.status(500).json({ error: err.message });
      }
    }
  });

  router.delete(`/${route}/:id`, permissionMiddleware('products'), (req: Request, res: Response) => {
    sqlite.prepare(`DELETE FROM ${tableName} WHERE id=?`).run(req.params.id);
    res.json({ success: true });
  });
}

// ========== 成分百科管理 (需 products 权限) ==========
router.get('/ingredients', permissionMiddleware('products'), (req: Request, res: Response) => {
  const ingredients = sqlite.prepare('SELECT * FROM ingredients ORDER BY name').all();
  res.json({ ingredients });
});

router.post('/ingredients', permissionMiddleware('products'), (req: Request, res: Response) => {
  const { name, inciName, description, benefits, translations } = req.body;
  if (!name) return res.status(400).json({ error: '成分名称必填' });
  const transStr = translations ? (typeof translations === 'string' ? translations : JSON.stringify(translations)) : null;
  const r = sqlite.prepare('INSERT INTO ingredients (name, inci_name, description, benefits, translations) VALUES (?,?,?,?,?)').run(name, inciName || null, description || null, benefits || null, transStr);
  res.json({ success: true, id: r.lastInsertRowid });
});

router.put('/ingredients/:id', permissionMiddleware('products'), (req: Request, res: Response) => {
  const { name, inciName, description, benefits, translations } = req.body;
  if (!name) return res.status(400).json({ error: '成分名称必填' });
  const transStr = translations ? (typeof translations === 'string' ? translations : JSON.stringify(translations)) : null;
  sqlite.prepare('UPDATE ingredients SET name=?, inci_name=?, description=?, benefits=?, translations=? WHERE id=?').run(name, inciName || null, description || null, benefits || null, transStr, req.params.id);
  res.json({ success: true });
});

router.delete('/ingredients/:id', permissionMiddleware('products'), (req: Request, res: Response) => {
  sqlite.prepare('DELETE FROM product_ingredients WHERE ingredient_id=?').run(req.params.id);
  sqlite.prepare('DELETE FROM ingredients WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

// ========== 商品管理（需 products 权限） ==========
// 获取列表
router.get('/products', permissionMiddleware('products'), (req: Request, res: Response) => {
  const { page = '1', limit = '20', keyword, category } = req.query;
  const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
  let where = '1=1';
  const params: any[] = [];
  if (keyword) { where += ' AND (p.name LIKE ? OR p.description LIKE ?)'; params.push(`%${keyword}%`, `%${keyword}%`); }
  if (category) { where += ' AND c.slug = ?'; params.push(category); }

  const products = sqlite.prepare(`
    SELECT p.*, c.name as category_name FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE ${where} ORDER BY p.created_at DESC LIMIT ? OFFSET ?
  `).all(...params, parseInt(limit as string), offset) as any[];

  // 附带价格信息和关联数据
  const enriched = products.map((p: any) => {
    const prices = sqlite.prepare('SELECT level,price,discount FROM product_prices WHERE product_id=?').all(p.id);
    const ingItems = sqlite.prepare('SELECT ingredient_id FROM product_ingredients WHERE product_id=?').all(p.id);
    const ingredientIds = ingItems.map((i: any) => i.ingredient_id);
    
    let bundleProductIds: number[] = [];
    if (p.is_bundle) {
      const bItems = sqlite.prepare('SELECT product_id FROM product_bundle_items WHERE bundle_id=?').all(p.id);
      bundleProductIds = bItems.map((b: any) => b.product_id);
    }
    
    return { ...p, prices, ingredientIds, bundleProductIds };
  });

  const total = (sqlite.prepare(`SELECT COUNT(*) as c FROM products p LEFT JOIN categories c ON p.category_id=c.id WHERE ${where}`).get(...params) as any).c;
  res.json({ products: enriched, total });
});

// 创建商品
router.post('/products', permissionMiddleware('products'), (req: Request, res: Response) => {
  const { name, slug, description, detail, categoryId, basePrice, pointsPrice, stock, unit, prices, mainImage, images, sortOrder, tags, isBundle, bundleProductIds, skinTypes, concerns, dosageForms, beforeAfterImages, ingredientIds, isSample, isStoryPage, isFeatured, translations } = req.body;
  if (!name || !basePrice) {
    res.status(400).json({ error: '商品名称和基础价格必填' });
    return;
  }
  const now = Date.now();
  const imagesStr = images ? (typeof images === 'string' ? images : JSON.stringify(images)) : null;
  const tagsStr = tags ? (typeof tags === 'string' ? tags : JSON.stringify(tags)) : null;
  const skinTypesStr = skinTypes ? (typeof skinTypes === 'string' ? skinTypes : JSON.stringify(skinTypes)) : null;
  const concernsStr = concerns ? (typeof concerns === 'string' ? concerns : JSON.stringify(concerns)) : null;
  const dosageFormsStr = dosageForms ? (typeof dosageForms === 'string' ? dosageForms : JSON.stringify(dosageForms)) : null;
  const beforeAfterStr = beforeAfterImages ? (typeof beforeAfterImages === 'string' ? beforeAfterImages : JSON.stringify(beforeAfterImages)) : null;
  const bundleFlag = isBundle ? 1 : 0;
  const sampleFlag = isSample ? 1 : 0;
  const storyFlag = isStoryPage ? 1 : 0;
  const featuredFlag = isFeatured ? 1 : 0;
  const transStr = translations ? (typeof translations === 'string' ? translations : JSON.stringify(translations)) : null;
  
  const r = sqlite.prepare(`INSERT INTO products (name,slug,description,detail,category_id,base_price,points_price,stock,unit,main_image,images,is_active,sort_order,is_featured,tags,is_bundle,skin_types,concerns,dosage_forms,before_after_images,is_sample,is_story_page,translations,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,1,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
    name, slug || name.replace(/\s+/g, '-'), description, detail || null, categoryId, basePrice, pointsPrice || null, stock || 0, unit || '件', mainImage || null, imagesStr, sortOrder || 0, featuredFlag, tagsStr, bundleFlag, skinTypesStr, concernsStr, dosageFormsStr, beforeAfterStr, sampleFlag, storyFlag, transStr, now, now
  );
  const productId = r.lastInsertRowid;

  // 绑定成分
  if (ingredientIds && Array.isArray(ingredientIds)) {
    const insertIng = sqlite.prepare('INSERT INTO product_ingredients (product_id, ingredient_id) VALUES (?, ?)');
    for (const iid of ingredientIds) {
      insertIng.run(productId, iid);
    }
  }

  if (isBundle && bundleProductIds && Array.isArray(bundleProductIds)) {
    const insertBundle = sqlite.prepare('INSERT INTO product_bundle_items (bundle_id, product_id) VALUES (?, ?)');
    for (const pid of bundleProductIds) {
      insertBundle.run(productId, pid);
    }
  }

  // 插入等级价格
  if (prices) {
    for (const [level, info] of Object.entries(prices as Record<string, any>)) {
      sqlite.prepare('INSERT INTO product_prices (product_id,level,price,discount) VALUES (?,?,?,?)').run(
        productId, level, info.price, info.discount || null
      );
    }
  } else {
    // 默认折扣
    const defaultDiscounts: Record<string, number> = { guest: 1.0, member: 0.9, silver: 0.8, gold: 0.7, diamond: 0.6 };
    for (const [level, d] of Object.entries(defaultDiscounts)) {
      sqlite.prepare('INSERT INTO product_prices (product_id,level,price,discount) VALUES (?,?,?,?)').run(
        productId, level, Math.round(basePrice * d * 100) / 100, d
      );
    }
  }
  res.json({ success: true, productId });
});

// 获取单个商品详情
router.get('/products/:id', permissionMiddleware('products'), (req: Request, res: Response) => {
  const product = sqlite.prepare(`
    SELECT p.*, c.name as category_name
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.id = ?
  `).get(req.params.id) as any;
  if (!product) {
    res.status(404).json({ error: '商品不存在' });
    return;
  }
  const prices = sqlite.prepare('SELECT level, price, discount FROM product_prices WHERE product_id = ?').all(product.id) as any[];
  const priceMap: Record<string, any> = {};
  prices.forEach((p: any) => { priceMap[p.level] = p; });
  let bundleProductIds: number[] = [];
  if (product.is_bundle) {
    const bItems = sqlite.prepare('SELECT product_id FROM product_bundle_items WHERE bundle_id = ?').all(product.id) as any[];
    bundleProductIds = bItems.map((b: any) => b.product_id);
  }
  const ingItems = sqlite.prepare('SELECT ingredient_id FROM product_ingredients WHERE product_id = ?').all(product.id) as any[];
  const ingredientIds = ingItems.map((i: any) => i.ingredient_id);

  res.json({ 
    ...product, 
    images: product.images ? JSON.parse(product.images) : [], 
    tags: product.tags ? JSON.parse(product.tags) : [], 
    skin_types: product.skin_types ? JSON.parse(product.skin_types) : [],
    concerns: product.concerns ? JSON.parse(product.concerns) : [],
    dosage_forms: product.dosage_forms ? JSON.parse(product.dosage_forms) : [],
    before_after_images: product.before_after_images ? JSON.parse(product.before_after_images) : [],
    prices: priceMap, 
    bundleProductIds,
    ingredientIds
  });
});

// 更新商品
router.put('/products/:id', permissionMiddleware('products'), (req: Request, res: Response) => {
  const { name, description, detail, categoryId, basePrice, pointsPrice, stock, unit, isActive, prices, mainImage, images, sortOrder, tags, isBundle, bundleProductIds, skinTypes, concerns, dosageForms, beforeAfterImages, ingredientIds, isSample, isStoryPage, isFeatured, translations } = req.body;
  const oldProduct = sqlite.prepare('SELECT stock FROM products WHERE id = ?').get(req.params.id) as any;
  const imagesStr = images ? (typeof images === 'string' ? images : JSON.stringify(images)) : null;
  const tagsStr = tags ? (typeof tags === 'string' ? tags : JSON.stringify(tags)) : null;
  const skinTypesStr = skinTypes ? (typeof skinTypes === 'string' ? skinTypes : JSON.stringify(skinTypes)) : null;
  const concernsStr = concerns ? (typeof concerns === 'string' ? concerns : JSON.stringify(concerns)) : null;
  const dosageFormsStr = dosageForms ? (typeof dosageForms === 'string' ? dosageForms : JSON.stringify(dosageForms)) : null;
  const beforeAfterStr = beforeAfterImages ? (typeof beforeAfterImages === 'string' ? beforeAfterImages : JSON.stringify(beforeAfterImages)) : null;
  const bundleFlag = isBundle ? 1 : 0;
  const sampleFlag = isSample ? 1 : 0;
  const storyFlag = isStoryPage ? 1 : 0;
  const featuredFlag = isFeatured ? 1 : 0;
  const transStr = translations ? (typeof translations === 'string' ? translations : JSON.stringify(translations)) : null;
  const now = Date.now();
  sqlite.prepare(`UPDATE products SET name=?,description=?,detail=?,category_id=?,base_price=?,points_price=?,stock=?,unit=?,main_image=?,images=?,is_active=?,sort_order=?,is_featured=?,tags=?,is_bundle=?,skin_types=?,concerns=?,dosage_forms=?,before_after_images=?,is_sample=?,is_story_page=?,translations=?,updated_at=? WHERE id=?`).run(
    name, description, detail || null, categoryId, basePrice, pointsPrice || null, stock, unit, mainImage || null, imagesStr, isActive ? 1 : 0, sortOrder || 0, featuredFlag, tagsStr, bundleFlag, skinTypesStr, concernsStr, dosageFormsStr, beforeAfterStr, sampleFlag, storyFlag, transStr, now, req.params.id
  );
  
  if (isBundle && bundleProductIds && Array.isArray(bundleProductIds)) {
    sqlite.prepare('DELETE FROM product_bundle_items WHERE bundle_id = ?').run(req.params.id);
    const insertBundle = sqlite.prepare('INSERT INTO product_bundle_items (bundle_id, product_id) VALUES (?, ?)');
    for (const pid of bundleProductIds) {
      insertBundle.run(req.params.id, pid);
    }
  }

  // 更新成分关联
  if (ingredientIds && Array.isArray(ingredientIds)) {
    sqlite.prepare('DELETE FROM product_ingredients WHERE product_id = ?').run(req.params.id);
    const insertIng = sqlite.prepare('INSERT INTO product_ingredients (product_id, ingredient_id) VALUES (?, ?)');
    for (const iid of ingredientIds) {
      insertIng.run(req.params.id, iid);
    }
  }
  if (prices) {
    for (const [level, info] of Object.entries(prices as Record<string, any>)) {
      const existing = sqlite.prepare('SELECT id FROM product_prices WHERE product_id=? AND level=?').get(req.params.id, level);
      if (existing) {
        sqlite.prepare('UPDATE product_prices SET price=?,discount=? WHERE product_id=? AND level=?').run((info as any).price, (info as any).discount, req.params.id, level);
      } else {
        sqlite.prepare('INSERT INTO product_prices (product_id,level,price,discount) VALUES (?,?,?,?)').run(req.params.id, level, (info as any).price, (info as any).discount);
      }
    }
  }

  // Phase 3: 到货提醒检查
  if (oldProduct && oldProduct.stock <= 0 && stock > 0) {
    const settings = sqlite.prepare("SELECT value FROM site_settings WHERE key = 'feature_restock_notify'").get() as any;
    if (settings && settings.value === '1') {
      const requests = sqlite.prepare("SELECT id, email FROM restock_requests WHERE product_id = ? AND status = 'pending'").all(req.params.id) as any[];
      if (requests.length > 0) {
        // 模拟发送邮件
        console.log(`[Notification] 商品 ${name} 已补货，准备向 ${requests.length} 位用户发送提醒邮件。`);
        requests.forEach(reqObj => {
          console.log(`[Notification] Sending to ${reqObj.email}...`);
          sqlite.prepare("UPDATE restock_requests SET status = 'notified', notified_at = ? WHERE id = ?").run(now, reqObj.id);
        });
      }
    }
  }

  res.json({ success: true });
});

// 快捷编辑商品排序与推荐状态
router.patch('/products/:id/quick-edit', permissionMiddleware('products'), (req: Request, res: Response) => {
  const { sortOrder, isFeatured } = req.body;
  const updates = [];
  const params = [];
  if (sortOrder !== undefined) {
    updates.push('sort_order = ?');
    params.push(parseInt(sortOrder) || 0);
  }
  if (isFeatured !== undefined) {
    updates.push('is_featured = ?');
    params.push(isFeatured ? 1 : 0);
  }
  if (updates.length > 0) {
    params.push(Date.now(), req.params.id);
    sqlite.prepare(`UPDATE products SET ${updates.join(', ')}, updated_at = ? WHERE id = ?`).run(...params);
  }
  res.json({ success: true });
});

// 删除商品
router.delete('/products/:id', permissionMiddleware('products'), (req: Request, res: Response) => {
  sqlite.prepare('UPDATE products SET is_active=0,updated_at=? WHERE id=?').run(Date.now(), req.params.id);
  res.json({ success: true });
});

// ========== 订单管理（需 orders 权限） ==========
router.get('/orders', permissionMiddleware('orders'), (req: Request, res: Response) => {
  const { page = '1', limit = '20', status, keyword } = req.query;
  const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
  let where = '1=1';
  const params: any[] = [];
  if (status && status !== 'all') { where += ' AND o.status = ?'; params.push(status); }
  if (keyword) { where += ' AND (o.order_no LIKE ? OR o.recipient_name LIKE ?)'; params.push(`%${keyword}%`, `%${keyword}%`); }

  const orders = sqlite.prepare(`
    SELECT o.*, u.name as user_name, u.email as user_email
    FROM orders o JOIN users u ON o.user_id = u.id
    WHERE ${where} ORDER BY o.created_at DESC LIMIT ? OFFSET ?
  `).all(...params, parseInt(limit as string), offset) as any[];

  const enriched = orders.map((o: any) => ({
    ...o,
    items: sqlite.prepare('SELECT * FROM order_items WHERE order_id=?').all(o.id)
  }));

  const total = (sqlite.prepare(`SELECT COUNT(*) as c FROM orders o JOIN users u ON o.user_id=u.id WHERE ${where}`).get(...params) as any).c;
  res.json({ orders: enriched, total });
});

// 更新订单状态
router.put('/orders/:id/status', permissionMiddleware('orders'), (req: Request, res: Response) => {
  const { status } = req.body;
  const validStatus = ['processing', 'shipped', 'delivered', 'cancelled', 'refunded'];
  if (!validStatus.includes(status)) {
    res.status(400).json({ error: '无效状态' });
    return;
  }
  sqlite.prepare('UPDATE orders SET status=?,updated_at=? WHERE id=?').run(status, Date.now(), req.params.id);
  res.json({ success: true });
});

// 订单发货
router.put('/orders/:id/ship', permissionMiddleware('orders'), (req: Request, res: Response) => {
  const { trackingCompany, trackingNumber } = req.body;
  
  if (!trackingCompany || !trackingNumber) {
    res.status(400).json({ error: '物流公司和物流单号不能为空' });
    return;
  }

  sqlite.prepare(`
    UPDATE orders 
    SET status = 'shipped', tracking_company = ?, tracking_number = ?, updated_at = ?
    WHERE id = ?
  `).run(trackingCompany, trackingNumber, Date.now(), req.params.id);
  
  res.json({ success: true });
});

// 删除订单（仅限已取消）
router.delete('/orders/:id', permissionMiddleware('orders'), (req: Request, res: Response) => {
  const orderId = req.params.id;
  const order = sqlite.prepare('SELECT status FROM orders WHERE id=?').get(orderId) as any;
  if (!order) {
    res.status(404).json({ error: '订单不存在' });
    return;
  }
  if (order.status !== 'cancelled') {
    res.status(400).json({ error: '只能删除已取消的订单' });
    return;
  }

  const deleteTx = sqlite.transaction(() => {
    sqlite.prepare('DELETE FROM order_items WHERE order_id=?').run(orderId);
    sqlite.prepare('DELETE FROM payment_logs WHERE order_id=?').run(orderId);
    sqlite.prepare('DELETE FROM reviews WHERE order_id=?').run(orderId);
    sqlite.prepare('DELETE FROM orders WHERE id=?').run(orderId);
  });

  try {
    deleteTx();
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: '删除失败: ' + e.message });
  }
});

// ========== 网站设置管理（需 settings 权限） ==========
// 获取所有设置
router.get('/settings', permissionMiddleware('settings', 'marketing', 'articles', 'ai'), (_req: Request, res: Response) => {
  const settings = sqlite.prepare('SELECT key, value, description, translations FROM site_settings ORDER BY id').all() as any[];
  const map: Record<string, string> = {};
  settings.forEach(s => { 
    map[s.key] = s.value; 
  });
  res.json({ settings, map });
});

// 更新单个设置
router.put('/settings/:key', permissionMiddleware('settings', 'marketing', 'articles', 'ai'), (req: Request, res: Response) => {
  const { value, translations } = req.body;
  if (value === undefined) { res.status(400).json({ error: 'value required' }); return; }
  
  const transStr = translations ? (typeof translations === 'string' ? translations : JSON.stringify(translations)) : null;

  console.log(`[DEBUG] PUT /settings/${req.params.key} value=${value} translations=${transStr}`);

  if (transStr !== null) {
    sqlite.prepare(`
      INSERT INTO site_settings (key, value, translations, updated_at) 
      VALUES (?, ?, ?, ?) 
      ON CONFLICT(key) DO UPDATE SET value=excluded.value, translations=excluded.translations, updated_at=excluded.updated_at
    `).run(req.params.key, String(value), transStr, Date.now());
  } else {
    sqlite.prepare(`
      INSERT INTO site_settings (key, value, updated_at) 
      VALUES (?, ?, ?) 
      ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at
    `).run(req.params.key, String(value), Date.now());
  }
  res.json({ success: true });
});

// 批量更新设置
router.put('/settings', permissionMiddleware('settings', 'marketing', 'articles', 'ai'), (req: Request, res: Response) => {
  const { settings } = req.body; // { key: value, ... }
  if (!settings || typeof settings !== 'object') { res.status(400).json({ error: 'settings object required' }); return; }
  const now = Date.now();
  const stmt = sqlite.prepare(`
    INSERT INTO site_settings (key, value, updated_at) 
    VALUES (?, ?, ?) 
    ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at
  `);
  for (const [key, value] of Object.entries(settings as Record<string, any>)) {
    stmt.run(key, String(value), now);
  }
  res.json({ success: true });
});

// ========== 支付配置管理（需 settings 权限） ==========
// 获取支付配置（敏感字段掩码处理）
router.get('/payment-settings', permissionMiddleware('settings'), (_req: Request, res: Response) => {
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
router.put('/payment-settings', permissionMiddleware('settings'), (req: Request, res: Response) => {
  const { settings } = req.body;
  if (!settings || typeof settings !== 'object') {
    res.status(400).json({ error: 'settings 对象必填' });
    return;
  }

  const sensitiveKeys = ['wechat_api_key_v3', 'alipay_private_key', 'alipay_public_key'];
  const toSave: Record<string, string> = {};

  for (const [key, value] of Object.entries(settings as Record<string, string>)) {
    if (sensitiveKeys.includes(key)) {
      // 如果值包含 **** 说明是掩码值（用户没改），保持原值（跳过更新）
      if (String(value).includes('****')) continue;
    }
    toSave[key] = String(value);
  }

  try {
    PaymentConfig.savePaymentSettings(toSave);
    res.json({ success: true, message: '支付配置保存成功', paymentMode: PaymentConfig.getPaymentMode() });
  } catch (e: any) {
    res.status(500).json({ error: '保存失败: ' + e.message });
  }
});

// ========== 弃单挽回系统 (Phase 3) ==========
router.post('/abandoned-cart/recover', permissionMiddleware('orders'), (req: Request, res: Response) => {
  const settings = sqlite.prepare("SELECT value FROM site_settings WHERE key = 'feature_abandoned_cart'").get() as any;
  if (!settings || settings.value !== '1') {
    res.status(403).json({ error: '弃单挽回功能未开启' });
    return;
  }

  // 扫描 pending 状态，且超过 2 小时未支付的订单
  const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
  const abandonedOrders = sqlite.prepare(`
    SELECT o.id, o.order_no, o.user_id, u.email 
    FROM orders o
    JOIN users u ON o.user_id = u.id
    WHERE o.status = 'pending' AND o.created_at < ?
  `).all(twoHoursAgo) as any[];

  if (abandonedOrders.length === 0) {
    res.json({ success: true, message: '未发现待挽回弃单', recoveredCount: 0 });
    return;
  }

  // 模拟发送挽回邮件
  let recoveredCount = 0;
  for (const order of abandonedOrders) {
    console.log(`[Abandoned Cart] 发现弃单 ${order.order_no}，正在向 ${order.email} 发送挽回邮件...`);
    
    // 这里为了演示挽回效果，直接给用户加上 50 积分
    sqlite.prepare('UPDATE users SET points = points + 50 WHERE id = ?').run(order.user_id);
    sqlite.prepare('INSERT INTO points_history (user_id, amount, type, description, created_at) VALUES (?, ?, ?, ?, ?)').run(
      order.user_id, 50, 'admin_adjust', `弃单挽回系统 - 限时付款奖励`, Date.now()
    );
    recoveredCount++;
  }

  res.json({ success: true, message: `成功向 ${recoveredCount} 位用户发送了弃单挽回邮件与积分奖励`, recoveredCount });
});

export default router;
