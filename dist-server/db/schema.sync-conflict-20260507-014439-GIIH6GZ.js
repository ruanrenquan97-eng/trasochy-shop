"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.articles = exports.userBehaviorLogs = exports.restockRequests = exports.subscriptions = exports.pointsHistory = exports.reviews = exports.favorites = exports.addresses = exports.orderItems = exports.orders = exports.cartItems = exports.productBundleItems = exports.productPrices = exports.productIngredients = exports.ingredients = exports.products = exports.categories = exports.users = exports.memberLevels = void 0;
const sqlite_core_1 = require("drizzle-orm/sqlite-core");
// 用户等级枚举: guest=游客, member=普通会员, silver=银卡, gold=金卡, staff=员工, admin=管理员
exports.memberLevels = ['guest', 'member', 'silver', 'gold', 'staff', 'admin'];
// 用户表
exports.users = (0, sqlite_core_1.sqliteTable)('users', {
    id: (0, sqlite_core_1.integer)('id').primaryKey({ autoIncrement: true }),
    email: (0, sqlite_core_1.text)('email').notNull().unique(),
    password: (0, sqlite_core_1.text)('password').notNull(),
    name: (0, sqlite_core_1.text)('name').notNull(),
    phone: (0, sqlite_core_1.text)('phone'),
    avatar: (0, sqlite_core_1.text)('avatar'),
    level: (0, sqlite_core_1.text)('level', { enum: ['guest', 'member', 'silver', 'gold', 'staff', 'admin'] }).notNull().default('member'),
    permissions: (0, sqlite_core_1.text)('permissions'), // JSON数组，如 ["products","orders"]，admin为null表示全部权限
    points: (0, sqlite_core_1.integer)('points').notNull().default(0),
    totalSpend: (0, sqlite_core_1.real)('total_spend').notNull().default(0),
    isActive: (0, sqlite_core_1.integer)('is_active', { mode: 'boolean' }).notNull().default(true),
    referralCode: (0, sqlite_core_1.text)('referral_code').unique(),
    referredBy: (0, sqlite_core_1.integer)('referred_by'),
    createdAt: (0, sqlite_core_1.integer)('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
    updatedAt: (0, sqlite_core_1.integer)('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});
// 商品分类
exports.categories = (0, sqlite_core_1.sqliteTable)('categories', {
    id: (0, sqlite_core_1.integer)('id').primaryKey({ autoIncrement: true }),
    name: (0, sqlite_core_1.text)('name').notNull(),
    slug: (0, sqlite_core_1.text)('slug').notNull().unique(),
    description: (0, sqlite_core_1.text)('description'),
    image: (0, sqlite_core_1.text)('image'),
    sortOrder: (0, sqlite_core_1.integer)('sort_order').notNull().default(0),
    translations: (0, sqlite_core_1.text)('translations'), // JSON: { en: { name: '', description: '' }, de: { ... } }
    isActive: (0, sqlite_core_1.integer)('is_active', { mode: 'boolean' }).notNull().default(true),
});
// 商品表
exports.products = (0, sqlite_core_1.sqliteTable)('products', {
    id: (0, sqlite_core_1.integer)('id').primaryKey({ autoIncrement: true }),
    categoryId: (0, sqlite_core_1.integer)('category_id').references(() => exports.categories.id),
    name: (0, sqlite_core_1.text)('name').notNull(),
    slug: (0, sqlite_core_1.text)('slug').notNull().unique(),
    description: (0, sqlite_core_1.text)('description'),
    mainImage: (0, sqlite_core_1.text)('main_image'),
    images: (0, sqlite_core_1.text)('images'), // JSON 字符串存多张图片
    basePrice: (0, sqlite_core_1.real)('base_price').notNull(), // 零售原价
    stock: (0, sqlite_core_1.integer)('stock').notNull().default(0),
    unit: (0, sqlite_core_1.text)('unit').default('件'),
    tags: (0, sqlite_core_1.text)('tags'), // JSON 字符串
    isBundle: (0, sqlite_core_1.integer)('is_bundle', { mode: 'boolean' }).notNull().default(false),
    pointsPrice: (0, sqlite_core_1.integer)('points_price'), // 如果设置了此值，表示可用纯积分兑换的价格
    skinTypes: (0, sqlite_core_1.text)('skin_types'), // JSON 数组: ["干性", "油性", "敏感肌"]
    concerns: (0, sqlite_core_1.text)('concerns'), // JSON 数组: ["抗老", "美白", "祛痘"]
    beforeAfterImages: (0, sqlite_core_1.text)('before_after_images'), // JSON 数组: [{"before":"url", "after":"url"}]
    isSample: (0, sqlite_core_1.integer)('is_sample', { mode: 'boolean' }).notNull().default(false),
    isStoryPage: (0, sqlite_core_1.integer)('is_story_page', { mode: 'boolean' }).notNull().default(false),
    translations: (0, sqlite_core_1.text)('translations'), // JSON: { en: { name: '', description: '', unit: '' }, de: { ... } }
    isActive: (0, sqlite_core_1.integer)('is_active', { mode: 'boolean' }).notNull().default(true),
    sortOrder: (0, sqlite_core_1.integer)('sort_order').notNull().default(0),
    createdAt: (0, sqlite_core_1.integer)('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
    updatedAt: (0, sqlite_core_1.integer)('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});
// 成分表
exports.ingredients = (0, sqlite_core_1.sqliteTable)('ingredients', {
    id: (0, sqlite_core_1.integer)('id').primaryKey({ autoIncrement: true }),
    name: (0, sqlite_core_1.text)('name').notNull(),
    inciName: (0, sqlite_core_1.text)('inci_name'),
    description: (0, sqlite_core_1.text)('description'),
    benefits: (0, sqlite_core_1.text)('benefits'), // 逗号分隔的功效，如"美白,控油"
    translations: (0, sqlite_core_1.text)('translations'), // JSON: { en: { name: '', description: '', benefits: '' }, de: { ... } }
});
// 产品-成分关联表
exports.productIngredients = (0, sqlite_core_1.sqliteTable)('product_ingredients', {
    productId: (0, sqlite_core_1.integer)('product_id').notNull().references(() => exports.products.id),
    ingredientId: (0, sqlite_core_1.integer)('ingredient_id').notNull().references(() => exports.ingredients.id),
}, (t) => ({
    pk: (0, sqlite_core_1.primaryKey)({ columns: [t.productId, t.ingredientId] }),
}));
// 商品等级价格表 (核心表：每个商品 × 每个等级有独立价格)
exports.productPrices = (0, sqlite_core_1.sqliteTable)('product_prices', {
    id: (0, sqlite_core_1.integer)('id').primaryKey({ autoIncrement: true }),
    productId: (0, sqlite_core_1.integer)('product_id').notNull().references(() => exports.products.id),
    level: (0, sqlite_core_1.text)('level', { enum: ['guest', 'member', 'silver', 'gold'] }).notNull(),
    price: (0, sqlite_core_1.real)('price').notNull(),
    discount: (0, sqlite_core_1.real)('discount'), // 折扣率，如 0.9 表示9折（可选显示用）
});
// 产品组合关系表 (bundle)
exports.productBundleItems = (0, sqlite_core_1.sqliteTable)('product_bundle_items', {
    id: (0, sqlite_core_1.integer)('id').primaryKey({ autoIncrement: true }),
    bundleId: (0, sqlite_core_1.integer)('bundle_id').notNull().references(() => exports.products.id),
    productId: (0, sqlite_core_1.integer)('product_id').notNull().references(() => exports.products.id),
    quantity: (0, sqlite_core_1.integer)('quantity').notNull().default(1),
});
// 购物车
exports.cartItems = (0, sqlite_core_1.sqliteTable)('cart_items', {
    id: (0, sqlite_core_1.integer)('id').primaryKey({ autoIncrement: true }),
    userId: (0, sqlite_core_1.integer)('user_id').notNull().references(() => exports.users.id),
    productId: (0, sqlite_core_1.integer)('product_id').notNull().references(() => exports.products.id),
    quantity: (0, sqlite_core_1.integer)('quantity').notNull().default(1),
    createdAt: (0, sqlite_core_1.integer)('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});
// 订单表
exports.orders = (0, sqlite_core_1.sqliteTable)('orders', {
    id: (0, sqlite_core_1.integer)('id').primaryKey({ autoIncrement: true }),
    orderNo: (0, sqlite_core_1.text)('order_no').notNull().unique(),
    userId: (0, sqlite_core_1.integer)('user_id').notNull().references(() => exports.users.id),
    userLevel: (0, sqlite_core_1.text)('user_level').notNull(), // 下单时的等级（快照）
    status: (0, sqlite_core_1.text)('status', { enum: ['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'] }).notNull().default('pending'),
    totalAmount: (0, sqlite_core_1.real)('total_amount').notNull(),
    discountAmount: (0, sqlite_core_1.real)('discount_amount').notNull().default(0),
    payAmount: (0, sqlite_core_1.real)('pay_amount').notNull(),
    payMethod: (0, sqlite_core_1.text)('pay_method'), // wechat / alipay
    payTime: (0, sqlite_core_1.integer)('pay_time', { mode: 'timestamp' }),
    tradeNo: (0, sqlite_core_1.text)('trade_no'), // 第三方支付流水号
    recipientName: (0, sqlite_core_1.text)('recipient_name').notNull(),
    recipientPhone: (0, sqlite_core_1.text)('recipient_phone').notNull(),
    address: (0, sqlite_core_1.text)('address').notNull(),
    remark: (0, sqlite_core_1.text)('remark'),
    isGift: (0, sqlite_core_1.integer)('is_gift', { mode: 'boolean' }).notNull().default(false),
    giftMessage: (0, sqlite_core_1.text)('gift_message'),
    giftWrapFee: (0, sqlite_core_1.real)('gift_wrap_fee').notNull().default(0),
    createdAt: (0, sqlite_core_1.integer)('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
    updatedAt: (0, sqlite_core_1.integer)('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});
// 订单明细
exports.orderItems = (0, sqlite_core_1.sqliteTable)('order_items', {
    id: (0, sqlite_core_1.integer)('id').primaryKey({ autoIncrement: true }),
    orderId: (0, sqlite_core_1.integer)('order_id').notNull().references(() => exports.orders.id),
    productId: (0, sqlite_core_1.integer)('product_id').notNull().references(() => exports.products.id),
    productName: (0, sqlite_core_1.text)('product_name').notNull(), // 商品名称快照
    productImage: (0, sqlite_core_1.text)('product_image'),
    quantity: (0, sqlite_core_1.integer)('quantity').notNull(),
    unitPrice: (0, sqlite_core_1.real)('unit_price').notNull(), // 下单时价格快照
    subtotal: (0, sqlite_core_1.real)('subtotal').notNull(),
});
// 用户收货地址
exports.addresses = (0, sqlite_core_1.sqliteTable)('addresses', {
    id: (0, sqlite_core_1.integer)('id').primaryKey({ autoIncrement: true }),
    userId: (0, sqlite_core_1.integer)('user_id').notNull().references(() => exports.users.id),
    name: (0, sqlite_core_1.text)('name').notNull(),
    phone: (0, sqlite_core_1.text)('phone').notNull(),
    province: (0, sqlite_core_1.text)('province').notNull(),
    city: (0, sqlite_core_1.text)('city').notNull(),
    district: (0, sqlite_core_1.text)('district').notNull(),
    address: (0, sqlite_core_1.text)('address').notNull(),
    isDefault: (0, sqlite_core_1.integer)('is_default', { mode: 'boolean' }).notNull().default(false),
});
// 收藏表
exports.favorites = (0, sqlite_core_1.sqliteTable)('favorites', {
    id: (0, sqlite_core_1.integer)('id').primaryKey({ autoIncrement: true }),
    userId: (0, sqlite_core_1.integer)('user_id').notNull().references(() => exports.users.id),
    productId: (0, sqlite_core_1.integer)('product_id').notNull().references(() => exports.products.id),
    createdAt: (0, sqlite_core_1.integer)('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});
// 评价表
exports.reviews = (0, sqlite_core_1.sqliteTable)('reviews', {
    id: (0, sqlite_core_1.integer)('id').primaryKey({ autoIncrement: true }),
    userId: (0, sqlite_core_1.integer)('user_id').notNull().references(() => exports.users.id),
    productId: (0, sqlite_core_1.integer)('product_id').notNull().references(() => exports.products.id),
    orderId: (0, sqlite_core_1.integer)('order_id').notNull().references(() => exports.orders.id),
    rating: (0, sqlite_core_1.integer)('rating').notNull(),
    content: (0, sqlite_core_1.text)('content').default(''),
    isVisible: (0, sqlite_core_1.integer)('is_visible', { mode: 'boolean' }).notNull().default(true),
    createdAt: (0, sqlite_core_1.integer)('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});
// 积分明细流水表
exports.pointsHistory = (0, sqlite_core_1.sqliteTable)('points_history', {
    id: (0, sqlite_core_1.integer)('id').primaryKey({ autoIncrement: true }),
    userId: (0, sqlite_core_1.integer)('user_id').notNull().references(() => exports.users.id),
    amount: (0, sqlite_core_1.integer)('amount').notNull(), // 正数代表获得，负数代表消耗
    type: (0, sqlite_core_1.text)('type').notNull(), // 'referral_reward', 'purchase_reward', 'redeem_product', 'admin_adjust'
    description: (0, sqlite_core_1.text)('description').notNull(),
    createdAt: (0, sqlite_core_1.integer)('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});
// 定期订阅表 (Phase 3)
exports.subscriptions = (0, sqlite_core_1.sqliteTable)('subscriptions', {
    id: (0, sqlite_core_1.integer)('id').primaryKey({ autoIncrement: true }),
    userId: (0, sqlite_core_1.integer)('user_id').notNull().references(() => exports.users.id),
    productId: (0, sqlite_core_1.integer)('product_id').notNull().references(() => exports.products.id),
    status: (0, sqlite_core_1.text)('status', { enum: ['active', 'cancelled', 'paused'] }).notNull().default('active'),
    frequencyDays: (0, sqlite_core_1.integer)('frequency_days').notNull().default(30),
    discountPercent: (0, sqlite_core_1.real)('discount_percent').notNull().default(0.9), // e.g. 0.9 = 10% off
    nextDeliverDate: (0, sqlite_core_1.integer)('next_deliver_date', { mode: 'timestamp' }).notNull(),
    createdAt: (0, sqlite_core_1.integer)('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
    updatedAt: (0, sqlite_core_1.integer)('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});
// 到货提醒表 (Phase 3)
exports.restockRequests = (0, sqlite_core_1.sqliteTable)('restock_requests', {
    id: (0, sqlite_core_1.integer)('id').primaryKey({ autoIncrement: true }),
    productId: (0, sqlite_core_1.integer)('product_id').notNull().references(() => exports.products.id),
    userId: (0, sqlite_core_1.integer)('user_id').references(() => exports.users.id),
    email: (0, sqlite_core_1.text)('email').notNull(),
    status: (0, sqlite_core_1.text)('status', { enum: ['pending', 'notified'] }).notNull().default('pending'),
    createdAt: (0, sqlite_core_1.integer)('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
    notifiedAt: (0, sqlite_core_1.integer)('notified_at', { mode: 'timestamp' }),
});
// 用户行为埋点表 (Phase 3 AI Operations)
exports.userBehaviorLogs = (0, sqlite_core_1.sqliteTable)('user_behavior_logs', {
    id: (0, sqlite_core_1.integer)('id').primaryKey({ autoIncrement: true }),
    sessionId: (0, sqlite_core_1.text)('session_id').notNull(),
    userId: (0, sqlite_core_1.integer)('user_id').references(() => exports.users.id),
    actionType: (0, sqlite_core_1.text)('action_type', { enum: ['page_view', 'product_click', 'add_to_cart'] }).notNull(),
    path: (0, sqlite_core_1.text)('path').notNull(),
    productId: (0, sqlite_core_1.integer)('product_id').references(() => exports.products.id),
    dwellTime: (0, sqlite_core_1.integer)('dwell_time').default(0), // 停留时长，单位秒
    createdAt: (0, sqlite_core_1.integer)('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});
// 文章/科普表
exports.articles = (0, sqlite_core_1.sqliteTable)('articles', {
    id: (0, sqlite_core_1.integer)('id').primaryKey({ autoIncrement: true }),
    title: (0, sqlite_core_1.text)('title').notNull(),
    slug: (0, sqlite_core_1.text)('slug').notNull().unique(),
    content: (0, sqlite_core_1.text)('content').notNull(),
    coverImage: (0, sqlite_core_1.text)('cover_image'),
    status: (0, sqlite_core_1.text)('status', { enum: ['published', 'draft'] }).notNull().default('draft'),
    isAiGenerated: (0, sqlite_core_1.integer)('is_ai_generated', { mode: 'boolean' }).notNull().default(false),
    keywords: (0, sqlite_core_1.text)('keywords'), // JSON array of keywords used for generation or tags
    translations: (0, sqlite_core_1.text)('translations'), // JSON: { en: { title: '', content: '', keywords: '' }, de: { ... } }
    publishedAt: (0, sqlite_core_1.integer)('published_at', { mode: 'timestamp' }),
    createdAt: (0, sqlite_core_1.integer)('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
    updatedAt: (0, sqlite_core_1.integer)('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});
