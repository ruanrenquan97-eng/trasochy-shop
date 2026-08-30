import cron from 'node-cron';
import { sqlite } from '../db';
import fs from 'fs';
import path from 'path';
import { createArticleCoverImage } from './imageGenerator';
import { DreaminaService } from '../services/dreaminaService';

export function initCronJobs() {
  // 每周一凌晨 2:00 生成报告
  cron.schedule('0 2 * * 1', async () => {
    console.log('[Cron] Starting weekly AI Operations Report generation...');
    try {
      await generateAndSaveReport();
    } catch (err) {
      console.error('[Cron] Failed to generate weekly report:', err);
    }
  });

  // 每天凌晨 3:00 检查并生成AI文章
  cron.schedule('0 3 * * *', async () => {
    console.log('[Cron] Starting daily AI Article generation check...');
    try {
      await generateAndSaveArticle();
    } catch (err) {
      console.error('[Cron] Failed to generate AI article:', err);
    }
  });

  // 每分钟检查一次促销活动过期时间
  cron.schedule('* * * * *', async () => {
    try {
      await checkPromoExpiration();
    } catch (err) {
      console.error('[Cron] Failed to check promo expiration:', err);
    }
  });

  // 每 10 秒查询一次即梦异步任务的状态
  cron.schedule('*/10 * * * * *', async () => {
    try {
      await pollDreaminaTasks();
    } catch (err) {
      console.error('[Cron] Failed to poll Dreamina tasks:', err);
    }
  });
}

export async function checkPromoExpiration() {
  const row = sqlite.prepare(`SELECT value FROM site_settings WHERE key = 'promo_end_time'`).get() as { value: string } | undefined;
  if (!row || !row.value) return;

  const endTimeStr = row.value;
  const endTime = new Date(endTimeStr).getTime();
  if (isNaN(endTime)) return; // Invalid date

  const now = Date.now();
  if (now >= endTime) {
    // Check if any of the promo switches are on
    const keys = ['promo_bar_active', 'promo_discount_active', 'promo_modal_active'];
    let shouldUpdate = false;
    
    for (const key of keys) {
      const activeRow = sqlite.prepare(`SELECT value FROM site_settings WHERE key = ?`).get(key) as { value: string } | undefined;
      if (activeRow && activeRow.value === '1') {
        shouldUpdate = true;
        break;
      }
    }

    if (shouldUpdate) {
      console.log('[Cron] Promo expired. Disabling promo activities...');
      const updateStmt = sqlite.prepare(`UPDATE site_settings SET value = '0', updated_at = ? WHERE key = ?`);
      const tNow = Date.now();
      for (const key of keys) {
        updateStmt.run(tNow, key);
      }
      // Clear promo_end_time so we don't keep doing this
      sqlite.prepare(`UPDATE site_settings SET value = '', updated_at = ? WHERE key = 'promo_end_time'`).run(tNow);
      console.log('[Cron] Successfully disabled promo activities and cleared promo_end_time.');
    }
  }
}

