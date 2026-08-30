import { db, sqlite } from './index';
import bcrypt from 'bcryptjs';

export async function initDB() {
  // 建表 SQL (直接用 better-sqlite3 执行)
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      phone TEXT,
      avatar TEXT,
      level TEXT NOT NULL DEFAULT 'member' CHECK(level IN ('guest','member','silver','gold','diamond','staff','admin')),
      points INTEGER NOT NULL DEFAULT 0,
      total_spend REAL NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER,
      updated_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      description TEXT,
      image TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER REFERENCES categories(id),
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      description TEXT,
      detail TEXT,
      main_image TEXT,
      images TEXT,
      base_price REAL NOT NULL,
      stock INTEGER NOT NULL DEFAULT 0,
      unit TEXT DEFAULT '件',
      tags TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_featured INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER,
      updated_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS product_prices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL REFERENCES products(id),
      level TEXT NOT NULL CHECK(level IN ('guest','member','silver','gold','diamond')),
      price REAL NOT NULL,
      discount REAL
    );

    CREATE TABLE IF NOT EXISTS cart_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      product_id INTEGER NOT NULL REFERENCES products(id),
      quantity INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_no TEXT NOT NULL UNIQUE,
      user_id INTEGER NOT NULL REFERENCES users(id),
      user_level TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      total_amount REAL NOT NULL,
      discount_amount REAL NOT NULL DEFAULT 0,
      pay_amount REAL NOT NULL,
      pay_method TEXT,
      pay_time INTEGER,
      trade_no TEXT,
      recipient_name TEXT NOT NULL,
      recipient_phone TEXT NOT NULL,
      address TEXT NOT NULL,
      remark TEXT,
      created_at INTEGER,
      updated_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL REFERENCES orders(id),
      product_id INTEGER NOT NULL REFERENCES products(id),
      product_name TEXT NOT NULL,
      product_image TEXT,
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      subtotal REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS addresses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      province TEXT NOT NULL,
      city TEXT NOT NULL,
      district TEXT NOT NULL,
      address TEXT NOT NULL,
      is_default INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS favorites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      product_id INTEGER NOT NULL REFERENCES products(id),
      created_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      product_id INTEGER NOT NULL REFERENCES products(id),
      order_id INTEGER NOT NULL REFERENCES orders(id),
      rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
      content TEXT DEFAULT '',
      is_visible INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS site_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT NOT NULL UNIQUE,
      value TEXT,
      description TEXT,
      updated_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS payment_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL REFERENCES orders(id),
      channel TEXT NOT NULL,
      trade_no TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      amount REAL NOT NULL,
      raw_notify TEXT,
      created_at INTEGER,
      updated_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS articles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      content TEXT NOT NULL,
      cover_image TEXT,
      status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('published','draft')),
      is_ai_generated INTEGER NOT NULL DEFAULT 0,
      keywords TEXT,
      published_at INTEGER,
      created_at INTEGER,
      updated_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS site_visits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ip TEXT NOT NULL,
      user_id INTEGER REFERENCES users(id),
      date TEXT NOT NULL,
      created_at INTEGER,
      UNIQUE(ip, date, user_id)
    );

    CREATE TABLE IF NOT EXISTS skin_analysis_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id),
      image_url TEXT NOT NULL,
      result_data TEXT NOT NULL,
      created_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS user_behavior_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      user_id INTEGER REFERENCES users(id),
      action_type TEXT NOT NULL CHECK(action_type IN ('page_view', 'product_click', 'add_to_cart')),
      path TEXT NOT NULL,
      product_id INTEGER REFERENCES products(id),
      dwell_time INTEGER DEFAULT 0,
      created_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS clinical_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      summary TEXT,
      cover_image TEXT,
      pdf_url TEXT,
      status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('published','draft')),
      translations TEXT,
      published_at INTEGER,
      created_at INTEGER,
      updated_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS skin_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      translations TEXT
    );

    CREATE TABLE IF NOT EXISTS skin_concerns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      translations TEXT
    );

    CREATE TABLE IF NOT EXISTS dosage_forms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      translations TEXT
    );
  `);

  // 迁移：添加页面内容设置
  try {
    const pageSettings = [
      { key: 'page_about', value: '<h2>关于传诗奇</h2><p>传诗奇（TRASOCHY）是中国领先的院线护肤品牌，专注于为每一位爱美者提供专业、安全、高效的护肤方案。</p><p>我们深耕院线护肤领域多年，将前沿生物科技与传统草本精华完美融合，以院线级标准打造每一款产品。</p><h3>品牌理念</h3><p>科学护肤，臻致美肌。传诗奇坚信真正的美丽源于科学的力量与自然的馈赠。</p>', description: '关于我们页面内容' },
      { key: 'page_contact', value: '<h2>联系我们</h2><p>如有任何问题或建议，欢迎通过以下方式联系我们：</p><h3>客服热线</h3><p>400-888-8888</p><p>工作时间：周一至周日 9:00-21:00</p><h3>电子邮箱</h3><p>service@trasochy.com</p><h3>公司地址</h3><p>中国·广州市天河区</p>', description: '联系方式页面内容' },
      { key: 'page_delivery', value: '<h2>配送说明</h2><h3>配送范围</h3><p>我们支持全国范围配送（港澳台地区暂不支持）。</p><h3>配送方式</h3><p>默认顺丰快递，下单后48小时内发货。</p><h3>配送费用</h3><p>订单满199元免运费，未满199元收取10元运费。</p><h3>收货须知</h3><p>请确保收货地址和联系方式准确无误。签收时请当面验货，如有问题请立即联系客服。</p>', description: '配送说明页面内容' },
      { key: 'page_privacy', value: '<h2>隐私政策</h2><p>传诗奇高度重视用户隐私保护。本隐私政策说明了我们如何收集、使用、存储和保护您的个人信息。</p><h3>信息收集</h3><p>我们仅收集为您提供服务所必需的个人信息，包括姓名、联系方式、收货地址等。</p><h3>信息使用</h3><p>您的信息仅用于订单处理、配送服务及改善用户体验，我们不会将您的个人信息出售或分享给第三方。</p><h3>信息安全</h3><p>我们采用行业标准的加密技术和安全措施保护您的个人信息。</p>', description: '隐私政策页面内容' },
    ];
    const insertSetting = sqlite.prepare('INSERT OR IGNORE INTO site_settings (key, value, description, updated_at) VALUES (?,?,?,?)');
    const now = Date.now();
    for (const s of pageSettings) {
      insertSetting.run(s.key, s.value, s.description, now);
    }
    console.log('[DB] Page content settings added');
  } catch (e: any) {
    console.log('[DB] Page content settings migration skipped:', e.message);
  }
  console.log('[DB] Tables created/verified');

  // 迁移：给已有 products 表添加 detail 列
  try {
    sqlite.exec(`ALTER TABLE products ADD COLUMN detail TEXT`);
    console.log('[DB] Column detail added to products');
  } catch (e: any) {
    if (!e.message.includes('duplicate column')) console.log('[DB] detail column already exists or skipped:', e.message);
  }

  // 迁移：给 orders 表添加 coupon_code 列（代金券功能）
  try {
    sqlite.exec(`ALTER TABLE orders ADD COLUMN coupon_code TEXT`);
    console.log('[DB] Column coupon_code added to orders');
  } catch (e: any) {
    if (!e.message.includes('duplicate column')) console.log('[DB] coupon_code column already exists or skipped:', e.message);
  }

  // 迁移：给 orders 表添加 gift_wrap_fee 列（如已有旧数据库）
  try {
    sqlite.exec(`ALTER TABLE orders ADD COLUMN gift_wrap_fee REAL NOT NULL DEFAULT 0`);
    console.log('[DB] Column gift_wrap_fee added to orders');
  } catch (e: any) {
    if (!e.message.includes('duplicate column')) console.log('[DB] gift_wrap_fee column already exists or skipped:', e.message);
  }

  // 迁移：添加 translations 列支持多语言
  const tablesWithTranslations = ['categories', 'products', 'ingredients', 'articles', 'site_settings'];
  for (const table of tablesWithTranslations) {
    try {
      sqlite.exec(`ALTER TABLE ${table} ADD COLUMN translations TEXT`);
      console.log(`[DB] Column translations added to ${table}`);
    } catch (e: any) {
      if (!e.message.includes('duplicate column')) console.log(`[DB] translations column already exists in ${table} or skipped:`, e.message);
    }
  }

  // 迁移：给 users 表添加 permissions 列
  try {
    sqlite.exec(`ALTER TABLE users ADD COLUMN permissions TEXT`);
    console.log('[DB] Column permissions added to users');
  } catch (e: any) {
    if (!e.message.includes('duplicate column')) console.log('[DB] permissions column already exists or skipped:', e.message);
  }

  // 迁移：给 users 表添加 partner_tier 列
  try {
    sqlite.exec(`ALTER TABLE users ADD COLUMN partner_tier TEXT`);
    console.log('[DB] Column partner_tier added to users');
  } catch (e: any) {
    if (!e.message.includes('duplicate column')) console.log('[DB] partner_tier column already exists or skipped:', e.message);
  }

  // 迁移：给 users 表添加 pro_test_limit 列
  try {
    sqlite.exec(`ALTER TABLE users ADD COLUMN pro_test_limit INTEGER NOT NULL DEFAULT 4`);
    console.log('[DB] Column pro_test_limit added to users');
  } catch (e: any) {
    if (!e.message.includes('duplicate column')) console.log('[DB] pro_test_limit column skipped:', e.message);
  }

  // 迁移：给 users 表添加 username 列（用户名注册，可为 NULL 兼容旧邮箱/手机用户）
  try {
    sqlite.exec(`ALTER TABLE users ADD COLUMN username TEXT`);
    console.log('[DB] Column username added to users');
  } catch (e: any) {
    if (!e.message.includes('duplicate column')) console.log('[DB] username column already exists or skipped:', e.message);
  }
  // 建唯一索引（忽略 NULL，SQLite UNIQUE 索引天然对 NULL 不去重，但不同 NULL 互不冲突）
  try {
    sqlite.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users (username) WHERE username IS NOT NULL`);
    console.log('[DB] Unique index idx_users_username created');
  } catch (e: any) {
    console.log('[DB] idx_users_username index skipped:', e.message);
  }

  // 迁移：给 skin_analysis_records 表添加 type 列
  try {
    sqlite.exec(`ALTER TABLE skin_analysis_records ADD COLUMN type TEXT NOT NULL DEFAULT 'basic'`);
    console.log('[DB] Column type added to skin_analysis_records');
  } catch (e: any) {
    if (!e.message.includes('duplicate column')) console.log('[DB] type column skipped:', e.message);
  }

  // 迁移：创建 ai_chat_logs 表
  try {
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS ai_chat_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        question TEXT NOT NULL,
        answer TEXT NOT NULL,
        is_modified INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);
    console.log('[DB] ai_chat_logs table ensured');
  } catch (e: any) {
    console.log('[DB] Error creating ai_chat_logs table:', e.message);
  }

  // 迁移：给 products 表添加 is_bundle 列，并创建 product_bundle_items 表
  try {
    sqlite.exec(`ALTER TABLE products ADD COLUMN is_bundle INTEGER NOT NULL DEFAULT 0`);
    console.log('[DB] Column is_bundle added to products');
  } catch (e: any) {
    if (!e.message.includes('duplicate column')) console.log('[DB] is_bundle column already exists or skipped:', e.message);
  }

  try {
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS product_bundle_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        bundle_id INTEGER NOT NULL REFERENCES products(id),
        product_id INTEGER NOT NULL REFERENCES products(id),
        quantity INTEGER NOT NULL DEFAULT 1
      );
    `);
    console.log('[DB] Table product_bundle_items created/verified');
  } catch (e: any) {
    console.log('[DB] product_bundle_items creation skipped:', e.message);
  }

  // 迁移：更新 users 表 level CHECK 约束（SQLite不支持ALTER CHECK，重建表）
  try {
    // 先检查当前表的CHECK约束是否允许staff
    const testInsert = sqlite.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='users'").get() as any;
    if (testInsert && testInsert.sql && testInsert.sql.includes("'staff'")) {
      console.log('[DB] Users table already supports staff level');
    } else {
      // 需要重建表，先禁用外键约束
      sqlite.exec('PRAGMA foreign_keys = OFF');
      sqlite.exec(`
        CREATE TABLE IF NOT EXISTS users_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          email TEXT NOT NULL UNIQUE,
          password TEXT NOT NULL,
          name TEXT NOT NULL,
          phone TEXT,
          avatar TEXT,
          level TEXT NOT NULL DEFAULT 'member' CHECK(level IN ('guest','member','silver','gold','staff','admin')),
          permissions TEXT,
          points INTEGER NOT NULL DEFAULT 0,
          total_spend REAL NOT NULL DEFAULT 0,
          is_active INTEGER NOT NULL DEFAULT 1,
          created_at INTEGER,
          updated_at INTEGER
        );
        INSERT OR IGNORE INTO users_new SELECT id,email,password,name,phone,avatar,level,permissions,points,total_spend,is_active,created_at,updated_at FROM users;
        DROP TABLE users;
        ALTER TABLE users_new RENAME TO users;
      `);
      sqlite.exec('PRAGMA foreign_keys = ON');
      console.log('[DB] Users table recreated with staff level support');
    }
  } catch (e: any) {
    console.log('[DB] Users table migration skipped:', e.message);
  }

  // 迁移：更新 users 表再次支持 diamond 等级
  try {
    const testInsert = sqlite.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='users'").get() as any;
    if (testInsert && testInsert.sql && testInsert.sql.includes("'diamond'")) {
      console.log('[DB] Users table already supports diamond level');
    } else {
      sqlite.exec('PRAGMA foreign_keys = OFF');
      sqlite.exec(`
        CREATE TABLE IF NOT EXISTS users_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          email TEXT NOT NULL UNIQUE,
          password TEXT NOT NULL,
          name TEXT NOT NULL,
          phone TEXT,
          avatar TEXT,
          level TEXT NOT NULL DEFAULT 'member' CHECK(level IN ('guest','member','silver','gold','diamond','staff','admin')),
          permissions TEXT,
          points INTEGER NOT NULL DEFAULT 0,
          total_spend REAL NOT NULL DEFAULT 0,
          is_active INTEGER NOT NULL DEFAULT 1,
          created_at INTEGER,
          updated_at INTEGER,
          referral_code TEXT,
          referred_by INTEGER,
          partner_tier TEXT
        );
        INSERT OR IGNORE INTO users_new SELECT id,email,password,name,phone,avatar,level,permissions,points,total_spend,is_active,created_at,updated_at,referral_code,referred_by,partner_tier FROM users;
        DROP TABLE users;
        ALTER TABLE users_new RENAME TO users;
      `);
      sqlite.exec('PRAGMA foreign_keys = ON');
      console.log('[DB] Users table recreated with diamond level support');
    }
  } catch (e: any) {
    console.log('[DB] Users table diamond migration skipped:', e.message);
  }

  // 迁移：更新 product_prices 表支持 diamond 等级
  try {
    const testInsert = sqlite.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='product_prices'").get() as any;
    if (testInsert && testInsert.sql && testInsert.sql.includes("'diamond'")) {
      console.log('[DB] product_prices table already supports diamond level');
    } else {
      sqlite.exec('PRAGMA foreign_keys = OFF');
      sqlite.exec(`
        CREATE TABLE IF NOT EXISTS product_prices_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          product_id INTEGER NOT NULL REFERENCES products(id),
          level TEXT NOT NULL CHECK(level IN ('guest','member','silver','gold','diamond')),
          price REAL NOT NULL,
          discount REAL
        );
        INSERT OR IGNORE INTO product_prices_new SELECT id,product_id,level,price,discount FROM product_prices;
        DROP TABLE product_prices;
        ALTER TABLE product_prices_new RENAME TO product_prices;
      `);
      sqlite.exec('PRAGMA foreign_keys = ON');
      console.log('[DB] product_prices table recreated with diamond level support');
      
      // 添加历史商品的diamond价格（基于gold或者base_price）
      const missingPrices = sqlite.prepare(`
        SELECT p.id as product_id, p.base_price 
        FROM products p 
        WHERE NOT EXISTS (SELECT 1 FROM product_prices pp WHERE pp.product_id = p.id AND pp.level = 'diamond')
      `).all() as any[];
      
      const insertDiamond = sqlite.prepare(`INSERT INTO product_prices (product_id, level, price, discount) VALUES (?, 'diamond', ?, 0.6)`);
      for (const p of missingPrices) {
        insertDiamond.run(p.product_id, Math.round(p.base_price * 0.6 * 100) / 100);
      }
      console.log(`[DB] Inserted diamond prices for ${missingPrices.length} products`);
    }
  } catch (e: any) {
    console.log('[DB] product_prices table diamond migration skipped:', e.message);
  }

  // 迁移：添加支付配置种子数据
  try {
    const now = Date.now();
    const paymentSettings = [
      { key: 'payment_mode', value: 'mock', description: '支付模式: mock(模拟)/sandbox(沙箱)/production(生产)' },
      { key: 'wechat_app_id', value: '', description: '微信支付AppID' },
      { key: 'wechat_mch_id', value: '', description: '微信支付商户号' },
      { key: 'wechat_api_key_v3', value: '', description: '微信支付API密钥V3' },
      { key: 'wechat_cert_path', value: './certs/apiclient_cert.pem', description: '微信支付证书路径(apiclient_cert.pem)' },
      { key: 'wechat_key_path', value: './certs/apiclient_key.pem', description: '微信支付私钥路径(apiclient_key.pem)' },
      { key: 'wechat_serial_no', value: '', description: '微信支付证书序列号' },
      { key: 'wechat_notify_url', value: 'https://www.trasochy.com/api/payment/wechat/notify', description: '微信支付回调地址' },
      { key: 'alipay_app_id', value: '', description: '支付宝AppID' },
      { key: 'alipay_private_key', value: '', description: '支付宝应用私钥' },
      { key: 'alipay_public_key', value: '', description: '支付宝公钥' },
      { key: 'alipay_notify_url', value: 'https://www.trasochy.com/api/payment/alipay/notify', description: '支付宝回调地址' },
      { key: 'alipay_gateway', value: 'https://openapi.alipay.com/gateway.do', description: '支付宝网关地址' },
      { key: 'stripe_public_key', value: '', description: 'Stripe (Visa/Mastercard) 公钥' },
      { key: 'stripe_secret_key', value: '', description: 'Stripe (Visa/Mastercard) 密钥' },
      { key: 'paypal_client_id', value: '', description: 'PayPal Client ID' },
      { key: 'paypal_client_secret', value: '', description: 'PayPal Secret' },
      { key: 'wechat_enabled', value: '1', description: '是否启用微信支付' },
      { key: 'alipay_enabled', value: '1', description: '是否启用支付宝' },
      { key: 'stripe_enabled', value: '1', description: '是否启用Stripe' },
      { key: 'paypal_enabled', value: '1', description: '是否启用PayPal' },
    ];
    const insertPaymentSetting = sqlite.prepare('INSERT OR IGNORE INTO site_settings (key, value, description, updated_at) VALUES (?,?,?,?)');
    for (const s of paymentSettings) {
      insertPaymentSetting.run(s.key, s.value, s.description, now);
    }
    console.log('[DB] Payment settings added');
  } catch (e: any) {
    console.log('[DB] Payment settings migration skipped:', e.message);
  }

  // 迁移：添加SEO设置
  try {
    const seoSettings = [
      { key: 'seo_title', value: '传诗奇 TRASOCHY - 中国院线护肤专家', description: '全局 SEO 标题' },
      { key: 'seo_keywords', value: '传诗奇,TRASOCHY,护肤品,院线护肤,精华,面膜', description: '全局 SEO 关键词' },
      { key: 'seo_description', value: '传诗奇（TRASOCHY）是中国领先的院线护肤品牌，为您提供专业、安全、高效的护肤方案。', description: '全局 SEO 描述' },
      { key: 'global_seo_keywords', value: '传诗奇,院线护肤,抗老精华,敏感肌修复,高端护肤品,抗初老,美白淡斑,紧致提拉', description: 'AI分析生成的全局SEO曝光关键词库(标签库)' },
    ];
    const insertSetting = sqlite.prepare('INSERT OR IGNORE INTO site_settings (key, value, description, updated_at) VALUES (?,?,?,?)');
    const now = Date.now();
    for (const s of seoSettings) {
      insertSetting.run(s.key, s.value, s.description, now);
    }
    console.log('[DB] SEO settings added');
  } catch (e: any) {
    console.log('[DB] SEO settings migration skipped:', e.message);
  }

  // 迁移：积分与推荐系统相关字段和表
  try {
    sqlite.exec(`ALTER TABLE users ADD COLUMN referral_code TEXT`);
    console.log('[DB] Column referral_code added to users');
  } catch (e: any) {
    if (!e.message.includes('duplicate column')) console.log('[DB] referral_code column skipped:', e.message);
  }

  try {
    sqlite.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code);`);
  } catch (e: any) {
    console.log('[DB] referral_code index skipped:', e.message);
  }

  try {
    sqlite.exec(`ALTER TABLE users ADD COLUMN referred_by INTEGER`);
    console.log('[DB] Column referred_by added to users');
  } catch (e: any) {
    if (!e.message.includes('duplicate column')) console.log('[DB] referred_by column skipped:', e.message);
  }

  try {
    sqlite.exec(`ALTER TABLE products ADD COLUMN points_price INTEGER`);
    console.log('[DB] Column points_price added to products');
  } catch (e: any) {
    if (!e.message.includes('duplicate column')) console.log('[DB] points_price column skipped:', e.message);
  }

  try {
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS points_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id),
        amount INTEGER NOT NULL,
        type TEXT NOT NULL,
        description TEXT NOT NULL,
        created_at INTEGER
      );
    `);
    console.log('[DB] Table points_history created/verified');
  } catch (e: any) {
    console.log('[DB] points_history creation skipped:', e.message);
  }

  // 迁移：新增成分相关表
  try {
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS ingredients (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        inci_name TEXT,
        description TEXT,
        benefits TEXT
      );
      CREATE TABLE IF NOT EXISTS product_ingredients (
        product_id INTEGER NOT NULL REFERENCES products(id),
        ingredient_id INTEGER NOT NULL REFERENCES ingredients(id),
        PRIMARY KEY (product_id, ingredient_id)
      );
    `);
    console.log('[DB] Table ingredients and product_ingredients created/verified');
  } catch (e: any) {
    console.log('[DB] ingredients creation skipped:', e.message);
  }

  // 迁移：新增 Phase 3 的定期订阅表和到货提醒表
  try {
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id),
        product_id INTEGER NOT NULL REFERENCES products(id),
        status TEXT NOT NULL DEFAULT 'active',
        frequency_days INTEGER NOT NULL DEFAULT 30,
        discount_percent REAL NOT NULL DEFAULT 0.9,
        next_deliver_date INTEGER NOT NULL,
        created_at INTEGER,
        updated_at INTEGER
      );
      CREATE TABLE IF NOT EXISTS restock_requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL REFERENCES products(id),
        user_id INTEGER REFERENCES users(id),
        email TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at INTEGER,
        notified_at INTEGER
      );
    `);
    console.log('[DB] Table subscriptions and restock_requests created/verified');
  } catch (e: any) {
    console.log('[DB] Phase 3 tables creation skipped:', e.message);
  }

  // 迁移：新增 site_visits 表
  try {
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS site_visits (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ip TEXT NOT NULL,
        user_id INTEGER REFERENCES users(id),
        date TEXT NOT NULL,
        created_at INTEGER,
        UNIQUE(ip, date, user_id)
      );
    `);
    console.log('[DB] Table site_visits created/verified');
  } catch (e: any) {
    console.log('[DB] site_visits creation skipped:', e.message);
  }

  // 迁移：新增 sms_codes 表
  try {
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS sms_codes (
        phone TEXT PRIMARY KEY,
        code TEXT NOT NULL,
        expires_at INTEGER NOT NULL
      );
    `);
    console.log('[DB] Table sms_codes created/verified');
  } catch (e: any) {
    console.log('[DB] sms_codes creation skipped:', e.message);
  }

  // 迁移：新增 captchas 表
  try {
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS captchas (
        token TEXT PRIMARY KEY,
        code TEXT NOT NULL,
        expires_at INTEGER NOT NULL
      );
    `);
    console.log('[DB] Table captchas created/verified');
  } catch (e: any) {
    console.log('[DB] captchas creation skipped:', e.message);
  }
  // 迁移：给 products 表添加新字段
  const productColumns = ['skin_types', 'concerns', 'before_after_images'];
  for (const col of productColumns) {
    try {
      sqlite.exec(`ALTER TABLE products ADD COLUMN ${col} TEXT`);
      console.log(`[DB] Column ${col} added to products`);
    } catch (e: any) {
      if (!e.message.includes('duplicate column')) console.log(`[DB] ${col} column skipped:`, e.message);
    }
  }

  const phase2ProductColumns = ['is_sample', 'is_story_page', 'is_featured'];
  for (const col of phase2ProductColumns) {
    try {
      sqlite.exec(`ALTER TABLE products ADD COLUMN ${col} INTEGER NOT NULL DEFAULT 0`);
      console.log(`[DB] Column ${col} added to products`);
    } catch (e: any) {
      if (!e.message.includes('duplicate column')) console.log(`[DB] ${col} column skipped:`, e.message);
    }
  }

  // 迁移：给 orders 表添加送礼相关字段
  try {
    sqlite.exec(`ALTER TABLE orders ADD COLUMN is_gift INTEGER NOT NULL DEFAULT 0`);
    sqlite.exec(`ALTER TABLE orders ADD COLUMN gift_message TEXT`);
    sqlite.exec(`ALTER TABLE orders ADD COLUMN gift_wrap_fee REAL NOT NULL DEFAULT 0`);
    console.log('[DB] Gifting columns added to orders');
  } catch (e: any) {
    if (!e.message.includes('duplicate column')) console.log('[DB] Gifting columns skipped:', e.message);
  }

  // 迁移：给 orders 表添加物流相关字段
  try {
    sqlite.exec(`ALTER TABLE orders ADD COLUMN tracking_company TEXT`);
    sqlite.exec(`ALTER TABLE orders ADD COLUMN tracking_number TEXT`);
    console.log('[DB] Tracking columns added to orders');
  } catch (e: any) {
    if (!e.message.includes('duplicate column')) console.log('[DB] Tracking columns skipped:', e.message);
  }

  // 迁移：创建 dreamina_tasks 表
  try {
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS dreamina_tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        submit_id TEXT NOT NULL UNIQUE,
        user_id INTEGER REFERENCES users(id),
        prompt TEXT NOT NULL,
        task_type TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'querying',
        result_urls TEXT,
        fail_reason TEXT,
        created_at INTEGER,
        updated_at INTEGER
      );
    `);
    console.log('[DB] dreamina_tasks table ensured');
  } catch (e: any) {
    console.log('[DB] Error creating dreamina_tasks table:', e.message);
  }

  // 迁移：更新部分商品的 is_featured 属性，以便首页能显示产品
  try {
    const featuredSlugs = ['amino-acid-cleanser', 'niacinamide-serum', 'retinol-serum', 'centella-mask', 'spf50-sunscreen'];
    const stmt = sqlite.prepare("UPDATE products SET is_featured = 1 WHERE slug = ?");
    for (const slug of featuredSlugs) {
      stmt.run(slug);
    }
    console.log('[DB] Updated sample products to be featured');
  } catch (e: any) {
    console.log('[DB] Failed to update featured products:', e.message);
  }

  await seedData();
  seedSiteSettings();
  seedClassifications();
  seedClinicalReports();
}

async function seedData() {
  // 检查是否已经有数据
  const adminExists = sqlite.prepare('SELECT id FROM users WHERE level = ? LIMIT 1').get('admin');
  if (adminExists) return;

  console.log('[DB] Seeding initial data...');
  const now = Date.now();

  // 创建管理员
  const adminPwd = await bcrypt.hash('admin123', 10);
  sqlite.prepare(`INSERT INTO users (email,password,name,level,is_active,created_at,updated_at) VALUES (?,?,?,?,?,?,?)`).run(
    'admin@skincare.com', adminPwd, '管理员', 'admin', 1, now, now
  );

  // 创建测试用户
  const testPwd = await bcrypt.hash('test123', 10);
  const memberUsers = [
    { email: 'member@test.com', name: '普通用户小美', level: 'member' },
    { email: 'silver@test.com', name: '银卡用户小雪', level: 'silver' },
    { email: 'gold@test.com',   name: '金卡用户贵妃', level: 'gold' },
    { email: 'diamond@test.com',name: '钻石用户女王', level: 'diamond' },
  ];
  for (const u of memberUsers) {
    sqlite.prepare(`INSERT INTO users (email,password,name,level,is_active,created_at,updated_at) VALUES (?,?,?,?,?,?,?)`).run(
      u.email, testPwd, u.name, u.level, 1, now, now
    );
  }

  // 创建分类
  const categories = [
    { name: '洁面护肤', slug: 'cleanser', description: '温和洁净，卸妆洁面系列' },
    { name: '精华水乳', slug: 'serum',    description: '深层滋养，精华液系列' },
    { name: '面膜套装', slug: 'mask',     description: '急救修护，面膜系列' },
    { name: '防晒隔离', slug: 'sunscreen', description: '全天候防护，防晒系列' },
    { name: '身体护理', slug: 'body',     description: '全身滋润，身体护理' },
  ];
  for (let i = 0; i < categories.length; i++) {
    const c = categories[i];
    sqlite.prepare(`INSERT INTO categories (name,slug,description,sort_order,is_active) VALUES (?,?,?,?,1)`).run(
      c.name, c.slug, c.description, i
    );
  }

  // 创建示例商品
  const sampleProducts = [
    { catSlug: 'cleanser', name: '氨基酸温和洁面乳', slug: 'amino-acid-cleanser', desc: '温和无泡洁面，适合敏感肌，深层清洁毛孔', basePrice: 198, stock: 200, isFeatured: 1 },
    { catSlug: 'cleanser', name: '玫瑰卸妆水', slug: 'rose-makeup-remover', desc: '天然玫瑰提取，温和卸妆不刺激眼周', basePrice: 158, stock: 150, isFeatured: 0 },
    { catSlug: 'serum', name: '烟酰胺美白精华', slug: 'niacinamide-serum', desc: '10%高浓度烟酰胺，提亮肤色改善暗沉', basePrice: 328, stock: 300, isFeatured: 1 },
    { catSlug: 'serum', name: 'A醇抗老精华', slug: 'retinol-serum', desc: '0.1%纯视黄醇，夜间修护淡化细纹', basePrice: 468, stock: 120, isFeatured: 1 },
    { catSlug: 'serum', name: '玻尿酸保湿水', slug: 'hyaluronic-toner', desc: '三重玻尿酸分子，全天候深层补水', basePrice: 218, stock: 400, isFeatured: 0 },
    { catSlug: 'mask', name: '积雪草修护面膜', slug: 'centella-mask', desc: '镇静舒缓，修护敏感肌，一盒5片', basePrice: 89, stock: 500, isFeatured: 1 },
    { catSlug: 'mask', name: '珍珠提亮睡眠面膜', slug: 'pearl-sleeping-mask', desc: '免洗睡眠面膜，珍珠粉提亮肤色', basePrice: 168, stock: 350, isFeatured: 0 },
    { catSlug: 'sunscreen', name: 'SPF50+清爽防晒乳', slug: 'spf50-sunscreen', desc: 'PA++++物理+化学双重防护，轻薄不油腻', basePrice: 258, stock: 280, isFeatured: 1 },
    { catSlug: 'sunscreen', name: '防晒喷雾', slug: 'sunscreen-spray', desc: '随时补涂，全身可用防晒喷雾', basePrice: 128, stock: 200, isFeatured: 0 },
    { catSlug: 'body', name: '身体乳保湿霜', slug: 'body-lotion', desc: '乳木果油+尿素，持久保湿24小时', basePrice: 138, stock: 300, isFeatured: 0 },
  ];

  const catMap: Record<string, number> = {};
  const catRows = sqlite.prepare('SELECT id, slug FROM categories').all() as any[];
  catRows.forEach((r: any) => catMap[r.slug] = r.id);

  // 等级折扣配置
  const levelDiscounts: Record<string, number> = {
    guest: 1.0,
    member: 0.9,
    silver: 0.8,
    gold: 0.7,
    diamond: 0.6,
  };

  for (const p of sampleProducts) {
    const r = sqlite.prepare(`INSERT INTO products (category_id,name,slug,description,base_price,stock,is_active,is_featured,created_at,updated_at) VALUES (?,?,?,?,?,?,1,?,?,?)`).run(
      catMap[p.catSlug], p.name, p.slug, p.desc, p.basePrice, p.stock, p.isFeatured || 0, now, now
    );
    const productId = r.lastInsertRowid;

    // 为每个等级插入价格
    for (const [level, discount] of Object.entries(levelDiscounts)) {
      const price = Math.round(p.basePrice * discount * 100) / 100;
      sqlite.prepare(`INSERT INTO product_prices (product_id,level,price,discount) VALUES (?,?,?,?)`).run(
        productId, level, price, discount
      );
    }
  }

  console.log('[DB] Seed data created successfully');
}

function seedSiteSettings() {

  console.log('[DB] Seeding site settings...');
  const now = Date.now();
  const defaults = [
    { key: 'hero_banner', value: '/uploads/products/hero_banner.jpeg', description: '首页顶部横幅大图' },
    { key: 'brand_logo', value: '/vite.svg', description: '品牌Logo图片' },
    { key: 'site_name', value: '传诗奇', description: '网站名称' },
    { key: 'site_name_en', value: 'TRASOCHY', description: '网站英文名称' },
    { key: 'site_slogan', value: '中国院线护肤专家', description: '网站标语' },
    { key: 'hero_title', value: '传诗奇——中国院线护肤专家', description: '首页Hero标题' },
    { key: 'hero_subtitle', value: '甄选全球珍稀原料，以院线级科技赋能，开启肌肤焕新之旅', description: '首页Hero副标题' },
    { key: 'brand_story_banner', value: '/uploads/products/hero_banner.jpeg', description: '品牌故事横幅图' },
    { key: 'brand_story_title', value: '源自对美的极致追求', description: '品牌故事标题' },
    { key: 'brand_story_text', value: '传诗奇深耕院线护肤领域多年，将前沿生物科技与传统草本精华完美融合，为每一位爱美者量身定制专属护肤方案。我们坚信，真正的美丽源于科学的力量与自然的馈赠。', description: '品牌故事正文' },
    { key: 'footer_text', value: '传诗奇 TRASOCHY — 中国院线护肤专家', description: '页脚品牌文案' },
    { key: 'footer_icp', value: '', description: 'ICP备案号' },
    { key: 'member_cta_title', value: '加入传诗奇会员', description: '会员区标题' },
    { key: 'member_cta_text', value: '尊享专属折扣、优先新品体验、生日礼遇等更多会员权益', description: '会员区描述' },
    { key: 'promo_bar_active', value: '1', description: '是否开启顶部促销公告栏 (1: 开启, 0: 关闭)' },
    { key: 'promo_bar_text', value: '全场满300减50！限时特惠，即刻选购', description: '顶部公告栏文案' },
    { key: 'promo_bar_link', value: '/products', description: '顶部公告栏点击链接' },
    { key: 'promo_modal_active', value: '0', description: '是否开启首屏大弹窗 (1: 开启, 0: 关闭)' },
    { key: 'promo_modal_image', value: '', description: '首屏弹窗海报图片URL' },
    { key: 'promo_modal_link', value: '/products', description: '首屏弹窗点击链接' },
    { key: 'points_discount_enabled', value: '1', description: '是否开启积分通用抵扣 (1:开启, 0:关闭)' },
    { key: 'points_redeem_enabled', value: '1', description: '是否开启商品纯积分兑换 (1:开启, 0:关闭)' },
    { key: 'points_to_money_ratio', value: '100', description: '积分抵扣比例 (100积分=1元)' },
    { key: 'feature_ingredient_glossary', value: '1', description: '是否开启成分百科功能 (1:开启, 0:关闭)' },
    { key: 'feature_skin_concern_filter', value: '1', description: '是否开启肤质/需求筛选功能 (1:开启, 0:关闭)' },
    { key: 'feature_before_after_gallery', value: '1', description: '是否开启真实对比图集功能 (1:开启, 0:关闭)' },
    { key: 'feature_gifting', value: '1', description: '是否开启送礼定制功能 (1:开启, 0:关闭)' },
    { key: 'points_day_active', value: '0', description: '是否开启会员积分日翻倍活动 (1:开启, 0:关闭)' },
    { key: 'points_day_multiplier', value: '2', description: '积分日翻倍倍率 (如 2 代表双倍积分)' },
    { key: 'feature_articles', value: '1', description: '是否开启护肤研究所/内容中心功能 (1:开启, 0:关闭)' },
    { key: 'ai_article_auto_enabled', value: '0', description: '是否开启AI自动生成文章 (1:开启, 0:关闭)' },
    { key: 'ai_article_keywords', value: '烟酰胺,美白,抗老,保湿,屏障修复', description: 'AI自动生成文章关键词库(逗号分隔)' },
    { key: 'ai_article_frequency', value: '1', description: 'AI自动生成文章频率(天数, 1代表每天1篇)' },
    { key: 'feature_company_intro', value: '1', description: '开启品牌与技术团队介绍' },
    { key: 'brand_hero_bg', value: '/images/tech/hero_bg.png', description: '品牌与技术页首屏背景图' },
    { key: 'brand_tech_bg', value: '/images/tech/ctdp_bg.png', description: '品牌与技术页核心技术背景图' },
    { key: 'brand_team_members', value: JSON.stringify([
      { id: "m1", name: "阮仁全 博士", role: "创始人 / 首席科学家", tags: ["中科大博士后", "苏黎世大学MBA", "皇家生物学会院士"], desc: "负责中瑞技术战略规划、核心透皮技术研发与产业化落地。", img: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?q=80&w=2070&auto=format&fit=crop" },
      { id: "m2", name: "温龙平 教授", role: "MSIC 外籍教授", tags: ["中科大教授", "斯坦福博士"], desc: "指导前沿生物医学工程与纳米材料在递送系统中的应用。", img: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?q=80&w=1964&auto=format&fit=crop" },
      { id: "m3", name: "Dr. Linda", role: "MSIC 研究员", tags: ["苏黎世大学", "生物医学博士"], desc: "主导欧洲创新原料开发、机理验证与人体功效数据规范设计。", img: "https://images.unsplash.com/photo-1594824436998-efa422cc47a5?q=80&w=2070&auto=format&fit=crop" },
      { id: "m4", name: "Yexinlei Yang", role: "MSIC 研究员", tags: ["法国工程师大学", "化学工程硕士"], desc: "负责配方优化与透皮递送方案的数据化证据评估体系建立。", img: "https://images.unsplash.com/photo-1581092795360-fd1ca04f0952?q=80&w=1974&auto=format&fit=crop" }
    ]), description: '品牌与技术页团队成员JSON' },
  ];

  // 插入缺失的设置项，不论是否已存在其他配置
  const insert = sqlite.prepare(`
    INSERT INTO site_settings (key, value, description, updated_at) 
    VALUES (?, ?, ?, ?) 
    ON CONFLICT(key) DO NOTHING
  `);
  for (const s of defaults) {
    insert.run(s.key, s.value, s.description, now);
  }
  console.log('[DB] Site settings seeded');
}

function seedClassifications() {
  const classifications = [
    {
      table: 'dosage_forms',
      seeds: [
        { name: '精华液', slug: 'serum' },
        { name: '面霜', slug: 'cream' },
        { name: '爽肤水', slug: 'toner' },
        { name: '洁面乳', slug: 'cleanser' },
        { name: '面膜', slug: 'mask' },
        { name: '眼霜', slug: 'eye-cream' },
        { name: '防晒霜', slug: 'sunscreen' },
        { name: '乳液', slug: 'lotion' },
        { name: '肌底液', slug: 'essence' },
        { name: '卸妆水/油', slug: 'makeup-remover' },
        { name: '原液', slug: 'ampoule' },
        { name: '凝胶/啫喱', slug: 'gel' },
        { name: '精油', slug: 'facial-oil' },
        { name: '去角质', slug: 'exfoliator' },
        { name: '唇膜', slug: 'lip-mask' },
      ]
    },
    {
      table: 'skin_concerns',
      seeds: [
        { name: '抗衰老', slug: 'anti-aging' },
        { name: '美白提亮', slug: 'brightening' },
        { name: '保湿补水', slug: 'hydrating' },
        { name: '控油祛痘', slug: 'acne-control' },
        { name: '修护屏障', slug: 'barrier-repair' },
        { name: '紧致提拉', slug: 'firming' },
        { name: '淡斑祛印', slug: 'dark-spots' },
        { name: '舒缓退红', slug: 'soothing' },
        { name: '淡化细纹', slug: 'fine-lines' },
        { name: '收缩毛孔', slug: 'pore-minimizing' },
        { name: '深层清洁', slug: 'deep-cleansing' },
        { name: '平衡水油', slug: 'oil-balancing' },
        { name: '改善暗沉', slug: 'dullness' },
        { name: '抗氧化', slug: 'antioxidant' },
        { name: '晒后修护', slug: 'after-sun-care' },
        { name: '去黑头/闭口', slug: 'blackhead-removal' },
      ]
    },
    {
      table: 'skin_types',
      seeds: [
        { name: '干性肌肤', slug: 'dry' },
        { name: '油性肌肤', slug: 'oily' },
        { name: '混合性肌肤', slug: 'combination' },
        { name: '敏感肌肤', slug: 'sensitive' },
        { name: '中性肌肤', slug: 'normal' },
        { name: '痘痘肌肤', slug: 'acne-prone' },
        { name: '熟龄肌肤', slug: 'mature' },
        { name: '极干性肌肤', slug: 'very-dry' },
        { name: '外油内干肌肤', slug: 'dehydrated-oily' },
      ]
    }
  ];

  for (const item of classifications) {
    const stmt = sqlite.prepare(`INSERT OR IGNORE INTO ${item.table} (name, slug, sort_order) VALUES (?, ?, ?)`);
    item.seeds.forEach((s, idx) => {
      stmt.run(s.name, s.slug, idx);
    });
    console.log(`[DB] Seeded classifications for ${item.table}`);
  }
}

function seedClinicalReports() {
  const reports = [
    {
      title: "烟酰胺与透明质酸联合抗老紧致临床观察",
      slug: "clinical-niacinamide-ha",
      summary: "本临床观察旨在评估含有5%烟酰胺与多重分子量透明质酸的精华组合在改善面部细纹、提升肌肤紧致度方面的功效。通过对60名年龄在30-50岁的亚洲女性受试者进行为期8周的测试，结果显示该组合能显著提升角质层含水量，使肌肤弹性和紧致度分别提升了24%和18%，且对大部分受试者无明显刺激性。",
      cover_image: "https://images.unsplash.com/photo-1629198688000-71f23e745b6e?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
      pdf_url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
      status: "published",
      translations: JSON.stringify({
        en: {
          title: "Clinical Observation of Niacinamide and HA in Anti-aging",
          summary: "This clinical study evaluates the efficacy of a serum combination containing 5% niacinamide and multi-molecular weight hyaluronic acid in improving facial fine lines and skin firmness. After an 8-week test on 60 Asian female subjects, results showed a 24% increase in skin elasticity and an 18% improvement in firmness."
        },
        de: {
          title: "Klinische Beobachtung von Niacinamid und HA bei Anti-Aging",
          summary: "Diese klinische Studie bewertet die Wirksamkeit einer Serumkombination, die 5 % Niacinamid und Hyaluronsäure enthält, bei der Verbesserung feiner Gesichtslinien und der Hautfestigkeit. Ergebnisse zeigten eine Erhöhung der Hautelastizität um 24 % und eine Verbesserung der Festigkeit um 18 %."
        }
      }),
      published_at: 1777986515928,
      created_at: 1777986515928,
      updated_at: 1777986515928
    },
    {
      title: "多重胜肽精华对敏感肌屏障修复的临床测试",
      slug: "clinical-multi-peptide-repair",
      summary: "该临床测试招募了45位经皮肤科医生评估为敏感肌（伴随泛红、刺痛等症状）的志愿者。连续使用多重胜肽修复精华4周后，通过经皮水分流失(TEWL)和皮肤红斑指数(Erythema Index)测试发现，受试者的TEWL平均下降了31%，红斑指数显著降低，证实了该产品在修护受损屏障、舒缓肌肤不适方面的卓越表现。",
      cover_image: "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
      pdf_url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
      status: "published",
      translations: JSON.stringify({
        en: {
          title: "Clinical Trial of Multi-Peptide Serum on Barrier Repair",
          summary: "This trial recruited 45 volunteers with sensitive skin. After using the multi-peptide repair serum for 4 weeks, subjects showed a 31% average decrease in TEWL and a significant reduction in the Erythema Index, confirming its excellent performance in repairing damaged barriers."
        },
        de: {
          title: "Klinische Studie von Multi-Peptid-Serum zur Barriere-Reparatur",
          summary: "Für diese Studie wurden 45 Freiwillige mit empfindlicher Haut rekrutiert. Nach 4-wöchiger Anwendung zeigte sich ein durchschnittlicher Rückgang des TEWL um 31 % und eine signifikante Verringerung des Erythem-Index, was die hervorragende Leistung bei der Reparatur bestätigte."
        }
      }),
      published_at: 1777986515933,
      created_at: 1777986515933,
      updated_at: 1777986515933
    },
    {
      title: "积雪草提取物褪红修护功效性评估报告",
      slug: "clinical-centella-asiatica",
      summary: "本报告对含有高浓度高纯度积雪草提取物（Centella Asiatica Extract）的面霜进行了体外与人体双重评估。人体功效评估阶段表明，在激光类医美项目后使用该面霜，能够有效缩短肌肤恢复周期，泛红消退时间比对照组缩短了近40%，体现了其优异的抗炎舒缓及屏障重塑潜力。",
      cover_image: "https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
      pdf_url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
      status: "published",
      translations: JSON.stringify({
        en: {
          title: "Efficacy Evaluation of Centella Asiatica in Redness Reduction",
          summary: "This report conducted both in vitro and in vivo evaluations of a cream containing high-purity Centella Asiatica extract. The results indicated that using the cream after laser cosmetic procedures effectively shortened the skin recovery period, with redness fading time reduced by nearly 40% compared to the control group."
        },
        de: {
          title: "Wirksamkeitsbewertung von Centella Asiatica zur Rötungsreduzierung",
          summary: "Dieser Bericht führte Bewertungen einer Creme mit hochreinem Centella Asiatica-Extrakt durch. Die Ergebnisse zeigten, dass die Verwendung der Creme nach Laser-Kosmetikeingriffen die Hauterholungszeit effektiv verkürzte, wobei die Zeit zum Abklingen der Rötung im Vergleich zur Kontrollgruppe um fast 40 % reduziert wurde."
        }
      }),
      published_at: 1777986515937,
      created_at: 1777986515937,
      updated_at: 1777986515937
    }
  ];

  const stmt = sqlite.prepare(`
    INSERT INTO clinical_reports (title, slug, summary, cover_image, pdf_url, status, translations, published_at, created_at, updated_at) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(slug) DO NOTHING
  `);

  for (const r of reports) {
    stmt.run(r.title, r.slug, r.summary, r.cover_image, r.pdf_url, r.status, r.translations, r.published_at, r.created_at, r.updated_at);
  }
  console.log('[DB] Seeded clinical reports');
}

// ============================================================
// 代金券功能数据库迁移（幂等，可安全重复执行）
// ============================================================
export function initCouponTables() {
  // 代金券配置表（按 source 区分来源，每种来源只有一条全局配置）
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS coupon_configs (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      source      TEXT NOT NULL UNIQUE,   -- 'quiz_completion'
      type        TEXT NOT NULL DEFAULT 'fixed',   -- 'fixed' | 'percent'
      value       REAL NOT NULL DEFAULT 30,        -- 固定金额(元) 或 折扣率(如 0.1 = 10%)
      min_amount  REAL NOT NULL DEFAULT 100,       -- 最低消费门槛(元)
      valid_days  INTEGER NOT NULL DEFAULT 30,     -- 有效天数
      is_active   INTEGER NOT NULL DEFAULT 1,      -- 是否开启
      description TEXT,
      updated_at  INTEGER
    );

    CREATE TABLE IF NOT EXISTS user_coupons (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id        INTEGER NOT NULL REFERENCES users(id),
      code           TEXT NOT NULL UNIQUE,         -- 唯一券码，如 QUIZ-A3K9MX
      source         TEXT NOT NULL,                -- 来源
      type           TEXT NOT NULL,                -- 'fixed' | 'percent'
      value          REAL NOT NULL,                -- 面值
      min_amount     REAL NOT NULL DEFAULT 0,      -- 最低消费
      status         TEXT NOT NULL DEFAULT 'unused', -- 'unused' | 'used' | 'expired'
      expires_at     INTEGER NOT NULL,             -- 过期时间戳(ms)
      used_order_no  TEXT,                         -- 已使用的订单号
      used_at        INTEGER,
      created_at     INTEGER
    );
  `);

  // 插入默认问卷完成奖励配置（已存在则忽略）
  try {
    sqlite.prepare(`
      INSERT OR IGNORE INTO coupon_configs (source, type, value, min_amount, valid_days, is_active, description, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run('quiz_completion', 'fixed', 30, 100, 30, 1, '完成 AI 护肤问卷奖励代金券', Date.now());
    console.log('[DB] Coupon tables ready');
  } catch (e: any) {
    console.log('[DB] Coupon config init skipped:', e.message);
  }
}

// ============================================================
// 学术调研问卷结果表（AI购物助手 vs 传统搜索 体验比较）
// ============================================================
export function initSurveyTable() {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS survey_responses (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id          INTEGER REFERENCES users(id),
      answers          TEXT NOT NULL,                          -- JSON 完整答案
      survey_type      TEXT NOT NULL DEFAULT 'ai_vs_search',   -- 问卷类型
      path_type        TEXT NOT NULL DEFAULT 'traditional_search', -- 'traditional_search' | 'ai_assisted'
      cart_items_count INTEGER DEFAULT 0,                      -- 加购商品数
      metadata         TEXT,                                   -- 实验元数据
      created_at       INTEGER
    );
  `);

  try { sqlite.exec(`ALTER TABLE survey_responses ADD COLUMN path_type TEXT NOT NULL DEFAULT 'traditional_search'`); } catch {}
  try { sqlite.exec(`ALTER TABLE survey_responses ADD COLUMN cart_items_count INTEGER DEFAULT 0`); } catch {}
  try { sqlite.exec(`ALTER TABLE survey_responses ADD COLUMN metadata TEXT`); } catch {}

  console.log('[DB] Survey table ready');
}
