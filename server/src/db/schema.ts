import { sqliteTable, text, integer, real, primaryKey } from 'drizzle-orm/sqlite-core';

// 用户等级枚举: guest=游客, member=普通会员, silver=银卡, gold=金卡, diamond=钻石, staff=员工, admin=管理员
export const memberLevels = ['guest', 'member', 'silver', 'gold', 'diamond', 'staff', 'admin'] as const;
export type MemberLevel = typeof memberLevels[number];

// 用户表
export const users = sqliteTable('users', {
  id:          integer('id').primaryKey({ autoIncrement: true }),
  email:       text('email').notNull().unique(),
  password:    text('password').notNull(),
  name:        text('name').notNull(),
  phone:       text('phone'),
  avatar:      text('avatar'),
  level:       text('level', { enum: ['guest', 'member', 'silver', 'gold', 'diamond', 'staff', 'admin'] }).notNull().default('member'),
  permissions: text('permissions'),            // JSON数组，如 ["products","orders"]，admin为null表示全部权限
  points:      integer('points').notNull().default(0),
  totalSpend:  real('total_spend').notNull().default(0),
  isActive:    integer('is_active', { mode: 'boolean' }).notNull().default(true),
  proTestLimit: integer('pro_test_limit').notNull().default(4),
  referralCode: text('referral_code').unique(),
  referredBy:  integer('referred_by'),
  createdAt:   integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt:   integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

// 商品分类
export const categories = sqliteTable('categories', {
  id:          integer('id').primaryKey({ autoIncrement: true }),
  name:        text('name').notNull(),
  slug:        text('slug').notNull().unique(),
  description: text('description'),
  image:       text('image'),
  sortOrder:   integer('sort_order').notNull().default(0),
  translations: text('translations'), // JSON: { en: { name: '', description: '' }, de: { ... } }
  isActive:    integer('is_active', { mode: 'boolean' }).notNull().default(true),
});

// 商品表
export const products = sqliteTable('products', {
  id:          integer('id').primaryKey({ autoIncrement: true }),
  categoryId:  integer('category_id').references(() => categories.id),
  name:        text('name').notNull(),
  slug:        text('slug').notNull().unique(),
  description: text('description'),
  mainImage:   text('main_image'),
  images:      text('images'),           // JSON 字符串存多张图片
  basePrice:   real('base_price').notNull(), // 零售原价
  stock:       integer('stock').notNull().default(0),
  unit:        text('unit').default('件'),
  tags:        text('tags'),             // JSON 字符串
  isBundle:    integer('is_bundle', { mode: 'boolean' }).notNull().default(false),
  pointsPrice: integer('points_price'),  // 如果设置了此值，表示可用纯积分兑换的价格
  skinTypes:   text('skin_types'),       // JSON 数组: ["干性", "油性", "敏感肌"]
  concerns:    text('concerns'),         // JSON 数组: ["抗老", "美白", "祛痘"]
  beforeAfterImages: text('before_after_images'), // JSON 数组: [{"before":"url", "after":"url"}]
  isSample:    integer('is_sample', { mode: 'boolean' }).notNull().default(false),
  isStoryPage: integer('is_story_page', { mode: 'boolean' }).notNull().default(false),
  dosageForms: text('dosage_forms'),             // JSON 数组: ["精华液", "面霜"]
  translations: text('translations'), // JSON: { en: { name: '', description: '', unit: '' }, de: { ... } }
  isActive:    integer('is_active', { mode: 'boolean' }).notNull().default(true),
  sortOrder:   integer('sort_order').notNull().default(0),
  createdAt:   integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt:   integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

// 成分表
export const ingredients = sqliteTable('ingredients', {
  id:          integer('id').primaryKey({ autoIncrement: true }),
  name:        text('name').notNull(),
  inciName:    text('inci_name'),
  description: text('description'),
  benefits:    text('benefits'), // 逗号分隔的功效，如"美白,控油"
  translations: text('translations'), // JSON: { en: { name: '', description: '', benefits: '' }, de: { ... } }
});

// 产品-成分关联表
export const productIngredients = sqliteTable('product_ingredients', {
  productId:    integer('product_id').notNull().references(() => products.id),
  ingredientId: integer('ingredient_id').notNull().references(() => ingredients.id),
}, (t) => ({
  pk: primaryKey({ columns: [t.productId, t.ingredientId] }),
}));

// 商品等级价格表 (核心表：每个商品 × 每个等级有独立价格)
export const productPrices = sqliteTable('product_prices', {
  id:          integer('id').primaryKey({ autoIncrement: true }),
  productId:   integer('product_id').notNull().references(() => products.id),
  level:       text('level', { enum: ['guest', 'member', 'silver', 'gold', 'diamond'] }).notNull(),
  price:       real('price').notNull(),
  discount:    real('discount'),        // 折扣率，如 0.9 表示9折（可选显示用）
});

// 产品组合关系表 (bundle)
export const productBundleItems = sqliteTable('product_bundle_items', {
  id:        integer('id').primaryKey({ autoIncrement: true }),
  bundleId:  integer('bundle_id').notNull().references(() => products.id),
  productId: integer('product_id').notNull().references(() => products.id),
  quantity:  integer('quantity').notNull().default(1),
});

// 购物车
export const cartItems = sqliteTable('cart_items', {
  id:        integer('id').primaryKey({ autoIncrement: true }),
  userId:    integer('user_id').notNull().references(() => users.id),
  productId: integer('product_id').notNull().references(() => products.id),
  quantity:  integer('quantity').notNull().default(1),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

// 订单表
export const orders = sqliteTable('orders', {
  id:            integer('id').primaryKey({ autoIncrement: true }),
  orderNo:       text('order_no').notNull().unique(),
  userId:        integer('user_id').notNull().references(() => users.id),
  userLevel:     text('user_level').notNull(),   // 下单时的等级（快照）
  status:        text('status', { enum: ['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'] }).notNull().default('pending'),
  totalAmount:   real('total_amount').notNull(),
  discountAmount: real('discount_amount').notNull().default(0),
  payAmount:     real('pay_amount').notNull(),
  payMethod:     text('pay_method'),     // wechat / alipay
  payTime:       integer('pay_time', { mode: 'timestamp' }),
  tradeNo:       text('trade_no'),       // 第三方支付流水号
  recipientName: text('recipient_name').notNull(),
  recipientPhone: text('recipient_phone').notNull(),
  address:       text('address').notNull(),
  remark:        text('remark'),
  isGift:        integer('is_gift', { mode: 'boolean' }).notNull().default(false),
  giftMessage:   text('gift_message'),
  giftWrapFee:   real('gift_wrap_fee').notNull().default(0),
  trackingCompany: text('tracking_company'),
  trackingNumber: text('tracking_number'),
  createdAt:     integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt:     integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

// 订单明细
export const orderItems = sqliteTable('order_items', {
  id:          integer('id').primaryKey({ autoIncrement: true }),
  orderId:     integer('order_id').notNull().references(() => orders.id),
  productId:   integer('product_id').notNull().references(() => products.id),
  productName: text('product_name').notNull(), // 商品名称快照
  productImage: text('product_image'),
  quantity:    integer('quantity').notNull(),
  unitPrice:   real('unit_price').notNull(),   // 下单时价格快照
  subtotal:    real('subtotal').notNull(),
});

// 用户收货地址
export const addresses = sqliteTable('addresses', {
  id:        integer('id').primaryKey({ autoIncrement: true }),
  userId:    integer('user_id').notNull().references(() => users.id),
  name:      text('name').notNull(),
  phone:     text('phone').notNull(),
  province:  text('province').notNull(),
  city:      text('city').notNull(),
  district:  text('district').notNull(),
  address:   text('address').notNull(),
  isDefault: integer('is_default', { mode: 'boolean' }).notNull().default(false),
});

// 收藏表
export const favorites = sqliteTable('favorites', {
  id:        integer('id').primaryKey({ autoIncrement: true }),
  userId:    integer('user_id').notNull().references(() => users.id),
  productId: integer('product_id').notNull().references(() => products.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

// 评价表
export const reviews = sqliteTable('reviews', {
  id:        integer('id').primaryKey({ autoIncrement: true }),
  userId:    integer('user_id').notNull().references(() => users.id),
  productId: integer('product_id').notNull().references(() => products.id),
  orderId:   integer('order_id').notNull().references(() => orders.id),
  rating:    integer('rating').notNull(),
  content:   text('content').default(''),
  isVisible: integer('is_visible', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

// 积分明细流水表
export const pointsHistory = sqliteTable('points_history', {
  id:          integer('id').primaryKey({ autoIncrement: true }),
  userId:      integer('user_id').notNull().references(() => users.id),
  amount:      integer('amount').notNull(), // 正数代表获得，负数代表消耗
  type:        text('type').notNull(),      // 'referral_reward', 'purchase_reward', 'redeem_product', 'admin_adjust'
  description: text('description').notNull(),
  createdAt:   integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

// 定期订阅表 (Phase 3)
export const subscriptions = sqliteTable('subscriptions', {
  id:              integer('id').primaryKey({ autoIncrement: true }),
  userId:          integer('user_id').notNull().references(() => users.id),
  productId:       integer('product_id').notNull().references(() => products.id),
  status:          text('status', { enum: ['active', 'cancelled', 'paused'] }).notNull().default('active'),
  frequencyDays:   integer('frequency_days').notNull().default(30),
  discountPercent: real('discount_percent').notNull().default(0.9), // e.g. 0.9 = 10% off
  nextDeliverDate: integer('next_deliver_date', { mode: 'timestamp' }).notNull(),
  createdAt:       integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt:       integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

// 到货提醒表 (Phase 3)
export const restockRequests = sqliteTable('restock_requests', {
  id:          integer('id').primaryKey({ autoIncrement: true }),
  productId:   integer('product_id').notNull().references(() => products.id),
  userId:      integer('user_id').references(() => users.id),
  email:       text('email').notNull(),
  status:      text('status', { enum: ['pending', 'notified'] }).notNull().default('pending'),
  createdAt:   integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  notifiedAt:  integer('notified_at', { mode: 'timestamp' }),
});

// 用户行为埋点表 (Phase 3 AI Operations)
export const userBehaviorLogs = sqliteTable('user_behavior_logs', {
  id:          integer('id').primaryKey({ autoIncrement: true }),
  sessionId:   text('session_id').notNull(),
  userId:      integer('user_id').references(() => users.id),
  actionType:  text('action_type', { enum: ['page_view', 'product_click', 'add_to_cart'] }).notNull(),
  path:        text('path').notNull(),
  productId:   integer('product_id').references(() => products.id),
  dwellTime:   integer('dwell_time').default(0), // 停留时长，单位秒
  createdAt:   integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

// 文章/科普表
export const articles = sqliteTable('articles', {
  id:            integer('id').primaryKey({ autoIncrement: true }),
  title:         text('title').notNull(),
  slug:          text('slug').notNull().unique(),
  content:       text('content').notNull(),
  coverImage:    text('cover_image'),
  status:        text('status', { enum: ['published', 'draft'] }).notNull().default('draft'),
  isAiGenerated: integer('is_ai_generated', { mode: 'boolean' }).notNull().default(false),
  keywords:      text('keywords'), // JSON array of keywords used for generation or tags
  translations:  text('translations'), // JSON: { en: { title: '', content: '', keywords: '' }, de: { ... } }
  publishedAt:   integer('published_at', { mode: 'timestamp' }),
  createdAt:     integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt:     integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

// 临床报告表
export const clinicalReports = sqliteTable('clinical_reports', {
  id:            integer('id').primaryKey({ autoIncrement: true }),
  title:         text('title').notNull(),
  slug:          text('slug').notNull().unique(),
  summary:       text('summary'),
  coverImage:    text('cover_image'),
  pdfUrl:        text('pdf_url'), // 报告PDF链接
  status:        text('status', { enum: ['published', 'draft'] }).notNull().default('draft'),
  translations:  text('translations'), // JSON: { en: { title: '', summary: '' }, de: { ... } }
  publishedAt:   integer('published_at', { mode: 'timestamp' }),
  createdAt:     integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt:     integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

// 皮肤检测记录表 (Baidu AI MVP)
export const skinAnalysisRecords = sqliteTable('skin_analysis_records', {
  id:         integer('id').primaryKey({ autoIncrement: true }),
  userId:     integer('user_id').references(() => users.id),
  imageUrl:   text('image_url').notNull(),
  resultData: text('result_data').notNull(), // JSON 格式保存百度API返回的原始结果
  type:       text('type', { enum: ['basic', 'pro'] }).notNull().default('basic'),
  createdAt:  integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

