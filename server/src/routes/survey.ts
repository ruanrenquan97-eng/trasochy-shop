import { Router, Request, Response } from 'express';
import { sqlite } from '../db/index';
import { authMiddleware, staffMiddleware, adminMiddleware } from '../middleware/auth';

const router = Router();

// ============================================================
// 非AI组 (传统搜索组) 问卷定义：21 题
// ============================================================
export const DEFAULT_NON_AI_SURVEY = {
  id: 'non_ai_survey_21',
  title: '线上护肤品购物体验研究 · 非AI组',
  subtitle: '正式调查问卷 · 非AI组',
  group_type: 'traditional_search',
  description: '感谢您参与本研究。请只根据您刚刚完成的购物体验作答。问卷没有标准答案，请选择最符合真实感受的选项。预计填写时间约3–5分钟。\n本问卷仅用于学术研究，数据以匿名编号保存。您可以在提交前随时退出。\n购物任务：请在预算不超过人民币300元的情况下，从网站提供的同类护肤产品中，最终只选择一款您最愿意购买的产品。本组不提供AI测肤或AI个性化推荐；无需真实付款。',
  sections: [
    {
      id: 'sec_a',
      title: 'A. 筛选与实验确认',
      intro: '若年龄不在18–28岁范围内，或不符合研究筛选条件，请按照网站提示结束流程。',
      questions: [
        { id: 'q1', text: '1. 您的年龄是？', type: 'single', required: true, options: ['18–20岁', '21–24岁', '25–28岁', '29岁或以上'] },
        { id: 'q2', text: '2. 您目前居住在哪个国家或地区？', type: 'single', required: true, options: ['中国', '瑞士', '其他'] },
        { id: 'q3', text: '3. 您是否有网上购物经验？', type: 'single', required: true, options: ['是', '否'] },
        { id: 'q4', text: '4. 在刚才的购物过程中，平台是否向您提供了基于人工智能（AI）的个性化产品推荐？', type: 'single', required: true, options: ['是', '否', '不确定'] }
      ]
    },
    {
      id: 'sec_b',
      title: 'B. 决策疲劳',
      intro: '遇到评分题时，请选择一个数字：\n1=非常不同意；2=不同意；3=有点不同意；4=既不同意也不反对；5=有点同意；6=同意；7=非常同意',
      questions: [
        { id: 'q5', text: '5. 作出最终产品选择时，我感到精神疲惫。', type: 'likert', required: true },
        { id: 'q6', text: '6. 选择产品需要我投入很多脑力。', type: 'likert', required: true },
        { id: 'q7', text: '7. 我被需要处理的信息量压得喘不过气。', type: 'likert', required: true },
        { id: 'q8', text: '8. 我很难作出最终决定。', type: 'likert', required: true }
      ]
    },
    {
      id: 'sec_c',
      title: 'C. 认知负荷',
      questions: [
        { id: 'q9', text: '9. 完成这项购物任务需要我投入大量注意力。', type: 'likert', required: true },
        { id: 'q10', text: '10. 我需要同时考虑很多不同的信息。', type: 'likert', required: true },
        { id: 'q11', text: '11. 整个产品选择过程对我来说很复杂。', type: 'likert', required: true }
      ]
    },
    {
      id: 'sec_d',
      title: 'D. 对平台的信任',
      questions: [
        { id: 'q12', text: '12. 我信任该平台提供的产品信息。', type: 'likert', required: true },
        { id: 'q13', text: '13. 我认为该平台是可靠的。', type: 'likert', required: true },
        { id: 'q14', text: '14. 平台提供的信息与我的购物需求相关。', type: 'likert', required: true }
      ]
    },
    {
      id: 'sec_e',
      title: 'E. 购买意愿',
      questions: [
        { id: 'q15', text: '15. 我会考虑购买我最终选择的产品。', type: 'likert', required: true },
        { id: 'q16', text: '16. 如果这是真实的购物情境，我购买该产品的可能性较高。', type: 'likert', required: true },
        { id: 'q17', text: '17. 这次购物体验提高了我的购买意愿。', type: 'likert', required: true }
      ]
    },
    {
      id: 'sec_f',
      title: 'F. 选择信心',
      questions: [
        { id: 'q18', text: '18. 我对自己最终作出的产品选择有信心。', type: 'likert', required: true }
      ]
    },
    {
      id: 'sec_g',
      title: 'G. 使用背景与反馈',
      questions: [
        { id: 'q19', text: '19. 在参加本研究以前，您使用ChatGPT或其他AI助手的频率是？', type: 'single', required: true, options: ['从未使用', '偶尔使用', '经常使用', '每天使用'] },
        { id: 'q20', text: '20. 您在刚才的购物过程中是否遇到技术问题？', type: 'single', required: true, options: ['没有', '页面加载缓慢', '产品信息无法正常显示', '其他'] },
        { id: 'q21', text: '21. 在购物过程中，哪一部分最帮助或阻碍您作出最终选择？为什么？', type: 'text', required: false }
      ]
    }
  ]
};

