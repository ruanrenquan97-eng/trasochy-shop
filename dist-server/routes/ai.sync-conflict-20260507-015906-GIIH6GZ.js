"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const index_1 = require("../db/index");
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const cron_1 = require("../utils/cron");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.post('/analyze', async (req, res) => {
    try {
        const { answers } = req.body;
        if (!answers || !answers.skin_type || !answers.primary_concern) {
            res.status(400).json({ error: 'Missing required quiz answers' });
            return;
        }
        const skinType = answers.skin_type;
        const concern = answers.primary_concern;
        const ageGroup = answers.age_group || 'unknown';
        // 1. 获取所有商品并计算匹配得分
        const allProducts = index_1.sqlite.prepare(`
      SELECT p.id, p.name, p.slug, p.main_image, p.description, p.base_price, 
             p.skin_types, p.concerns
      FROM products p
      WHERE p.is_active = 1 AND p.is_bundle = 0 AND p.is_sample = 0
    `).all();
        const scoredProducts = allProducts.map(p => {
            let score = 0;
            let pSkinTypes = [];
            let pConcerns = [];
            try {
                pSkinTypes = p.skin_types ? JSON.parse(p.skin_types) : [];
            }
            catch (e) { }
            try {
                pConcerns = p.concerns ? JSON.parse(p.concerns) : [];
            }
            catch (e) { }
            if (pSkinTypes.includes(skinType))
                score += 5;
            if (pConcerns.includes(concern))
                score += 5;
            score += Math.random() * 2; // 随机扰动
            return { ...p, score };
        });
        const recommended = scoredProducts
            .sort((a, b) => b.score - a.score)
            .slice(0, 3)
            .map(p => {
            // 移除不必要的大字段以便发送给前台
            const { skin_types, concerns, score, ...rest } = p;
            return rest;
        });
        // 2. 调用阿里云大模型生成专属护肤情书
        const getSetting = (key) => {
            const row = index_1.sqlite.prepare(`SELECT value FROM site_settings WHERE key = ?`).get(key);
            return row?.value;
        };
        const apiKey = getSetting('ai_api_key') || process.env.DASHSCOPE_API_KEY;
        if (!apiKey) {
            console.warn('API_KEY is not set, falling back to static text.');
            res.json({
                guardian_letter: `亲爱的用户，\n\n基于您的肌肤诉求，我们为您精心甄选了这套护肤方案。请坚持使用，静待时光赋予的美丽蜕变。`,
                products: recommended
            });
            return;
        }
        const skinTypeMap = {
            'dry': '干性皮肤',
            'oily': '油性皮肤',
            'combination': '混合性皮肤',
            'sensitive': '敏感性皮肤'
        };
        const concernMap = {
            'anti-aging': '抗老紧致',
            'brightening': '美白淡斑',
            'acne': '祛痘控油',
            'hydrating': '补水保湿'
        };
        const ageMap = {
            'under-20': '20岁以下',
            '20-30': '20-30岁',
            '30-40': '30-40岁',
            'over-40': '40岁以上'
        };
        const userSkin = skinTypeMap[skinType] || skinType;
        const userConcern = concernMap[concern] || concern;
        const userAge = ageMap[ageGroup] || ageGroup;
        const productNames = recommended.map(p => p.name).join('、');
        const defaultPrompt = `你是一位名为 TRASOCHY AI 的资深院线级护肤专家。
现在有一位用户完成了测肤问卷：
- 年龄段：{userAge}
- 肤质：{userSkin}
- 核心诉求：{userConcern}

系统已经为TA匹配了以下 3 款产品：{productNames}。

请你为这位用户写一封“专属护肤守护信 (Guardian Letter)”。
要求：
1. 语气必须极其专业、温和、富有情感和疗愈感，像是一封写给用户的私密信件。
2. 字数控制在 150-250 字左右。
3. 信中必须自然地提及这几款推荐的产品，并简单一笔带过为什么它们适合该用户的肤质和诉求。
4. 不需要任何 markdown 格式，纯文本分段即可。不要出现“尊敬的用户”这种死板的开头，可以用“致追求完美的你：”或类似的优美开头。`;
        let customPrompt = getSetting('ai_quiz_prompt') || defaultPrompt;
        customPrompt = customPrompt
            .replace('{userAge}', userAge)
            .replace('{userSkin}', userSkin)
            .replace('{userConcern}', userConcern)
            .replace('{productNames}', productNames);
        const customDetails = req.body.answers?.customDetails || [];
        if (customDetails.length > 0) {
            const detailsList = customDetails.map((c, i) => `${i + 1}. ${c}`).join('\\n');
            customPrompt += `\\n\\n【特别提醒：请在写信时，一定要关照并回应用户自行补充的以下护肤细节】\\n${detailsList}`;
        }
        const response = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'qwen-plus',
                messages: [
                    { role: 'system', content: '你是 TRASOCHY 高端护肤品牌的首席 AI 护肤顾问。' },
                    { role: 'user', content: customPrompt }
                ]
            })
        });
        if (!response.ok) {
            const errText = await response.text();
            console.error('DashScope API Error:', errText);
            throw new Error('AI API returned an error');
        }
        const data = await response.json();
        const letter = data.choices?.[0]?.message?.content || '亲爱的用户，为您定制的护肤方案已生成。';
        res.json({
            guardian_letter: letter,
            products: recommended
        });
    }
    catch (err) {
        console.error('[AI Error]', err);
        res.status(500).json({ error: 'AI 分析失败，请稍后再试' });
    }
});
router.post('/generate-question', async (req, res) => {
    try {
        const { history } = req.body;
        const getSetting = (key) => {
            const row = index_1.sqlite.prepare(`SELECT value FROM site_settings WHERE key = ?`).get(key);
            return row?.value;
        };
        const apiKey = getSetting('ai_api_key') || process.env.DASHSCOPE_API_KEY;
        if (!apiKey) {
            res.status(500).json({ error: 'API Key 未配置' });
            return;
        }
        const historyText = history.map((h, i) => `Q${i + 1}: ${h.question}\\nA${i + 1}: ${h.answer}`).join('\\n\\n');
        const prompt = `你是一个专业的皮肤科医生和高端护肤品牌顾问。用户正在进行测肤问卷。
这是用户已经回答的问题：
${historyText}

请根据用户的上述情况，思考一个**下一个**最能帮助你精准评估用户肌肤状况或推荐护肤品的单项选择题（例如：具体的作息习惯、以往踩雷经历、某种特定症状的严重程度等）。
要求：
1. 这个问题必须与前面的问题绝不重复，并且针对该用户的现有画像进行深度追问。
2. 给出 3 到 4 个选项，每个选项必须带有非常简短的 desc 描述。
3. 请强制输出且仅输出一段合法的 JSON 格式数据，不能包含任何其他多余的解释说明文字。格式严格如下：
{
  "question": "您平时的工作环境是怎样的？",
  "options": [
    { "label": "长期面对电脑", "value": "computer", "desc": "容易产生蓝光和辐射伤害" },
    { "label": "户外工作较多", "value": "outdoor", "desc": "日晒频繁，易光老化" },
    { "label": "室内空调房", "value": "indoor", "desc": "皮肤容易发干缺水" }
  ]
}`;
        const response = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'qwen-plus',
                messages: [
                    { role: 'user', content: prompt }
                ],
                response_format: { type: "json_object" }
            })
        });
        if (!response.ok) {
            const errText = await response.text();
            console.error('DashScope API Error (generate-question):', errText);
            throw new Error('AI API returned an error');
        }
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || '{}';
        let questionObj;
        try {
            questionObj = JSON.parse(content);
        }
        catch (e) {
            const jsonStr = content.match(/```json\\n([\\s\\S]*?)\\n```/)?.[1] || content;
            questionObj = JSON.parse(jsonStr);
        }
        questionObj.id = `dynamic_${Date.now()}`;
        res.json(questionObj);
    }
    catch (err) {
        console.error('[AI Generate Question Error]', err);
        res.status(500).json({ error: 'Failed to generate question' });
    }
});
router.post('/chat', async (req, res) => {
    try {
        const { messages } = req.body;
        if (!messages || !Array.isArray(messages)) {
            res.status(400).json({ error: 'Missing or invalid messages array' });
            return;
        }
        const getSetting = (key) => {
            const row = index_1.sqlite.prepare(`SELECT value FROM site_settings WHERE key = ?`).get(key);
            return row?.value;
        };
        const chatToggle = getSetting('feature_ai_chatbot');
        if (chatToggle !== '1') {
            res.status(403).json({ error: 'AI 客服暂未开启' });
            return;
        }
        const allProducts = index_1.sqlite.prepare(`
      SELECT p.name, p.base_price, p.description, p.skin_types, p.concerns
      FROM products p
      WHERE p.is_active = 1 AND p.is_bundle = 0
    `).all();
        const productContext = allProducts.map(p => {
            let skinTypes = [];
            let concerns = [];
            try {
                skinTypes = p.skin_types ? JSON.parse(p.skin_types) : [];
            }
            catch (e) { }
            try {
                concerns = p.concerns ? JSON.parse(p.concerns) : [];
            }
            catch (e) { }
            return `- ${p.name}: ￥${p.base_price}. 适合肤质: ${skinTypes.join(',')}. 功效: ${concerns.join(',')}. 简介: ${p.description}`;
        }).join('\\n');
        const defaultChatPrompt = `你是 TRASOCHY 护肤商城的高级 AI 智能客服助手。
你的任务是耐心、专业、温柔地解答客户的护肤疑问，并根据客户的需求推荐店内的合适产品。
请尽量用简短、自然、像真人一样的口吻聊天，不要长篇大论。`;
        const customChatPrompt = getSetting('ai_chat_prompt') || defaultChatPrompt;
        const knowledgeBase = getSetting('ai_knowledge_base') || '';
        const systemPrompt = `${customChatPrompt}

这是我们店里目前在售的商品目录：
${productContext}

${knowledgeBase ? `以下是一些额外的品牌和业务知识，请在回答时参考：\n${knowledgeBase}` : ''}

请基于上述商品目录和知识为客户解答。如果客户问及店内没有的产品或功能，请委婉地说明店内目前主打上述产品。`;
        const apiKey = getSetting('ai_api_key') || process.env.DASHSCOPE_API_KEY;
        if (!apiKey) {
            res.json({ reply: '抱歉，当前 AI 客服功能暂未配置好。' });
            return;
        }
        const dashScopeMessages = [
            { role: 'system', content: systemPrompt },
            ...messages.map((m) => ({
                role: m.role === 'user' ? 'user' : 'assistant',
                content: m.content
            }))
        ];
        const response = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'qwen-plus',
                messages: dashScopeMessages
            })
        });
        if (!response.ok) {
            const errText = await response.text();
            console.error('DashScope API Error (Chat):', errText);
            throw new Error('AI API returned an error');
        }
        const data = await response.json();
        const reply = data.choices?.[0]?.message?.content || '抱歉，我现在有点忙，请稍后再试。';
        try {
            const userLatest = messages[messages.length - 1]?.content || '';
            const timestamp = new Date().toISOString();
            const logEntry = `## [${timestamp}]\n**User**: ${userLatest}\n**AI**: ${reply}\n\n`;
            const logPath = path.join(__dirname, '../../data/ai_memory.md');
            await fs.appendFile(logPath, logEntry, 'utf8');
        }
        catch (logErr) {
            console.error('Failed to write to ai_memory.md:', logErr);
        }
        res.json({ reply });
    }
    catch (err) {
        console.error('[AI Chat Error]', err);
        res.status(500).json({ error: 'AI 聊天失败' });
    }
});
router.post('/operations-report', auth_1.authMiddleware, (0, auth_1.permissionMiddleware)('ai'), async (req, res) => {
    try {
        const report = await (0, cron_1.generateAndSaveReport)();
        if (!report) {
            res.json({ report: '暂无足够的用户行为数据来生成报告。请等待前端采集更多数据。' });
            return;
        }
        res.json({ report });
    }
    catch (err) {
        console.error('[AI Operations Error]', err);
        res.status(500).json({ error: '生成运营报告失败: ' + err.message });
    }
});
router.get('/reports', auth_1.authMiddleware, (0, auth_1.permissionMiddleware)('ai'), async (req, res) => {
    try {
        const reportsDir = path.join(process.cwd(), 'uploads', 'reports');
        try {
            await fs.access(reportsDir);
        }
        catch {
            res.json({ reports: [] });
            return;
        }
        const fileNames = await fs.readdir(reportsDir);
        const mdFiles = fileNames.filter((f) => f.endsWith('.md'));
        const files = await Promise.all(mdFiles.map(async (f) => {
            const stats = await fs.stat(path.join(reportsDir, f));
            return {
                filename: f,
                url: `/uploads/reports/${f}`,
                size: stats.size,
                createdAt: stats.mtime
            };
        }));
        files.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        res.json({ reports: files });
    }
    catch (err) {
        console.error('[AI Reports Error]', err);
        res.status(500).json({ error: '获取报告列表失败' });
    }
});
router.post('/generate-article', auth_1.authMiddleware, (0, auth_1.permissionMiddleware)('articles'), async (req, res) => {
    try {
        const { topic } = req.body;
        if (!topic) {
            res.status(400).json({ error: 'Missing topic' });
            return;
        }
        const getSetting = (key) => {
            const row = index_1.sqlite.prepare(`SELECT value FROM site_settings WHERE key = ?`).get(key);
            return row?.value;
        };
        const apiKey = getSetting('ai_api_key') || process.env.DASHSCOPE_API_KEY;
        if (!apiKey) {
            res.status(500).json({ error: '未配置 AI API Key，无法生成文章' });
            return;
        }
        const systemPrompt = `你是一位专业的院线护肤品牌 (TRASOCHY) 的内容编辑和护肤专家。
你的任务是根据给定的主题或关键词，撰写一篇高质量的护肤科普文章或品牌动态。
要求：
1. 输出必须是标准的 Markdown 格式。
2. 包含一个吸引人的主标题 (使用 # 标题)。
3. 内容结构清晰，包含前言、核心知识点讲解、以及总结。使用适当的二级(##)和三级(###)标题。
4. 语气专业、科学，同时易于普通消费者理解。
5. 字数控制在 600-1000 字之间。
6. 如果适用，可以在文章中自然地推荐相关的护肤理念或成分（如：烟酰胺、玻色因、氨基酸等）。`;
        const userPrompt = `请以“${topic}”为主题写一篇文章。`;
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
            console.error('DashScope API Error (Article Gen):', errText);
            throw new Error('AI API returned an error');
        }
        const data = await response.json();
        const articleMarkdown = data.choices?.[0]?.message?.content || '';
        res.json({ content: articleMarkdown });
    }
    catch (err) {
        console.error('[AI Article Gen Error]', err);
        res.status(500).json({ error: 'AI 生成文章失败: ' + err.message });
    }
});
router.post('/translate', auth_1.authMiddleware, (0, auth_1.permissionMiddleware)('admin', 'content', 'product'), async (req, res) => {
    try {
        const { texts, targetLang } = req.body;
        if (!texts || typeof texts !== 'object' || !targetLang) {
            res.status(400).json({ error: 'Missing required fields: texts (object) or targetLang' });
            return;
        }
        const getSetting = (key) => {
            const row = index_1.sqlite.prepare(`SELECT value FROM site_settings WHERE key = ?`).get(key);
            return row?.value;
        };
        const apiKey = getSetting('ai_api_key') || process.env.DASHSCOPE_API_KEY;
        if (!apiKey) {
            res.status(500).json({ error: 'API Key 未配置' });
            return;
        }
        const langName = targetLang === 'en' ? '英文' : targetLang === 'de' ? '德文' : targetLang;
        const prompt = `你是一个专业的电商与高端护肤品牌的本地化翻译专家。
请将以下 JSON 对象中的所有中文字符串内容翻译为**${langName}**。
要求：
1. 保持原有的 JSON 键名 (keys) 绝对不变，只翻译值 (values)。
2. 如果值中包含 Markdown 格式（如 \`#\`, \`**\`, \`-\` 等）或 HTML 标签，必须严格保留这些格式。
3. 翻译风格：专业、优雅、适合高端护肤品和电商语境。
4. 强制输出且仅输出一段合法的 JSON 格式数据，绝对不能包含任何其他多余的解释说明文字。

待翻译的 JSON 数据如下：
${JSON.stringify(texts, null, 2)}`;
        const response = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'qwen-plus',
                messages: [
                    { role: 'user', content: prompt }
                ],
                response_format: { type: "json_object" }
            })
        });
        if (!response.ok) {
            const errText = await response.text();
            console.error('DashScope API Error (translate):', errText);
            res.status(500).json({ error: 'AI API returned an error: ' + errText });
            return;
        }
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || '{}';
        let translatedObj;
        try {
            translatedObj = JSON.parse(content);
        }
        catch (e) {
            const jsonStr = content.match(/```json\n([\s\S]*?)\n```/)?.[1] || content;
            translatedObj = JSON.parse(jsonStr);
        }
        res.json({ translated: translatedObj });
    }
    catch (err) {
        console.error('[AI Translate Error]', err);
        res.status(500).json({ error: 'Failed to translate content' });
    }
});
exports.default = router;
