"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initCronJobs = initCronJobs;
exports.checkPromoExpiration = checkPromoExpiration;
exports.generateAndSaveArticle = generateAndSaveArticle;
exports.generateAndSaveReport = generateAndSaveReport;
const node_cron_1 = __importDefault(require("node-cron"));
const db_1 = require("../db");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
function initCronJobs() {
    // 每周一凌晨 2:00 生成报告
    node_cron_1.default.schedule('0 2 * * 1', async () => {
        console.log('[Cron] Starting weekly AI Operations Report generation...');
        try {
            await generateAndSaveReport();
        }
        catch (err) {
            console.error('[Cron] Failed to generate weekly report:', err);
        }
    });
    // 每天凌晨 3:00 检查并生成AI文章
    node_cron_1.default.schedule('0 3 * * *', async () => {
        console.log('[Cron] Starting daily AI Article generation check...');
        try {
            await generateAndSaveArticle();
        }
        catch (err) {
            console.error('[Cron] Failed to generate AI article:', err);
        }
    });
    // 每分钟检查一次促销活动过期时间
    node_cron_1.default.schedule('* * * * *', async () => {
        try {
            await checkPromoExpiration();
        }
        catch (err) {
            console.error('[Cron] Failed to check promo expiration:', err);
        }
    });
}
async function checkPromoExpiration() {
    const row = db_1.sqlite.prepare(`SELECT value FROM site_settings WHERE key = 'promo_end_time'`).get();
    if (!row || !row.value)
        return;
    const endTimeStr = row.value;
    const endTime = new Date(endTimeStr).getTime();
    if (isNaN(endTime))
        return; // Invalid date
    const now = Date.now();
    if (now >= endTime) {
        // Check if any of the promo switches are on
        const keys = ['promo_bar_active', 'promo_discount_active', 'promo_modal_active'];
        let shouldUpdate = false;
        for (const key of keys) {
            const activeRow = db_1.sqlite.prepare(`SELECT value FROM site_settings WHERE key = ?`).get(key);
            if (activeRow && activeRow.value === '1') {
                shouldUpdate = true;
                break;
            }
        }
        if (shouldUpdate) {
            console.log('[Cron] Promo expired. Disabling promo activities...');
            const updateStmt = db_1.sqlite.prepare(`UPDATE site_settings SET value = '0', updated_at = ? WHERE key = ?`);
            const tNow = Date.now();
            for (const key of keys) {
                updateStmt.run(tNow, key);
            }
            // Clear promo_end_time so we don't keep doing this
            db_1.sqlite.prepare(`UPDATE site_settings SET value = '', updated_at = ? WHERE key = 'promo_end_time'`).run(tNow);
            console.log('[Cron] Successfully disabled promo activities and cleared promo_end_time.');
        }
    }
}
async function generateAndSaveArticle() {
    const getSetting = (key) => {
        const row = db_1.sqlite.prepare(`SELECT value FROM site_settings WHERE key = ?`).get(key);
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
    const lastAiArticle = db_1.sqlite.prepare(`
    SELECT created_at FROM articles 
    WHERE is_ai_generated = 1 
    ORDER BY created_at DESC LIMIT 1
  `).get();
    if (lastAiArticle) {
        const lastTime = new Date(lastAiArticle.created_at).getTime();
        const now = Date.now();
        const diffDays = (now - lastTime) / (1000 * 60 * 60 * 24);
        if (diffDays < frequencyDays) {
            console.log(`[Cron] AI Article Gen: Skipped. Last generated ${diffDays.toFixed(1)} days ago, frequency is ${frequencyDays} days.`);
            return;
        }
    }
    const keywordsStr = getSetting('ai_article_keywords') || '护肤,成分,抗老,美白,保湿';
    const keywordsArr = keywordsStr.split(',').map(k => k.trim()).filter(k => k);
    if (keywordsArr.length === 0) {
        console.log('[Cron] AI Article Gen: No keywords configured.');
        return;
    }
    // 随机挑选一个关键词作为主题
    const randomKeyword = keywordsArr[Math.floor(Math.random() * keywordsArr.length)];
    const systemPrompt = `你是一位专业的院线护肤品牌 (TRASOCHY) 的内容编辑和护肤专家。
你的任务是根据给定的主题或关键词，撰写一篇高质量的护肤科普文章或品牌动态。
要求：
1. 输出必须是标准的 Markdown 格式。
2. 第一行必须是文章的主标题 (使用 # 标题)。
3. 内容结构清晰，包含前言、核心知识点讲解、以及总结。使用适当的二级(##)和三级(###)标题。
4. 语气专业、科学，同时易于普通消费者理解。
5. 字数控制在 600-1000 字之间。
6. 如果适用，可以在文章中自然地推荐相关的护肤理念或成分。`;
    const userPrompt = `请以“${randomKeyword}”为核心主题写一篇专业的护肤科普文章。`;
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
    const data = await response.json();
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
    db_1.sqlite.prepare(`
    INSERT INTO articles (title, slug, content, status, is_ai_generated, keywords, published_at, created_at, updated_at)
    VALUES (?, ?, ?, 'published', 1, ?, ?, ?, ?)
  `).run(title, slug, content, JSON.stringify([randomKeyword]), now, now, now);
    console.log('[Cron] Successfully generated and saved AI article for keyword:', randomKeyword);
}
async function generateAndSaveReport() {
    const getSetting = (key) => {
        const row = db_1.sqlite.prepare(`SELECT value FROM site_settings WHERE key = ?`).get(key);
        return row?.value;
    };
    const apiKey = getSetting('ai_api_key') || process.env.DASHSCOPE_API_KEY;
    if (!apiKey) {
        throw new Error('No DashScope API Key configured.');
    }
    // 1. 获取近期行为数据
    const behaviorData = db_1.sqlite.prepare(`
    SELECT b.action_type, b.path, p.name as product_name, p.base_price, SUM(b.dwell_time) as total_dwell, COUNT(*) as action_count
    FROM user_behavior_logs b
    LEFT JOIN products p ON b.product_id = p.id OR b.path = ('/products/' || p.slug)
    GROUP BY b.action_type, b.path, p.name, p.base_price
    ORDER BY action_count DESC, total_dwell DESC
    LIMIT 50
  `).all();
    if (!behaviorData || behaviorData.length === 0) {
        console.log('[Cron] No behavior data to analyze. Skipping report generation.');
        return;
    }
    // 2. 将数据格式化为文本
    const dataStr = behaviorData.map(d => {
        let line = `- 操作: ${d.action_type}, 路径: ${d.path}, 次数: ${d.action_count}, 总停留: ${d.total_dwell || 0}秒`;
        if (d.product_name) {
            line += `, 商品: ${d.product_name} (￥${d.base_price})`;
        }
        return line;
    }).join('\n');
    // 3. 构建 Prompt
    const systemPrompt = `你是一位名为 TRASOCHY AI 的首席电商运营总监。你的任务是根据给定的近期网站访客行为数据，进行深度的商业洞察分析，并输出一份排版清晰、具有实操性的《AI 智能运营与推广策略报告》。`;
    const userPrompt = `以下是商城近期的前端埋点行为数据统计：\n\n${dataStr}\n\n请分析这些数据，并输出一份 Markdown 格式的报告，包含以下两部分内容：\n1. 【产品配置建议】：指出哪些产品浏览量高但可能转化低，哪些产品可以组合打包成套装，哪些产品可以作为体验装赠送。\n2. 【营销推广建议】：建议采用何种弹窗、公告、或积分折扣策略来提升整体转化率。\n\n请保持客观、专业，并在可能的情况下给出具体的定价或营销数值建议。`;
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
    const data = await response.json();
    const report = data.choices?.[0]?.message?.content;
    if (!report) {
        throw new Error('Empty report content');
    }
    // 5. 落盘存储
    const reportsDir = path_1.default.join(process.cwd(), 'uploads', 'reports');
    if (!fs_1.default.existsSync(reportsDir)) {
        fs_1.default.mkdirSync(reportsDir, { recursive: true });
    }
    const dateStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const fileName = `AI_Operations_Report_${dateStr}_${Date.now()}.md`;
    const filePath = path_1.default.join(reportsDir, fileName);
    fs_1.default.writeFileSync(filePath, report, 'utf-8');
    console.log('[Cron] Weekly report saved to:', filePath);
    // 6. 清理过期数据
    // 删除当前分析所使用的数据，以避免数据堆积
    // 由于 SQLite 默认 WAL 模式，直接 DELETE 是安全的
    const result = db_1.sqlite.prepare(`DELETE FROM user_behavior_logs`).run();
    console.log(`[Cron] Cleaned up ${result.changes} old behavior records.`);
    return report;
}