// ============================================================
// AI组 问卷定义：26 题
// ============================================================
export const DEFAULT_AI_SURVEY = {
  id: 'ai_survey_26',
  title: '线上护肤品购物体验研究 · AI组',
  subtitle: '正式调查问卷 · AI组',
  group_type: 'ai_assisted',
  description: '感谢您参与本研究。请只根据您刚刚完成的购物体验作答。问卷没有标准答案，请选择最符合真实感受的选项。预计填写时间约3–5分钟。\n本问卷仅用于学术研究，数据以匿名编号保存。您可以在提交前随时退出。\n购物任务：请在预算不超过人民币300元的情况下，从网站提供的同类护肤产品中，最终只选择一款您最愿意购买的产品。本组可以使用AI测肤和个性化推荐；无需真实付款。',
  sections: [
    {
      id: 'sec_a',
      title: 'A. 筛选与实验确认',
      intro: '若年龄不在18–28岁范围内，或不符合研究筛选条件，请按照网站提示结束流程。',
      questions: [
        { id: 'q1', text: '1. 您的年龄是？', type: 'single', required: true, options: ['18–20岁', '21–24岁', '25–28岁', '29岁或以上'] },
        { id: 'q2', text: '2. 您目前居住在哪个国家或地区？', type: 'single', required: true, options: ['中国', '瑞士', '其他'] },
        { id: 'q3', text: '3. 您是否有网上购物经验？', type: 'single', required: true, options: ['是', '否'] },
        { id: 'q4', text: '4. 在刚才的购物过程中，平台是否向您提供了基于人工智能（AI）的个性化产品推荐？', type: 'single', required: true, options: ['是', '否', '不确定'] }
      ]
    },
    {
      id: 'sec_b',
      title: 'B. 决策疲劳',
      intro: '遇到评分题时，请选择一个数字：\n1=非常不同意；2=不同意；3=有点不同意；4=既不同意也不反对；5=有点同意；6=同意；7=非常同意',
      questions: [
        { id: 'q5', text: '5. 作出最终产品选择时，我感到精神疲惫。', type: 'likert', required: true },
        { id: 'q6', text: '6. 选择产品需要我投入很多脑力。', type: 'likert', required: true },
        { id: 'q7', text: '7. 我被需要处理的信息量压得喘不过气。', type: 'likert', required: true },
        { id: 'q8', text: '8. 我很难作出最终决定。', type: 'likert', required: true }
      ]
    },
    {
      id: 'sec_c',
      title: 'C. 认知负荷',
      questions: [
        { id: 'q9', text: '9. 完成这项购物任务需要我投入大量注意力。', type: 'likert', required: true },
        { id: 'q10', text: '10. 我需要同时考虑很多不同的信息。', type: 'likert', required: true },
        { id: 'q11', text: '11. 整个产品选择过程对我来说很复杂。', type: 'likert', required: true }
      ]
    },
    {
      id: 'sec_d',
      title: 'D. 对平台的信任',
      questions: [
        { id: 'q12', text: '12. 我信任该平台提供的产品信息。', type: 'likert', required: true },
        { id: 'q13', text: '13. 我认为该平台是可靠的。', type: 'likert', required: true },
        { id: 'q14', text: '14. 平台提供的信息与我的购物需求相关。', type: 'likert', required: true }
      ]
    },
    {
      id: 'sec_e',
      title: 'E. 购买意愿',
      questions: [
        { id: 'q15', text: '15. 我会考虑购买我最终选择的产品。', type: 'likert', required: true },
        { id: 'q16', text: '16. 如果这是真实的购物情境，我购买该产品的可能性较高。', type: 'likert', required: true },
        { id: 'q17', text: '17. 这次购物体验提高了我的购买意愿。', type: 'likert', required: true }
      ]
    },
    {
      id: 'sec_f',
      title: 'F. 选择信心',
      questions: [
        { id: 'q18', text: '18. 我对自己最终作出的产品选择有信心。', type: 'likert', required: true }
      ]
    },
    {
      id: 'sec_g',
      title: 'G. 使用背景与反馈',
      questions: [
        { id: 'q19', text: '19. 在参加本研究以前，您使用ChatGPT或其他AI助手的频率是？', type: 'single', required: true, options: ['从未使用', '偶尔使用', '经常使用', '每天使用'] },
        { id: 'q20', text: '20. 您在刚才的购物过程中是否遇到技术问题？', type: 'single', required: true, options: ['没有', '页面加载缓慢', 'AI测试或推荐无法正常使用', '产品信息无法正常显示', '其他'] }
      ]
    },
    {
      id: 'sec_h',
      title: 'H. AI 使用体验（仅AI组）',
      questions: [
        { id: 'q21', text: '21. AI推荐符合我的个人需求。', type: 'likert', required: true },
        { id: 'q22', text: '22. AI推荐的产品与我的皮肤状况相关。', type: 'likert', required: true },
        { id: 'q23', text: '23. 我信任AI提供的推荐。', type: 'likert', required: true },
        { id: 'q24', text: '24. AI减少了我手动比较产品的工作。', type: 'likert', required: true },
        { id: 'q25', text: '25. 您最终选择的产品是否来自AI推荐结果？', type: 'single', required: true, options: ['是', '否', '不确定'] }
      ]
    },
    {
      id: 'sec_i',
      title: 'I. 开放反馈',
      questions: [
        { id: 'q26', text: '26. 在购物过程中，哪一部分最帮助或阻碍您作出最终选择？为什么？', type: 'text', required: false }
      ]
    }
  ]
};

