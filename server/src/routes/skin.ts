import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

import { analyzeSkinWithMegvii } from '../services/megviiAi';
import { db } from '../db';
import { sqlite } from '../db/index';
import { skinAnalysisRecords, products } from '../db/schema';
import { authMiddleware } from '../middleware/auth';
import { like, or } from 'drizzle-orm';

const router = Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(process.cwd(), 'uploads/skin');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});
const upload = multer({ storage });

// 基于旷视的专业版皮肤分析接口 (小程序端调用)
router.post('/analyze/megvii-pro', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '请上传图片' });
    }

    // 获取上传的图片路径
    const filePath = req.file.path;
    const imageUrl = `/uploads/skin/${req.file.filename}`;
    const userId = (req as any).user.id;

    // 检查专业版测试剩余次数
    const userRow = sqlite.prepare('SELECT level, pro_test_limit FROM users WHERE id = ?').get(userId) as any;
    const remainingProTests = userRow?.pro_test_limit ?? 0;
    
    if (userRow?.level !== 'admin' && remainingProTests <= 0) {
      fs.unlinkSync(filePath); // 清理上传的图片
      return res.status(403).json({ error: `您的深度测试次数已用完。如需更多次数，请联系客服。` });
    }

    // 将图片转换为 Base64，移除前缀
    const imageBuffer = fs.readFileSync(filePath);
    const base64Image = imageBuffer.toString('base64');

    // 从数据库读取动态配置的 API Keys
    const apiKeyRow = sqlite.prepare("SELECT value FROM site_settings WHERE key = 'megvii_pro_api_key'").get() as any;
    const apiSecretRow = sqlite.prepare("SELECT value FROM site_settings WHERE key = 'megvii_pro_api_secret'").get() as any;
    const apiUrlRow = sqlite.prepare("SELECT value FROM site_settings WHERE key = 'megvii_pro_api_url'").get() as any;
    
    const dynamicApiKey = apiKeyRow?.value || undefined;
    const dynamicApiSecret = apiSecretRow?.value || undefined;
    const dynamicApiUrl = apiUrlRow?.value || undefined;

    // 调用旷视专业版 AI 接口
    const aiResult = await analyzeSkinWithMegvii(base64Image, dynamicApiKey, dynamicApiSecret, true, dynamicApiUrl);

    // 将旷视返回的 maps 图片 base64 保存为本地文件，便于前端直接展示
    const mapsDir = path.join(process.cwd(), 'uploads/skin/maps');
    if (!fs.existsSync(mapsDir)) fs.mkdirSync(mapsDir, { recursive: true });

    const MAP_KEY_MAP: Record<string, string> = {
      red_area: 'red',
      brown_area: 'melanin',
      texture_enhanced_pores: 'pores',
      texture_enhanced_blackheads: 'blackhead',
      texture_enhanced_oily_area: 'oily',
      texture_enhanced_lines: 'wrinkle',
      water_area: 'water',
      rough_area: 'rough',
      roi_outline_map: 'acne',
    };

    const mapUrls: Record<string, string> = {};
    const maps = {
      ...(aiResult || {}),
      ...(aiResult.result || {}),
      ...(aiResult.maps || {}),
      ...(aiResult.result?.maps || {}),
      ...(aiResult.result?.face_maps || {})
    };

    for (const [apiKey, shortKey] of Object.entries(MAP_KEY_MAP)) {
      const mapData = maps[apiKey];
      if (!mapData) continue;
      try {
        const raw = String(mapData).replace(/^data:image\/\w+;base64,/, '');
        const ext = ['texture_enhanced_pores','texture_enhanced_blackheads','texture_enhanced_oily_area','rough_area','roi_outline_map'].includes(apiKey) ? 'png' : 'jpg';
        const fileName = `${uuidv4()}_${shortKey}.${ext}`;
        fs.writeFileSync(path.join(mapsDir, fileName), Buffer.from(raw, 'base64'));
        mapUrls[shortKey] = `/uploads/skin/maps/${fileName}`;
      } catch (e) {
        console.warn(`Failed to save map ${apiKey}:`, e);
      }
    }

    // 将 mapUrls 附加到结果中一并存储
    const resultToStore = { ...aiResult, mapUrls };

    // 将结果存入数据库 (使用 sqlite 原生，避免 drizzle .returning() 运行时问题)
    const insertResult = sqlite.prepare(`
      INSERT INTO skin_analysis_records (user_id, image_url, result_data, type, created_at)
      VALUES (?, ?, ?, 'pro', ?)
    `).run(userId, imageUrl, JSON.stringify(resultToStore), Date.now());

    const recordId = Number(insertResult.lastInsertRowid);

    // 扣除一次深度测试次数 (admin 无限)
    if (userRow?.level !== 'admin') {
      sqlite.prepare('UPDATE users SET pro_test_limit = pro_test_limit - 1 WHERE id = ?').run(userId);
    }

    console.log(`[Megvii Pro] 分析完成 recordId=${recordId}, mapUrls keys=${Object.keys(mapUrls)}`);

    res.json({
      success: true,
      recordId,
      imageUrl,
      result: resultToStore
    });

  } catch (error: any) {
    console.error('Megvii Pro Skin Analysis Error:', error);
    res.status(500).json({ error: error.message || '专业版皮肤检测失败，请稍后重试' });
  }
});