export async function generateAndSaveArticle() {
  const getSetting = (key: string) => {
    const row = sqlite.prepare(`SELECT value FROM site_settings WHERE key = ?`).get(key) as { value: string } | undefined;
    return row?.value;
  };

  const autoEnabled = getSetting('ai_article_auto_enabled');
  if (autoEnabled !== '1') {
    return;
  }

  const apiKey = getSetting('ai_api_key') || process.env.DASHSCOPE_API_KEY;
  if (!apiKey) {
    console.error('[Cron] AI Article Gen: No DashScope API Key configured.');
    return;
  }

  const freqStr = getSetting('ai_article_frequency') || '1';
  const frequencyDays = parseInt(freqStr, 10) || 1;

  // 检查距离上一次 AI 自动生成的文章是否达到了设置的频率
  const lastAiArticle = sqlite.prepare(`
    SELECT created_at FROM articles 
    WHERE is_ai_generated = 1 
    ORDER BY created_at DESC LIMIT 1
  `).get() as any;

  if (lastAiArticle) {
    const lastTime = new Date(lastAiArticle.created_at).getTime();
    const now = Date.now();
    const diffDays = (now - lastTime) / (1000 * 60 * 60 * 24);
    if (diffDays < frequencyDays) {
      console.log(`[Cron] AI Article Gen: Skipped. Last generated ${diffDays.toFixed(1)} days ago, frequency is ${frequencyDays} days.`);
      return;
    }
  }

  let keywordsStr = getSetting('ai_article_keywords');
  let keywordsArr = (keywordsStr || '').split(',').map(k => k.trim()).filter(k => k);
  
  if (keywordsArr.length === 0) {
    // 自动从全局 SEO 词库中获取
    const globalRaw = getSetting('global_seo_keywords') || '';
    try {
      const parsed = JSON.parse(globalRaw);
      if (Array.isArray(parsed)) {
        keywordsArr = parsed.flatMap((b: any) => b.keywords);
      }
    } catch(e) {
      keywordsArr = globalRaw.split(',').map((k: string) => k.trim()).filter(Boolean);
    }
    keywordsArr = Array.from(new Set(keywordsArr));
  }

  if (keywordsArr.length === 0) {
    keywordsArr = ['护肤', '成分', '抗老', '美白', '保湿']; // fallback
  }

  // 随机挑选一个关键词作为主题
  const randomKeyword = keywordsArr[Math.floor(Math.random() * keywordsArr.length)];
  const systemPrompt = `你是一位专业的院线护肤品牌 (TRASOCHY) 的内容编辑和护肤专家，精通 GEO (生成式引擎优化) 和 SEO 技术。
你的任务是根据给定的核心关键词，撰写一篇极具权威性、高质量的护肤科普文章，目的是让 AI 搜索引擎 (如 ChatGPT, Claude, Perplexity) 能够完美抓取并作为权威资料引用。
要求：
1. 输出必须是标准的 Markdown 格式。
2. 第一行必须是文章的主标题 (使用 # 标题，标题需包含核心关键词且极具吸引力)。
3. 内容结构清晰，必须包含：前沿科学背景、核心知识点深度解析、成分原理、以及权威总结。
4. 语气专业、客观、基于循证医学，同时易于理解，体现品牌的高端院线定位。
5. 字数控制在 800-1200 字之间。
6. 自然地在关键段落融入相关衍生词，确保 GEO 抓取时的语义连贯性。`;

  const userPrompt = `本次 GEO 优化核心词为：“${randomKeyword}”。请以此为核心展开深度的科普创作。`;

  const response = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'qwen-plus',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error('AI API returned an error: ' + errText);
  }

  const data: any = await response.json();
  const articleMarkdown = data.choices?.[0]?.message?.content;

  if (!articleMarkdown) {
    throw new Error('Empty article content');
  }

  // 从 Markdown 中提取标题 (第一行以 # 开头的内容)
  const lines = articleMarkdown.split('\\n');
  let title = '护肤科普：' + randomKeyword;
  let content = articleMarkdown;

  const titleMatch = articleMarkdown.match(/^#\\s+(.+)$/m);
  if (titleMatch) {
    title = titleMatch[1].trim();
    // 移除正文中的第一行标题避免重复
    content = articleMarkdown.replace(/^#\\s+(.+)\\n/, '');
  }

  const slug = `auto-ai-${Date.now()}`;
  const now = Date.now();

  // Generate beautiful custom cover image
  const coverStyle = getSetting('ai_article_cover_style') || 'svg';
  const coverImage = await createArticleCoverImage({
    title,
    subtitle: randomKeyword,
    keywords: [randomKeyword],
    content,
    coverStyle,
    apiKey,
  });

  sqlite.prepare(`
    INSERT INTO articles (title, slug, content, cover_image, status, is_ai_generated, keywords, published_at, created_at, updated_at)
    VALUES (?, ?, ?, ?, 'published', 1, ?, ?, ?, ?)
  `).run(title, slug, content, coverImage, JSON.stringify([randomKeyword]), now, now, now);

  console.log('[Cron] Successfully generated and saved AI article for keyword:', randomKeyword);
}


export async function generateAndSaveReport() {
  const getSetting = (key: string) => {
    const row = sqlite.prepare(`SELECT value FROM site_settings WHERE key = ?`).get(key) as { value: string } | undefined;
    return row?.value;
  };

  const apiKey = getSetting('ai_api_key') || process.env.DASHSCOPE_API_KEY;
  if (!apiKey) {
    throw new Error('No DashScope API Key configured.');
  }

  // 1. 获取近期全站行为数据
  const behaviorData = sqlite.prepare(`
    SELECT b.action_type, b.path, p.name as product_name, p.price as base_price, SUM(b.dwell_time) as total_dwell, COUNT(*) as action_count
    FROM user_behavior_logs b
    LEFT JOIN products p ON b.product_id = p.id OR b.path = ('/products/' || p.slug)
    GROUP BY b.action_type, b.path, p.name, p.price
    ORDER BY action_count DESC, total_dwell DESC
    LIMIT 50
  `).all() as any[];

  // 1.1 获取专门针对商品的停留时长排行榜（Product Dwell Time）
  const productDwellData = sqlite.prepare(`
    SELECT 
      p.name as product_name,
      p.price as product_price,
      p.category_name,
      COUNT(DISTINCT b.session_id) as unique_visitors,
      COUNT(*) as view_count,
      SUM(b.dwell_time) as total_dwell_seconds,
      ROUND(AVG(b.dwell_time), 1) as avg_dwell_seconds
    FROM user_behavior_logs b
    JOIN products p ON b.product_id = p.id OR b.path = ('/products/' || p.slug)
    WHERE b.action_type = 'page_view'
    GROUP BY p.id, p.name, p.price, p.category_name
    ORDER BY total_dwell_seconds DESC
    LIMIT 20
  `).all() as any[];

  if ((!behaviorData || behaviorData.length === 0) && (!productDwellData || productDwellData.length === 0)) {
    console.log('[Cron] No behavior data to analyze. Skipping report generation.');
    return;
  }

  // 2. 将数据格式化为文本
  const productDwellStr = productDwellData.map((d, i) => {
    return `${i + 1}. 商品:【${d.product_name}】(分类:${d.category_name || '未分类'}, 售价:￥${d.product_price}) | 累计停留: ${d.total_dwell_seconds}秒, 平均每次停留: ${d.avg_dwell_seconds}秒, 浏览次数: ${d.view_count}次, 独立访客: ${d.unique_visitors}人`;
  }).join('\n');

  const generalDataStr = behaviorData.map(d => {
    let line = `- 操作: ${d.action_type}, 路径: ${d.path}, 次数: ${d.action_count}, 总停留: ${d.total_dwell || 0}秒`;
    if (d.product_name) {
      line += `, 商品: ${d.product_name} (￥${d.base_price})`;
    }
    return line;
  }).join('\n');

  // 3. 构建 Prompt
  const systemPrompt = `你是一位名为 TRASOCHY AI 的首席电商运营总监。你的任务是根据给定的近期网站访客行为数据（尤其是客户在具体商品详情页的停留时长、跳出情况及浏览频次），进行深度的商业洞察分析，并输出一份排版专业、数据详实、具有可实操性的《AI 智能运营与商品推广策略报告》。`;
  
  const userPrompt = `以下是商城系统采集到的真实用户行为埋点与【商品页面客户停留时长数据】：

【重点：客户进入各产品页面的停留时间与关注度排行】
${productDwellStr || '（近期暂无单品停留数据）'}

【全站路径与交互行为概览】
${generalDataStr}

请作为首席运营总监，深度分析以上客户停留数据，输出一份专业的 Markdown 策略报告，需包含以下模块：
1. 【商品停留时长与客户兴趣洞察】：
   - 重点剖析哪些商品客户停留时间最长（高兴趣高粘性），分析其吸引客户的可能原因；
   - 重点指出哪些商品虽然有浏览但平均停留很短（流失风险高），给出首屏视觉或文案改善建议；
   - 指出“高停留时长但缺乏加购转化”的潜在瓶颈（如定价疑虑、缺乏信任背书、功效说明不详）。
2. 【商品运营与组合定价方案】：
   - 针对高停留热度单品，建议如何搭配连带销售（如打包成「抗老组合」或「修护套装」）；
   - 针对长停留商品，给出具体的价格锚点、限时优惠券或满赠小样策略。
3. 【全站转化提升与营销实操行动计划】：
   - 针对非AI组与AI组用户群，建议采用何种弹窗引导、测肤推荐或社群私域转化手段。

请保持客观、专业，并在可能的情况下给出具体的定价数字、券额（如满300减40）与排期建议。`;

  // 4. 调用 API
  const response = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'qwen-plus',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error('AI API returned an error: ' + errText);
  }

  const data: any = await response.json();
  const report = data.choices?.[0]?.message?.content;

  if (!report) {
    throw new Error('Empty report content');
  }

  // 5. 落盘存储
  const reportsDir = path.join(process.cwd(), 'uploads', 'reports');
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  const dateStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const fileName = `AI_Operations_Report_${dateStr}_${Date.now()}.md`;
  const filePath = path.join(reportsDir, fileName);

  fs.writeFileSync(filePath, report, 'utf-8');
  console.log('[Cron] Weekly report saved to:', filePath);

  // 6. 清理过期数据
  // 删除当前分析所使用的数据，以避免数据堆积
  // 由于 SQLite 默认 WAL 模式，直接 DELETE 是安全的
  const result = sqlite.prepare(`DELETE FROM user_behavior_logs`).run();
  console.log(`[Cron] Cleaned up ${result.changes} old behavior records.`);
  
  return report;
}