export const DEFAULT_SURVEY_DEFINITION = DEFAULT_NON_AI_SURVEY;

const getSettingKeyForPath = (pathType?: string) => {
  if (pathType === 'ai_assisted') {
    return 'survey_definition_ai';
  }
  return 'survey_definition_non_ai';
};

// ============================================================
// GET /api/survey/questions
// 公开获取当前问卷定义 (支持 ?path_type=traditional_search 或 ai_assisted)
// ============================================================
router.get('/questions', (req: Request, res: Response) => {
  const pathType = (req.query.path_type as string) || 'traditional_search';
  const settingKey = getSettingKeyForPath(pathType);
  const defaultSurvey = pathType === 'ai_assisted' ? DEFAULT_AI_SURVEY : DEFAULT_NON_AI_SURVEY;

  try {
    const row = sqlite.prepare('SELECT value FROM site_settings WHERE key = ?').get(settingKey) as any;
    if (row && row.value) {
      try {
        const parsed = JSON.parse(row.value);
        res.json({ survey: parsed, path_type: pathType });
        return;
      } catch {}
    }
    res.json({ survey: defaultSurvey, path_type: pathType });
  } catch (error: any) {
    res.json({ survey: defaultSurvey, path_type: pathType });
  }
});

// ============================================================
// POST /api/survey/submit
// ============================================================
// IP 与城市解析及行为数据聚合工具函数
// ============================================================
const ipCityCache = new Map<string, string>();

async function resolveIpCity(ip?: string | null): Promise<string> {
  if (!ip) return '未知地区';
  const cleanIp = ip.replace('::ffff:', '').trim();
  if (['127.0.0.1', '::1', 'localhost'].includes(cleanIp) || cleanIp.startsWith('192.168.') || cleanIp.startsWith('10.') || cleanIp.startsWith('172.16.')) {
    return '本地局域网 (Local)';
  }
  if (ipCityCache.has(cleanIp)) {
    return ipCityCache.get(cleanIp)!;
  }
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 1500);
    const res = await fetch(`http://ip-api.com/json/${cleanIp}?lang=zh-CN`, { signal: controller.signal });
    clearTimeout(timer);
    if (res.ok) {
      const data = (await res.json()) as any;
      if (data && data.status === 'success') {
        const cityStr = [data.country, data.regionName, data.city].filter(Boolean).join(' ');
        ipCityCache.set(cleanIp, cityStr);
        return cityStr;
      }
    }
  } catch {}
  return '国内/国际访客';
}

