const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

async function seed() {
  const dbPath = path.join(process.cwd(), 'data', 'skincare.db');
  const sqlite = new Database(dbPath);

  const now = Date.now();
  const passwordHash = await bcrypt.hash('123456', 10);

  // 1. Generate 20 Users
  const userNames = [
    '清风明月', '小仙女', '护肤达人', '爱美的喵', '草莓果酱',
    '星空下的猫', '旅行家', '花开花落', '深夜读书人', '阳光正好',
    '奶茶不加糖', '晨光微露', '快乐的小熊', '向日葵', '追梦人',
    '云朵软软', '橘子汽水', '风筝飞', '蓝色海洋', '雪之花'
  ];

  const userIds = [];
  console.log('Generating 20 users...');
  const insertUser = sqlite.prepare(`
    INSERT INTO users (email, password, name, level, points, total_spend, is_active, created_at, updated_at) 
    VALUES (?, ?, ?, 'member', 100, 0, 1, ?, ?)
  `);

  for (let i = 0; i < 20; i++) {
    const email = `random_user_${Date.now()}_${i}@test.com`;
    const name = userNames[i] || `User_${i}`;
    const result = insertUser.run(email, passwordHash, name, now, now);
    userIds.push(result.lastInsertRowid);
  }

  // 2. Fetch products
  const products = sqlite.prepare('SELECT id, name FROM products').all();
  if (products.length === 0) {
    console.log('No products found.');
    return;
  }

  // 3. Create dummy orders for the reviews to reference
  // We need an order for the review. We'll create one dummy order per user.
  const insertOrder = sqlite.prepare(`
    INSERT INTO orders (order_no, user_id, user_level, status, total_amount, pay_amount, recipient_name, recipient_phone, address, created_at)
    VALUES (?, ?, 'member', 'delivered', 100, 100, ?, '13800138000', '上海市黄浦区测试地址', ?)
  `);

  const orderIds = [];
  for (let i = 0; i < 20; i++) {
    const orderNo = `DO${Date.now()}${i}`;
    const result = insertOrder.run(orderNo, userIds[i], userNames[i], now);
    orderIds.push(result.lastInsertRowid);
  }

  // 4. Generate Reviews
  const reviewContents = [
    '非常好用！回购好几次了。',
    '包装精美，送人很合适，朋友很喜欢。',
    '味道好闻，淡淡的清香，很舒服。',
    '质地清爽不油腻，吸收快，爱了！',
    '适合敏感肌，用了一段时间没有过敏反应，皮肤稳定多了。',
    '价格合适，性价比高，推荐购买。',
    '发货快，包装严实，客服态度也很好。',
    '配合他们家的其他产品一起用，效果确实不错。',
    '这是我用过最好的一款，以后就认准这个牌子了。',
    '保湿效果拔群，第二天起来脸还是水当当的。',
    '买给妈妈的，她说用了皮肤感觉紧致了一些。',
    '有点小贵但是值得，一分钱一分货。',
    '肤感很高级，像院线做出来的效果。',
    '用了半个月来评价，提亮效果肉眼可见。',
    '不搓泥，后续上妆也很服帖，简直是神仙单品。'
  ];

  const insertReview = sqlite.prepare(`
    INSERT INTO reviews (user_id, product_id, order_id, rating, content, is_visible, created_at)
    VALUES (?, ?, ?, ?, ?, 1, ?)
  `);

  console.log('Generating reviews...');
  let reviewCount = 0;
  for (let i = 0; i < 20; i++) {
    const userId = userIds[i];
    const orderId = orderIds[i];
    // Each user reviews 2-4 random products
    const numReviews = Math.floor(Math.random() * 3) + 2; 
    
    // Pick random products
    const shuffledProducts = [...products].sort(() => 0.5 - Math.random());
    const selectedProducts = shuffledProducts.slice(0, numReviews);

    for (const p of selectedProducts) {
      const rating = Math.random() > 0.2 ? 5 : 4; // Mostly 5 stars, some 4 stars
      const content = reviewContents[Math.floor(Math.random() * reviewContents.length)];
      // random date within the last 30 days
      const reviewDate = now - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000); 
      
      insertReview.run(userId, p.id, orderId, rating, content, reviewDate);
      reviewCount++;
    }
  }

  console.log(`Successfully generated 20 users and ${reviewCount} reviews!`);
}

seed().catch(console.error);