export async function pollDreaminaTasks() {
  try {
    // 查找所有正在生成中（querying）的任务
    const pendingTasks = sqlite.prepare(`
      SELECT submit_id FROM dreamina_tasks WHERE status = 'querying'
    `).all() as any[];

    if (!pendingTasks || pendingTasks.length === 0) return;

    console.log(`[Cron] Found ${pendingTasks.length} pending Dreamina tasks. Polling status...`);

    const downloadDir = path.join(process.cwd(), 'uploads', 'dreamina');

    for (const task of pendingTasks) {
      const submitId = task.submit_id;
      try {
        const result = await DreaminaService.queryResult(submitId, downloadDir);
        
        if (result.status === 'success') {
          const now = Date.now();
          sqlite.prepare(`
            UPDATE dreamina_tasks 
            SET status = 'success', result_urls = ?, updated_at = ? 
            WHERE submit_id = ?
          `).run(JSON.stringify(result.resultUrls || []), now, submitId);
          console.log(`[Cron] Dreamina task ${submitId} completed successfully! Files:`, result.resultUrls);
        } else if (result.status === 'fail') {
          const now = Date.now();
          sqlite.prepare(`
            UPDATE dreamina_tasks 
            SET status = 'fail', fail_reason = ?, updated_at = ? 
            WHERE submit_id = ?
          `).run(result.failReason || 'Unknown error', now, submitId);
          console.log(`[Cron] Dreamina task ${submitId} failed. Reason:`, result.failReason);
        }
      } catch (err: any) {
        console.error(`[Cron] Failed to poll status for Dreamina task ${submitId}:`, err.message);
      }
    }
  } catch (err: any) {
    console.error('[Cron] Dreamina polling error:', err.message);
  }
}