function getSurveyQuestionMaps() {
  let nonAiSurvey = DEFAULT_NON_AI_SURVEY;
  let aiSurvey = DEFAULT_AI_SURVEY;
  try {
    const r1 = sqlite.prepare("SELECT value FROM site_settings WHERE key = 'survey_definition_non_ai'").get() as any;
    if (r1?.value) nonAiSurvey = JSON.parse(r1.value);
  } catch {}
  try {
    const r2 = sqlite.prepare("SELECT value FROM site_settings WHERE key = 'survey_definition_ai'").get() as any;
    if (r2?.value) aiSurvey = JSON.parse(r2.value);
  } catch {}

  const nonAiMap: Record<string, string> = {};
  nonAiSurvey.sections?.forEach((s: any) => {
    s.questions?.forEach((q: any) => { nonAiMap[q.id] = q.text; });
  });

  const aiMap: Record<string, string> = {};
  aiSurvey.sections?.forEach((s: any) => {
    s.questions?.forEach((q: any) => { aiMap[q.id] = q.text; });
  });

  return { nonAiMap, aiMap, nonAiSurvey, aiSurvey };
}

async function enrichResponseWithBehavior(r: any) {
  let meta: any = {};
  try {
    meta = typeof r.metadata === 'string' ? JSON.parse(r.metadata || '{}') : (r.metadata || {});
  } catch {}

  let answersObj: any = {};
  try {
    answersObj = typeof r.answers === 'string' ? JSON.parse(r.answers || '{}') : (r.answers || {});
  } catch {}

  // 1. 获取客户端 IP
  let ip = meta.client_ip || meta.ip;
  if (!ip && r.user_id) {
    const visit = sqlite.prepare('SELECT ip FROM site_visits WHERE user_id = ? ORDER BY created_at DESC LIMIT 1').get(r.user_id) as any;
    if (visit?.ip) ip = visit.ip;
  }
  if (!ip) ip = '127.0.0.1';

  // 2. IP 对应城市
  let city = meta.city;
  if (!city) {
    city = await resolveIpCity(ip);
  }

  // 3. 用户行为指标（平均停留时间、总停留时间、点击访问产品总数、访问产品列表）
  let avgDwellTime = meta.avg_dwell_time;
  let totalDwellTime = meta.total_dwell_time;
  let productsVisitedCount = meta.products_visited_count;
  let visitedProductNames = meta.visited_product_names;

  if (avgDwellTime === undefined || totalDwellTime === undefined || productsVisitedCount === undefined) {
    const behaviorStats = sqlite.prepare(`
      SELECT 
        ROUND(AVG(b.dwell_time), 1) as avg_dwell_time,
        SUM(b.dwell_time) as total_dwell_time,
        COUNT(DISTINCT CASE 
          WHEN b.product_id IS NOT NULL THEN b.product_id 
          WHEN b.path LIKE '/products/%' THEN b.path 
          ELSE NULL 
        END) as products_visited_count,
        GROUP_CONCAT(DISTINCT p.name) as visited_product_names
      FROM user_behavior_logs b
      LEFT JOIN products p ON b.product_id = p.id OR b.path = ('/products/' || p.slug)
      WHERE (b.user_id = ? AND ? IS NOT NULL) OR (b.session_id = ? AND b.session_id IS NOT NULL)
    `).get(r.user_id, r.user_id, meta.session_id || 'none') as any;

    if (behaviorStats) {
      avgDwellTime = behaviorStats.avg_dwell_time !== null ? behaviorStats.avg_dwell_time : 0;
      totalDwellTime = behaviorStats.total_dwell_time !== null ? behaviorStats.total_dwell_time : 0;
      productsVisitedCount = behaviorStats.products_visited_count || 0;
      visitedProductNames = behaviorStats.visited_product_names || '';
    } else {
      avgDwellTime = 0;
      totalDwellTime = 0;
      productsVisitedCount = 0;
      visitedProductNames = '';
    }
  }

  return {
    id: r.id,
    user_id: r.user_id,
    user_name: r.user_name || r.user_email || `UID:${r.user_id}`,
    user_email: r.user_email || '',
    user_phone: r.user_phone || '',
    path_type: r.path_type || 'traditional_search',
    cart_items_count: r.cart_items_count || 0,
    created_at: r.created_at,
    ip,
    city,
    avg_dwell_time: Number(avgDwellTime) || 0,
    total_dwell_time: Number(totalDwellTime) || 0,
    products_visited_count: Number(productsVisitedCount) || 0,
    visited_product_names: visitedProductNames || '无',
    answers: answersObj,
    metadata: meta
  };
}

