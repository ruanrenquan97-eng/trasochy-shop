import { Router, Request, Response } from 'express';
import { sqlite } from '../db/index';
import * as fs from 'fs/promises';
import * as path from 'path';
import { generateAndSaveReport } from '../utils/cron';
import { authMiddleware, permissionMiddleware } from '../middleware/auth';

const router = Router();

router.post('/analyze', async (req: Request, res: Response) => {
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
    const allProducts = sqlite.prepare(`
      SELECT p.id, p.name, p.slug, p.main_image, p.description, p.base_price, 
             p.skin_types, p.concerns
      FROM products p
      WHERE p.is_active = 1 AND p.is_bundle = 0 AND p.is_sample = 0
    `).all() as any[];

    const scoredProducts = allProducts.map(p => {
      let score = 0;
      let pSkinTypes = [];
      let pConcerns = [];
      try { pSkinTypes = p.skin_types ? JSON.parse(p.skin_types) : []; } catch(e){}
      try { pConcerns = p.concerns ? JSON.parse(p.concerns) : []; } catch(e){}
      
      if (pSkinTypes.includes(skinType)) score += 5;
      if (pConcerns.includes(concern)) score += 5;
      
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
    const getSetting = (key: string) => {
      const row = sqlite.prepare(`SELECT value FROM site_settings WHERE key = ?`).get(key) as { value: string } | undefined;
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

    const skinTypeMap: Record<string, string> = {
      'dry': '干性皮肤',
      'oily': '油性皮肤',
      'combination': '混合性皮肤',
      'sensitive': '敏感性皮肤'
    };
    
    const concernMap: Record<string, string> = {
      'anti-aging': '抗老紧致',
      'brightening': '美白淡斑',
      'acne': '祛痘控油',
      'hydrating': '补水保湿'
    };

    const ageMap: Record<string, string> = {
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
      const detailsList = customDetails.map((c: string, i: number) => `${i + 1}. ${c}`).join('\\n');
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

    const data: any = await response.json();
    const letter = data.choices?.[0]?.message?.content || '亲爱的用户，为您定制的护肤方案已生成。';

    res.json({
      guardian_letter: letter,
      products: recommended
    });

  } catch (err: any) {
    console.error('[AI Error]', err);
    res.status(500).json({ error: 'AI 分析失败，请稍后再试' });
  }
});

router.post('/generate-question', async (req: Request, res: Response) => {
  try {
    const { history } = req.body;
    
    const getSetting = (key: string) => {
      const row = sqlite.prepare(`SELECT value FROM site_settings WHERE key = ?`).get(key) as { value: string } | undefined;
      return row?.value;
    };
    const apiKey = getSetting('ai_api_key') || process.env.DASHSCOPE_API_KEY;
    
    if (!apiKey) {
      res.status(500).json({ error: 'API Key 未配置' });
      return;
    }

    const historyText = history.map((h: any, i: number) => `Q${i+1}: ${h.question}\\nA${i+1}: ${h.answer}`).join('\\n\\n');
    
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

    const data: any = await response.json();
    const content = data.choices?.[0]?.message?.content || '{}';
    let questionObj;
    try {
      questionObj = JSON.parse(content);
    } catch(e) {
      const jsonStr = content.match(/```json\\n([\\s\\S]*?)\\n```/)?.[1] || content;
      questionObj = JSON.parse(jsonStr);
    }
    
    questionObj.id = `dynamic_${Date.now()}`;
    
    res.json(questionObj);
  } catch(err) {
    console.error('[AI Generate Question Error]', err);
    res.status(500).json({ error: 'Failed to generate question' });
  }
});

router.post('/chat', async (req: Request, res: Response) => {
  try {
    const { messages } = req.body;
    if (!messages || !Array.isArray(messages)) {
      res.status(400).json({ error: 'Missing or invalid messages array' });
      return;
    }

    const getSetting = (key: string) => {
      const row = sqlite.prepare(`SELECT value FROM site_settings WHERE key = ?`).get(key) as { value: string } | undefined;
      return row?.value;
    };

    const chatToggle = getSetting('feature_ai_chatbot');
    if (chatToggle !== '1') {
      res.status(403).json({ error: 'AI 客服暂未开启' });
      return;
    }

    const allProducts = sqlite.prepare(`
      SELECT p.name, p.base_price, p.description, p.skin_types, p.concerns
      FROM products p
      WHERE p.is_active = 1 AND p.is_bundle = 0
    `).all() as any[];

    const productContext = allProducts.map(p => {
      let skinTypes = [];
      let concerns = [];
      try { skinTypes = p.skin_types ? JSON.parse(p.skin_types) : []; } catch(e){}
      try { concerns = p.concerns ? JSON.parse(p.concerns) : []; } catch(e){}
      return `- ${p.name}: ￥${p.base_price}. 适合肤质: ${skinTypes.join(',')}. 功效: ${concerns.join(',')}. 简介: ${p.description}`;
    }).join('\\n');

    const defaultChatPrompt = `你是 TRASOCHY 护肤商城的高级 AI 智能客服助手。
你的任务是耐心、专业、温柔地解答客户的护肤疑问，并根据客户的需求推荐店内的合适产品。
请尽量用简短、自然、像真人一样的口吻聊天，不要长篇大论。`;

    const customChatPrompt = getSetting('ai_chat_prompt') || defaultChatPrompt;
    const knowledgeBase = getSetting('ai_knowledge_base') || '';

    const modifiedLogs = sqlite.prepare(`SELECT question, answer FROM ai_chat_logs WHERE is_modified = 1 ORDER BY updated_at DESC LIMIT 20`).all() as any[];
    let modifiedLogsText = '';
    if (modifiedLogs.length > 0) {
      modifiedLogsText = `\n\n以下是经过人工修正的历史问答示例，请在回答相似问题时严格参考这些示例的口吻和信息：\n`;
      modifiedLogs.forEach((log, index) => {
        modifiedLogsText += `Q${index + 1}: ${log.question}\nA${index + 1}: ${log.answer}\n\n`;
      });
    }

    const systemPrompt = `${customChatPrompt}

这是我们店里目前在售的商品目录：
${productContext}

${knowledgeBase ? `以下是一些额外的品牌和业务知识，请在回答时参考：\n${knowledgeBase}` : ''}${modifiedLogsText}

请基于上述商品目录和知识为客户解答。如果客户问及店内没有的产品或功能，请委婉地说明店内目前主打上述产品。`;

    const apiKey = getSetting('ai_api_key') || process.env.DASHSCOPE_API_KEY;
    if (!apiKey) {
      res.json({ reply: '抱歉，当前 AI 客服功能暂未配置好。' });
      return;
    }

    const dashScopeMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.map((m: any) => ({
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

    const data: any = await response.json();
    const reply = data.choices?.[0]?.message?.content || '抱歉，我现在有点忙，请稍后再试。';

    try {
      const userLatest = messages[messages.length - 1]?.content || '';
      if (userLatest) {
        let userId = null;
        if (req.headers.authorization) {
          try {
            const token = req.headers.authorization.split(' ')[1];
            const jwt = require('jsonwebtoken');
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'trasochy_secret_2024');
            userId = decoded.id;
          } catch(e) {}
        }
        
        sqlite.prepare(`
          INSERT INTO ai_chat_logs (user_id, question, answer, is_modified, created_at, updated_at) 
          VALUES (?, ?, ?, 0, ?, ?)
        `).run(userId, userLatest, reply, Date.now(), Date.now());
      }
    } catch (logErr) {
      console.error('Failed to write to ai_chat_logs:', logErr);
    }

    res.json({ reply });
  } catch (err: any) {
    console.error('[AI Chat Error]', err);
    res.status(500).json({ error: 'AI 聊天失败' });
  }
});

// 获取聊天记录
router.get('/chat-logs', authMiddleware, permissionMiddleware('ai'), (req: Request, res: Response) => {
  try {
    const { date } = req.query;
    let query = 'SELECT * FROM ai_chat_logs';
    const params: any[] = [];
    
    if (date && typeof date === 'string') {
      const startOfDay = new Date(date).setHours(0, 0, 0, 0);
      const endOfDay = new Date(date).setHours(23, 59, 59, 999);
      if (!isNaN(startOfDay)) {
        query += ' WHERE created_at >= ? AND created_at <= ?';
        params.push(startOfDay, endOfDay);
      }
    }
    
    query += ' ORDER BY created_at DESC LIMIT 500';
    const logs = sqlite.prepare(query).all(...params);
    res.json(logs);
  } catch(e: any) {
    res.status(500).json({ error: e.message });
  }
});

// 修改聊天记录的回复
router.put('/chat-logs/:id', authMiddleware, permissionMiddleware('ai'), (req: Request, res: Response) => {
  try {
    const { answer } = req.body;
    if (!answer) {
      res.status(400).json({ error: 'Answer cannot be empty' });
      return;
    }
    sqlite.prepare('UPDATE ai_chat_logs SET answer = ?, is_modified = 1, updated_at = ? WHERE id = ?').run(answer, Date.now(), req.params.id);
    res.json({ success: true });
  } catch(e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/operations-report', authMiddleware, permissionMiddleware('ai'), async (req: Request, res: Response) => {
  try {
    const report = await generateAndSaveReport();
    if (!report) {
      res.json({ report: '暂无足够的用户行为数据来生成报告。请等待前端采集更多数据。' });
      return;
    }
    res.json({ report });
  } catch (err: any) {
    console.error('[AI Operations Error]', err);
    res.status(500).json({ error: '生成运营报告失败: ' + err.message });
  }
});

router.get('/reports', authMiddleware, permissionMiddleware('ai'), async (req: Request, res: Response) => {
  try {
    const reportsDir = path.join(process.cwd(), 'uploads', 'reports');
    try {
      await fs.access(reportsDir);
    } catch {
      res.json({ reports: [] });
      return;
    }
    const fileNames = await fs.readdir(reportsDir);
    const mdFiles = fileNames.filter((f: string) => f.endsWith('.md'));
    
    const files = await Promise.all(mdFiles.map(async (f: string) => {
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
  } catch (err: any) {
    console.error('[AI Reports Error]', err);
    res.status(500).json({ error: '获取报告列表失败' });
  }
});

router.post('/generate-article', authMiddleware, permissionMiddleware('articles'), async (req: Request, res: Response) => {
  try {
    const { topic } = req.body;
    if (!topic) {
      res.status(400).json({ error: 'Missing topic' });
      return;
    }

    const getSetting = (key: string) => {
      const row = sqlite.prepare(`SELECT value FROM site_settings WHERE key = ?`).get(key) as { value: string } | undefined;
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

    const data: any = await response.json();
    const articleMarkdown = data.choices?.[0]?.message?.content || '';

    res.json({ content: articleMarkdown });

  } catch (err: any) {
    console.error('[AI Article Gen Error]', err);
    res.status(500).json({ error: 'AI 生成文章失败: ' + err.message });
  }
});

router.post('/translate', authMiddleware, permissionMiddleware('admin', 'content', 'product', 'articles'), async (req: Request, res: Response) => {
  try {
    const { texts, targetLang } = req.body;
    
    if (!texts || typeof texts !== 'object' || !targetLang) {
      res.status(400).json({ error: 'Missing required fields: texts (object) or targetLang' });
      return;
    }

    const getSetting = (key: string) => {
      const row = sqlite.prepare(`SELECT value FROM site_settings WHERE key = ?`).get(key) as { value: string } | undefined;
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
2. 如果值中包含 Markdown 格式（如 \`#\`, \`**\`, \`-\` 等）或 HTML 标签（尤其是 \`<img>\` 图片标签），必须严格、完整地保留这些格式和标签。绝对不能删除任何图片标签！
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

    const data: any = await response.json();
    const content = data.choices?.[0]?.message?.content || '{}';
    let translatedObj;
    try {
      translatedObj = JSON.parse(content);
    } catch(e) {
      const jsonStr = content.match(/```json\n([\s\S]*?)\n```/)?.[1] || content;
      translatedObj = JSON.parse(jsonStr);
    }
    
    res.json({ translated: translatedObj });
  } catch(err) {
    console.error('[AI Translate Error]', err);
    res.status(500).json({ error: 'Failed to translate content' });
  }
});

router.post('/seo-optimize', authMiddleware, permissionMiddleware('manage_marketing'), async (req: Request, res: Response) => {
  try {
    const { site_name, site_slogan } = req.body;
    
    const getSetting = (key: string) => {
      const row = sqlite.prepare(`SELECT value FROM site_settings WHERE key = ?`).get(key) as { value: string } | undefined;
      return row?.value;
    };
    const apiKey = getSetting('ai_api_key') || process.env.DASHSCOPE_API_KEY;

    if (!apiKey) {
      res.status(500).json({ error: 'API Key 未配置' });
      return;
    }

    const prompt = `你是一个拥有10年经验的顶级国际化 SEO（搜索引擎优化）专家。
目前有一个高端院线级护肤品牌的网站需要你进行全局 SEO 配置优化。
品牌/网站名称：${site_name || 'TRASOCHY 传诗奇'}
品牌愿景/Slogan：${site_slogan || '科技护肤，御龄抗衰'}

请你基于以上信息，生成极具吸引力、高转化率且符合搜索引擎规范的全局 SEO 标签配置。你需要同时生成中文 (zh)、英文 (en)、德文 (de) 三个版本。

要求：
1. seo_title（SEO 标题）：必须包含品牌名称和核心业务关键词（如护肤、抗衰、院线级等），长度在50-60个字符以内。
2. seo_keywords（SEO 关键词）：提取 5-8 个核心精准的搜索关键词，以英文逗号分隔。
3. seo_description（SEO 描述）：写一段吸引用户点击的介绍，必须流畅且含有核心关键词，长度在 100-150个字符左右。
4. 强制输出且仅输出一段合法的 JSON 格式数据，绝对不能包含任何其他解释说明文字。

JSON 结构必须严格如下：
{
  "zh": {
    "seo_title": "...",
    "seo_keywords": "...",
    "seo_description": "..."
  },
  "en": {
    "seo_title": "...",
    "seo_keywords": "...",
    "seo_description": "..."
  },
  "de": {
    "seo_title": "...",
    "seo_keywords": "...",
    "seo_description": "..."
  }
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
      console.error('DashScope API Error (seo-optimize):', errText);
      res.status(500).json({ error: 'AI API returned an error: ' + errText });
      return;
    }

    const data: any = await response.json();
    const content = data.choices?.[0]?.message?.content || '{}';
    let optimizedObj;
    try {
      optimizedObj = JSON.parse(content);
    } catch(e) {
      const jsonStr = content.match(/```json\n([\s\S]*?)\n```/)?.[1] || content;
      optimizedObj = JSON.parse(jsonStr);
    }
    
    res.json(optimizedObj);
  } catch(err) {
    console.error('[AI SEO Optimize Error]', err);
    res.status(500).json({ error: 'Failed to optimize SEO' });
  }
});

router.post('/generate-keyword-pool', authMiddleware, permissionMiddleware('manage_marketing', 'settings', 'articles', 'products'), async (req: Request, res: Response) => {
  try {
    const getSetting = (key: string) => {
      const row = sqlite.prepare(`SELECT value FROM site_settings WHERE key = ?`).get(key) as { value: string } | undefined;
      return row?.value;
    };
    const apiKey = getSetting('ai_api_key') || process.env.DASHSCOPE_API_KEY;

    if (!apiKey) {
      res.status(500).json({ error: 'API Key 未配置' });
      return;
    }

    const siteName = getSetting('site_name') || 'TRASOCHY 传诗奇';
    const siteSlogan = getSetting('site_slogan') || '科技护肤，御龄抗衰';

    const prompt = `你是一个拥有10年经验的高端院线护肤品牌数字营销和 SEO（搜索引擎优化）专家。
品牌名称：${siteName}
品牌愿景：${siteSlogan}

请你分析品牌调性，并自动生成 15 到 20 个极具搜索潜力、高转化率、适合产品和科普文章引流曝光的精准 SEO 关键词（标签库）。
词汇应该涵盖：抗衰、成分、肤质、核心功效、高端护肤品类别等。

要求：
1. 提取 15 到 20 个关键词。
2. 强制输出且仅输出一段合法的 JSON 格式数据，绝对不能包含任何其他解释说明文字。

JSON 结构必须严格如下：
{
  "keywords": ["关键词1", "关键词2", "关键词3", "..."]
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
      console.error('DashScope API Error (generate-keyword-pool):', errText);
      res.status(500).json({ error: 'AI API returned an error: ' + errText });
      return;
    }

    const data: any = await response.json();
    const content = data.choices?.[0]?.message?.content || '{}';
    let optimizedObj;
    try {
      optimizedObj = JSON.parse(content);
    } catch(e) {
      const jsonStr = content.match(/```json\n([\s\S]*?)\n```/)?.[1] || content;
      optimizedObj = JSON.parse(jsonStr);
    }
    
    res.json({ keywords: optimizedObj.keywords || [] });
  } catch(err) {
    console.error('[AI Keyword Pool Error]', err);
    res.status(500).json({ error: 'Failed to generate keyword pool' });
  }
});

// 获取旷视/百度皮肤分析历史记录
router.get('/skin-records', authMiddleware, permissionMiddleware('ai'), (req: Request, res: Response) => {
  try {
    const records = sqlite.prepare(`
      SELECT s.id, s.image_url, s.result_data, s.created_at, s.type, u.name as user_name, u.email as user_email
      FROM skin_analysis_records s
      LEFT JOIN users u ON s.user_id = u.id
      ORDER BY s.created_at DESC
      LIMIT 100
    `).all();
    res.json(records);
  } catch (err: any) {
    console.error('[Skin Records Error]', err);
    res.status(500).json({ error: '获取皮肤分析记录失败' });
  }
});

// 删除皮肤分析历史记录
router.delete('/skin-records/:id', authMiddleware, permissionMiddleware('ai'), (req: Request, res: Response) => {
  try {
    const recordId = req.params.id;
    sqlite.prepare('DELETE FROM skin_analysis_records WHERE id = ?').run(recordId);
    res.json({ success: true });
  } catch (err: any) {
    console.error('[Skin Record Delete Error]', err);
    res.status(500).json({ error: '删除记录失败' });
  }
});

export default router;