// 获取单条测肤记录
router.get('/records/:id', authMiddleware, async (req, res) => {
  const user = (req as any).user;
  const userId = user.id;
  const isAdminOrStaff = user.level === 'admin' || user.level === 'staff';
  const recordId = parseInt(req.params.id as string);
  try {
    let record;
    if (isAdminOrStaff) {
      record = sqlite.prepare(`
        SELECT id, image_url as imageUrl, result_data as resultData, created_at as createdAt
        FROM skin_analysis_records
        WHERE id = ?
      `).get(recordId);
    } else {
      record = sqlite.prepare(`
        SELECT id, image_url as imageUrl, result_data as resultData, created_at as createdAt
        FROM skin_analysis_records
        WHERE id = ? AND user_id = ?
      `).get(recordId, userId);
    }
    
    if (!record) {
      return res.status(404).json({ error: '未找到测肤记录' });
    }
    
    res.json(record);
  } catch (error) {
    console.error('Fetch record error:', error);
    res.status(500).json({ error: '获取记录失败' });
  }
});

// 基于旷视的皮肤分析接口 (小程序端调用)
router.post('/analyze/megvii', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '请上传图片' });
    }

    const filePath = req.file.path;
    const imageUrl = `/uploads/skin/${req.file.filename}`;
    const userId = (req as any).user.id;

    // 检查基础版每天的测试次数限制 (每日 10 次)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayMs = todayStart.getTime();
    
    // 注意：以前原生的插入用的是 Math.floor(Date.now() / 1000)（秒），而 drizzle 用的是毫秒。为了兼容，我们使用比较宽松的逻辑或统一为毫秒查询
    // 假设 drizzle 保存 created_at 为毫秒。由于上面 pro 版本我们改成 Date.now() 毫秒，我们这里用毫秒查询
    const basicUsage = sqlite.prepare("SELECT count(id) as count FROM skin_analysis_records WHERE user_id = ? AND type = 'basic' AND (created_at >= ? OR created_at >= ?)").get(userId, todayMs, Math.floor(todayMs/1000)) as any;
    if (basicUsage && basicUsage.count >= 10) {
      fs.unlinkSync(filePath); // 清理上传的图片
      return res.status(403).json({ error: '今日基础测肤次数已达上限 (10次)' });
    }

    const imageBuffer = fs.readFileSync(filePath);
    const base64Image = imageBuffer.toString('base64');

    // 从数据库读取动态配置的 API Keys
    const apiKeyRow = sqlite.prepare("SELECT value FROM site_settings WHERE key = 'megvii_api_key'").get() as any;
    const apiSecretRow = sqlite.prepare("SELECT value FROM site_settings WHERE key = 'megvii_api_secret'").get() as any;
    const apiUrlRow = sqlite.prepare("SELECT value FROM site_settings WHERE key = 'megvii_api_url'").get() as any;
    
    const dynamicApiKey = apiKeyRow?.value || undefined;
    const dynamicApiSecret = apiSecretRow?.value || undefined;
    const dynamicApiUrl = apiUrlRow?.value || undefined;

    // 调用旷视 AI 接口
    const aiResult = await analyzeSkinWithMegvii(base64Image, dynamicApiKey, dynamicApiSecret, false, dynamicApiUrl);

    // 分析旷视结果，提取皮肤问题关键字 (根据旷视基础版 API 文档)
    const detectedConcerns: string[] = [];
    const r = aiResult.result || aiResult;
    
    // value 为 1 表示存在该问题，为 0 表示不存在
    if (r.acne && String(r.acne.value) === '1') detectedConcerns.push('祛痘');
    if (r.dark_circle && String(r.dark_circle.value) === '1') detectedConcerns.push('黑眼圈');
    
    // 毛孔粗大 (前额、左脸颊、右脸颊、下巴任一有毛孔粗大即可)
    if (
      (r.pores_forehead && String(r.pores_forehead.value) === '1') ||
      (r.pores_left_cheek && String(r.pores_left_cheek.value) === '1') ||
      (r.pores_right_cheek && String(r.pores_right_cheek.value) === '1') ||
      (r.pores_jaw && String(r.pores_jaw.value) === '1')
    ) {
      detectedConcerns.push('收缩毛孔');
    }

    if (r.blackhead && String(r.blackhead.value) === '1') detectedConcerns.push('去黑头');
    if (r.skin_spot && String(r.skin_spot.value) === '1') detectedConcerns.push('淡斑', '美白');
    
    // 细纹、皱纹等抗衰需求
    if (
      (r.forehead_wrinkle && String(r.forehead_wrinkle.value) === '1') ||
      (r.crows_feet && String(r.crows_feet.value) === '1') ||
      (r.eye_finelines && String(r.eye_finelines.value) === '1') ||
      (r.glabella_wrinkle && String(r.glabella_wrinkle.value) === '1') ||
      (r.nasolabial_fold && String(r.nasolabial_fold.value) === '1') ||
      (r.eye_pouch && String(r.eye_pouch.value) === '1')
    ) {
      detectedConcerns.push('抗老', '紧致');
    }

    // 根据肤质判断基础需求
    if (r.skin_type === 0) detectedConcerns.push('控油'); // 油性皮肤
    if (r.skin_type === 1) detectedConcerns.push('保湿'); // 干性皮肤
    
    if (detectedConcerns.length === 0) {
      detectedConcerns.push('保湿'); // 默认推荐基础保湿
    }

    // 数组去重
    const uniqueConcerns = [...new Set(detectedConcerns)];

    // 根据提取的问题查询推荐商品
    let recommendedProducts = [];
    if (uniqueConcerns.length > 0) {
      const conditions = uniqueConcerns.map(concern => like(products.concerns, `%${concern}%`));
      recommendedProducts = await db.select().from(products).where(or(...conditions)).limit(3);
    }
    
    // 如果没有匹配到，推荐热销或默认商品
    if (recommendedProducts.length === 0) {
      recommendedProducts = await db.select().from(products).limit(3);
    }

    // 将结果存入数据库
    
    await db.insert(skinAnalysisRecords).values({
      userId,
      imageUrl,
      resultData: JSON.stringify(aiResult),
      type: 'basic',
      createdAt: new Date(),
    });

    res.json({
      success: true,
      imageUrl,
      result: aiResult,
      concerns: uniqueConcerns,
      recommendations: recommendedProducts
    });

  } catch (error: any) {
    console.error('Megvii Skin Analysis Error:', error);
    res.status(500).json({ error: error.message || '皮肤检测失败，请稍后重试' });
  }
});