function escapeCsvCell(val: any): string {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

// ============================================================
// POST /api/survey/submit
// 提交问卷答案（需登录）
// ============================================================
router.post('/submit', authMiddleware, async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const { answers, path_type = 'traditional_search', cart_items_count = 0, metadata = {}, session_id } = req.body;

  if (!answers || typeof answers !== 'object') {
    res.status(400).json({ error: '缺少问卷答案' });
    return;
  }

  try {
    // 捕获真实 IP 并解析城市
    const ipHeader = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1') as string;
    const clientIp = ipHeader.split(',')[0].trim();
    const city = await resolveIpCity(clientIp);

    // 查询该用户的平均停留时间与总访问商品数
    const effectiveSessionId = session_id || metadata?.session_id || 'none';
    const behaviorStats = sqlite.prepare(`
      SELECT 
        ROUND(AVG(b.dwell_time), 1) as avg_dwell_time,
        SUM(b.dwell_time) as total_dwell_time,
        COUNT(DISTINCT CASE 
          WHEN b.product_id IS NOT NULL THEN b.product_id 
          WHEN b.path LIKE '/products/%' THEN b.path 
          ELSE NULL 
        END) as products_visited_count,
        GROUP_CONCAT(DISTINCT p.name) as visited_product_names
      FROM user_behavior_logs b
      LEFT JOIN products p ON b.product_id = p.id OR b.path = ('/products/' || p.slug)
      WHERE (b.user_id = ? AND ? IS NOT NULL) OR (b.session_id = ? AND b.session_id IS NOT NULL)
    `).get(userId, userId, effectiveSessionId) as any;

    const enrichedMeta = {
      ...(typeof metadata === 'object' ? metadata : {}),
      client_ip: clientIp,
      city,
      session_id: effectiveSessionId,
      avg_dwell_time: behaviorStats?.avg_dwell_time !== null ? behaviorStats?.avg_dwell_time : 0,
      total_dwell_time: behaviorStats?.total_dwell_time !== null ? behaviorStats?.total_dwell_time : 0,
      products_visited_count: behaviorStats?.products_visited_count || 0,
      visited_product_names: behaviorStats?.visited_product_names || '',
      submitted_at: new Date().toISOString()
    };

    sqlite.prepare(`
      INSERT INTO survey_responses (user_id, answers, survey_type, path_type, cart_items_count, metadata, created_at)
      VALUES (?, ?, 'ai_vs_search', ?, ?, ?, ?)
    `).run(
      userId, 
      JSON.stringify(answers), 
      path_type === 'ai_assisted' ? 'ai_assisted' : 'traditional_search',
      Number(cart_items_count) || 0,
      JSON.stringify(enrichedMeta),
      Date.now()
    );

    // 尝试为用户发放问卷完成代金券（若配置开启）
    let couponGranted = null;
    try {
      const config = sqlite.prepare("SELECT * FROM coupon_configs WHERE source = 'quiz_completion' AND is_active = 1").get() as any;
      if (config) {
        const existingCoupon = sqlite.prepare("SELECT id FROM user_coupons WHERE user_id = ? AND source = 'quiz_completion'").get(userId);
        if (!existingCoupon) {
          const code = 'SURVEY-' + Math.random().toString(36).substring(2, 8).toUpperCase();
          const expiresAt = Date.now() + (config.valid_days || 30) * 24 * 60 * 60 * 1000;
          sqlite.prepare(`
            INSERT INTO user_coupons (user_id, code, type, value, min_amount, status, expires_at, source, description, created_at)
            VALUES (?, ?, ?, ?, ?, 'unused', ?, 'quiz_completion', ?, ?)
          `).run(
            userId,
            code,
            config.type,
            config.value,
            config.min_amount,
            expiresAt,
            config.description || '完成问卷调研奖励代金券',
            Date.now()
          );
          couponGranted = { code, value: config.value, type: config.type, min_amount: config.min_amount, expiresAt };
        }
      }
    } catch (couponErr) {
      console.error('[Survey] Auto coupon issue error:', couponErr);
    }

    res.json({ success: true, coupon: couponGranted });
  } catch (error: any) {
    console.error('[Survey] Submit error:', error);
    res.status(500).json({ error: error.message || '问卷提交失败，请稍后重试' });
  }
});

// ============================================================
// 管理员接口：获取问卷定义
// GET /api/survey/admin/questions?path_type=traditional_search | ai_assisted
// ============================================================
router.get('/admin/questions', authMiddleware, staffMiddleware, (req: Request, res: Response) => {
  const pathType = (req.query.path_type as string) || 'traditional_search';
  const settingKey = getSettingKeyForPath(pathType);
  const defaultSurvey = pathType === 'ai_assisted' ? DEFAULT_AI_SURVEY : DEFAULT_NON_AI_SURVEY;

  try {
    const row = sqlite.prepare('SELECT value FROM site_settings WHERE key = ?').get(settingKey) as any;
    if (row && row.value) {
      try {
        const parsed = JSON.parse(row.value);
        res.json({ survey: parsed, path_type: pathType });
        return;
      } catch {}
    }
    res.json({ survey: defaultSurvey, path_type: pathType });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// 管理员接口：保存问卷定义
// PUT /api/survey/admin/questions
// ============================================================
router.put('/admin/questions', authMiddleware, adminMiddleware, (req: Request, res: Response) => {
  const { survey, path_type = 'traditional_search' } = req.body;
  if (!survey || !Array.isArray(survey.sections)) {
    res.status(400).json({ error: '问卷数据结构不合法' });
    return;
  }

  const settingKey = getSettingKeyForPath(path_type);

  try {
    const now = Date.now();
    const val = JSON.stringify(survey);
    const existing = sqlite.prepare('SELECT key FROM site_settings WHERE key = ?').get(settingKey);
    if (existing) {
      sqlite.prepare('UPDATE site_settings SET value = ?, updated_at = ? WHERE key = ?').run(val, now, settingKey);
    } else {
      sqlite.prepare('INSERT INTO site_settings (key, value, description, updated_at) VALUES (?, ?, ?, ?)').run(
        settingKey,
        val,
        `学术调研问卷定义（${path_type === 'ai_assisted' ? 'AI组26题' : '非AI组21题'}）`,
        now
      );
    }
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// 管理员接口：获取所有答卷明细及统计分析（带行为数据画像）
// GET /api/survey/admin/responses
// ============================================================
router.get('/admin/responses', authMiddleware, staffMiddleware, async (req: Request, res: Response) => {
  const { page = '1', limit = '20', path_type } = req.query;
  const pageNum = parseInt(page as string) || 1;
  const limitNum = parseInt(limit as string) || 20;
  const offset = (pageNum - 1) * limitNum;

  try {
    let countSql = 'SELECT count(*) as c FROM survey_responses';
    let dataSql = `
      SELECT sr.*, u.name as user_name, u.email as user_email, u.phone as user_phone
      FROM survey_responses sr
      LEFT JOIN users u ON sr.user_id = u.id
    `;
    const params: any[] = [];

    if (path_type) {
      countSql += ' WHERE sr.path_type = ?';
      dataSql += ' WHERE sr.path_type = ?';
      params.push(path_type);
    }

    dataSql += ' ORDER BY sr.created_at DESC LIMIT ? OFFSET ?';

    const total = (sqlite.prepare(countSql).get(...params) as any).c;
    const rows = sqlite.prepare(dataSql).all(...params, limitNum, offset) as any[];

    // 聚合丰富用户停留时间与行为数据
    const list = await Promise.all(rows.map(r => enrichResponseWithBehavior(r)));

    // 分组对比统计（传统组 vs AI 辅助组）
    const allRows = sqlite.prepare('SELECT answers, path_type FROM survey_responses').all() as any[];
    
    const calculateGroupStats = (filterPath?: string) => {
      const stats: Record<string, { totalScore: number; count: number; options: Record<string, number> }> = {};
      const filtered = filterPath ? allRows.filter(r => (r.path_type || 'traditional_search') === filterPath) : allRows;
      
      filtered.forEach(row => {
        try {
          const ans = JSON.parse(row.answers);
          Object.entries(ans).forEach(([qId, val]) => {
            if (!stats[qId]) stats[qId] = { totalScore: 0, count: 0, options: {} };
            if (typeof val === 'number') {
              stats[qId].totalScore += val;
              stats[qId].count += 1;
            } else if (typeof val === 'string') {
              stats[qId].options[val] = (stats[qId].options[val] || 0) + 1;
              stats[qId].count += 1;
            }
          });
        } catch {}
      });

      const questionStats: Record<string, any> = {};
      Object.entries(stats).forEach(([qId, s]) => {
        questionStats[qId] = {
          count: s.count,
          avg: s.count > 0 && s.totalScore > 0 ? (s.totalScore / s.count).toFixed(2) : null,
          options: s.options
        };
      });
      return { total: filtered.length, questionStats };
    };

    const overall = calculateGroupStats();
    const traditional = calculateGroupStats('traditional_search');
    const aiAssisted = calculateGroupStats('ai_assisted');

    res.json({ 
      total, 
      page: pageNum, 
      responses: list, 
      questionStats: overall.questionStats,
      comparison: {
        traditional_count: traditional.total,
        traditional_stats: traditional.questionStats,
        ai_count: aiAssisted.total,
        ai_stats: aiAssisted.questionStats
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// 管理员接口：一键导出所有答卷完整数据（包含完整题目、停留时间、IP城市、访问商品数）
// GET /api/survey/admin/export?format=csv|json
// ============================================================
router.get('/admin/export', authMiddleware, staffMiddleware, async (req: Request, res: Response) => {
  const { path_type, format = 'csv' } = req.query;

  try {
    let dataSql = `
      SELECT sr.*, u.name as user_name, u.email as user_email, u.phone as user_phone
      FROM survey_responses sr
      LEFT JOIN users u ON sr.user_id = u.id
    `;
    const params: any[] = [];

    if (path_type) {
      dataSql += ' WHERE sr.path_type = ?';
      params.push(path_type);
    }

    dataSql += ' ORDER BY sr.created_at ASC';

    const rows = sqlite.prepare(dataSql).all(...params) as any[];
    const enrichedList = await Promise.all(rows.map(r => enrichResponseWithBehavior(r)));

    // 获取两组的完整题库定义映射
    const { nonAiMap, aiMap } = getSurveyQuestionMaps();

    // 预定义各列完整题目标题
    const standardQuestionHeaders = [
      { id: 'q1', text: nonAiMap['q1'] || '1. 您的年龄是？' },
      { id: 'q2', text: nonAiMap['q2'] || '2. 您目前居住在哪个国家或地区？' },
      { id: 'q3', text: nonAiMap['q3'] || '3. 您是否有网上购物经验？' },
      { id: 'q4', text: nonAiMap['q4'] || '4. 在刚才的购物过程中，平台是否向您提供了基于人工智能（AI）的个性化产品推荐？' },
      { id: 'q5', text: nonAiMap['q5'] || '5. 作出最终产品选择时，我感到精神疲惫。(1-7分)' },
      { id: 'q6', text: nonAiMap['q6'] || '6. 选择产品需要我投入很多脑力。(1-7分)' },
      { id: 'q7', text: nonAiMap['q7'] || '7. 我被需要处理的信息量压得喘不过气。(1-7分)' },
      { id: 'q8', text: nonAiMap['q8'] || '8. 我很难作出最终决定。(1-7分)' },
      { id: 'q9', text: nonAiMap['q9'] || '9. 完成这项购物任务需要我投入大量注意力。(1-7分)' },
      { id: 'q10', text: nonAiMap['q10'] || '10. 我需要同时考虑很多不同的信息。(1-7分)' },
      { id: 'q11', text: nonAiMap['q11'] || '11. 整个产品选择过程对我来说很复杂。(1-7分)' },
      { id: 'q12', text: nonAiMap['q12'] || '12. 我信任该平台提供的产品信息。(1-7分)' },
      { id: 'q13', text: nonAiMap['q13'] || '13. 我认为该平台是可靠的。(1-7分)' },
      { id: 'q14', text: nonAiMap['q14'] || '14. 平台提供的信息与我的购物需求相关。(1-7分)' },
      { id: 'q15', text: nonAiMap['q15'] || '15. 我会考虑购买我最终选择的产品。(1-7分)' },
      { id: 'q16', text: nonAiMap['q16'] || '16. 如果这是真实的购物情境，我购买该产品的可能性较高。(1-7分)' },
      { id: 'q17', text: nonAiMap['q17'] || '17. 这次购物体验提高了我的购买意愿。(1-7分)' },
      { id: 'q18', text: nonAiMap['q18'] || '18. 我对自己最终作出的产品选择有信心。(1-7分)' },
      { id: 'q19', text: nonAiMap['q19'] || '19. 在参加本研究以前，您使用ChatGPT或其他AI助手的频率是？' },
      { id: 'q20', text: nonAiMap['q20'] || '20. 您在刚才的购物过程中是否遇到技术问题？' },
      // AI 组专属题
      { id: 'q21_ai', text: aiMap['q21'] || '21. AI推荐符合我的个人需求。(1-7分·仅AI组)' },
      { id: 'q22_ai', text: aiMap['q22'] || '22. AI推荐的产品与我的皮肤状况相关。(1-7分·仅AI组)' },
      { id: 'q23_ai', text: aiMap['q23'] || '23. 我信任AI提供的推荐。(1-7分·仅AI组)' },
      { id: 'q24_ai', text: aiMap['q24'] || '24. AI减少了我手动比较产品的工作。(1-7分·仅AI组)' },
      { id: 'q25_ai', text: aiMap['q25'] || '25. 您最终选择的产品是否来自AI推荐结果？(仅AI组)' },
      // 开放题
      { id: 'open_feedback', text: '开放题反馈：在购物过程中，哪一部分最帮助或阻碍您作出最终选择？为什么？' }
    ];

    if (format === 'json') {
      res.json({
        total: enrichedList.length,
        questionHeaders: standardQuestionHeaders,
        responses: enrichedList
      });
      return;
    }

    // 生成完整 CSV 表格数据
    const baseHeaders = [
      '答卷编号',
      '用户ID',
      '用户姓名',
      '用户账号/邮箱',
      '实验组别',
      '选购加购商品数(件)',
      '用户页面平均停留时间(秒)',
      '用户页面总停留时间(秒)',
      '客户总共点击访问商品数(款)',
      '访问过的商品名称列表',
      'IP地址',
      'IP所在城市',
      '问卷提交时间'
    ];

    const allCsvHeaders = [...baseHeaders, ...standardQuestionHeaders.map(h => h.text)];
    const csvRows: string[] = [];

    // 首行：表头
    csvRows.push(allCsvHeaders.map(escapeCsvCell).join(','));

    // 数据行
    enrichedList.forEach(r => {
      const isAi = r.path_type === 'ai_assisted';
      const ans = r.answers || {};

      // 提取开放题回答
      let openAns = '';
      if (!isAi) {
        openAns = ans['q21'] || ans['q26'] || ans['q27'] || '';
      } else {
        openAns = ans['q26'] || ans['q27'] || ans['q21_feedback'] || '';
      }

      const rowValues = [
        `#${r.id}`,
        r.user_id,
        r.user_name,
        r.user_email || '游客/未绑定',
        isAi ? 'AI 组 (26题)' : '非 AI 组 (21题)',
        r.cart_items_count,
        r.avg_dwell_time,
        r.total_dwell_time,
        r.products_visited_count,
        r.visited_product_names,
        r.ip,
        r.city,
        new Date(r.created_at).toLocaleString('zh-CN', { hour12: false }),
        // Q1 - Q20
        ans['q1'] ?? '-',
        ans['q2'] ?? '-',
        ans['q3'] ?? '-',
        ans['q4'] ?? '-',
        ans['q5'] ?? '-',
        ans['q6'] ?? '-',
        ans['q7'] ?? '-',
        ans['q8'] ?? '-',
        ans['q9'] ?? '-',
        ans['q10'] ?? '-',
        ans['q11'] ?? '-',
        ans['q12'] ?? '-',
        ans['q13'] ?? '-',
        ans['q14'] ?? '-',
        ans['q15'] ?? '-',
        ans['q16'] ?? '-',
        ans['q17'] ?? '-',
        ans['q18'] ?? '-',
        ans['q19'] ?? '-',
        ans['q20'] ?? '-',
        // AI 组专属 Q21-Q25
        isAi ? (ans['q21'] ?? '-') : '非AI组无此题',
        isAi ? (ans['q22'] ?? '-') : '非AI组无此题',
        isAi ? (ans['q23'] ?? '-') : '非AI组无此题',
        isAi ? (ans['q24'] ?? '-') : '非AI组无此题',
        isAi ? (ans['q25'] ?? '-') : '非AI组无此题',
        // 开放题
        openAns || '-'
      ];

      csvRows.push(rowValues.map(escapeCsvCell).join(','));
    });

    // 附带 UTF-8 BOM 确保 Windows/Mac Excel 打开中文不乱码
    const csvContent = '\uFEFF' + csvRows.join('\r\n');
    const dateStr = new Date().toISOString().split('T')[0];
    const fileName = `TRASOCHY_问卷回收全量数据_${dateStr}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
    res.send(csvContent);
  } catch (error: any) {
    console.error('[Survey Export Error]', error);
    res.status(500).json({ error: error.message || '导出问卷数据失败' });
  }
});

// ============================================================
// 管理员接口：删除单条答卷
// DELETE /api/survey/admin/responses/:id
// ============================================================
router.delete('/admin/responses/:id', adminMiddleware, (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    sqlite.prepare('DELETE FROM survey_responses WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