// 获取当前登录用户的皮肤分析记录
router.get('/my-records', authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).user.id;
      
    // Wait, let's use sqlite.prepare for simplicity and correctness (ordering desc)
    const sqliteRecords = sqlite.prepare(`
      SELECT id, image_url, result_data, created_at
      FROM skin_analysis_records
      WHERE user_id = ?
      ORDER BY created_at DESC
    `).all(userId);
    
    res.json({ success: true, records: sqliteRecords });
  } catch (error: any) {
    console.error('Fetch My Skin Records Error:', error);
    res.status(500).json({ error: '获取测肤记录失败' });
  }
});

// 删除当前登录用户的某条皮肤分析记录
router.delete('/my-records/:id', authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const recordId = req.params.id;
    
    // 检查记录是否属于当前用户
    const record = sqlite.prepare('SELECT id FROM skin_analysis_records WHERE id = ? AND user_id = ?').get(recordId, userId);
    if (!record) {
      return res.status(404).json({ error: '记录不存在或无权删除' });
    }
    
    // 删除记录
    sqlite.prepare('DELETE FROM skin_analysis_records WHERE id = ?').run(recordId);
    
    res.json({ success: true, message: '记录已删除' });
  } catch (error: any) {
    console.error('Delete My Skin Record Error:', error);
    res.status(500).json({ error: '删除测肤记录失败' });
  }
});

export default router;
