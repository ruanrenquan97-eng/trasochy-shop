const Database = require('better-sqlite3');
const fs = require('fs').promises;
const path = require('path');

// 1. Database Connection
const dbPath = path.join(__dirname, 'data', 'skincare.db');
console.log('Connecting to database:', dbPath);
const sqlite = new Database(dbPath);

async function optimizeImagePrompt(title, keywords, content, apiKey) {
  const systemPrompt = `你是 TRASOCHY 传诗奇的高端护肤美学导演。你需要将一篇护肤科普文章的标题、关键词及内容，转化为一段用于通义万相 AI 画家 (Wanx-V1) 的高品质生图提示词 (Prompt)。

要求：
1. 提示词必须是英文，描述一幅高端、纯净、极简主义的护肤品大片或护肤成分意境图。
2. 包含细节：professional studio lighting, macro photography, natural soft light, high-end cosmetic brand aesthetic, luxury minimalist, water drops, organic botanical leaves, serum texture, smooth gel 等。
3. 结构简单，不要包含 markdown 标记，不要解释，只输出最终的英文提示词字符串。字数控制在 50-70 个单词以内。
4. 不要出现敏感词、医疗病症或低俗词汇，确保可以通过内容审查。`;

  const userPrompt = `文章标题: ${title}
关键词: ${keywords.join(', ')}
正文大意: ${content.slice(0, 300)}`;

  try {
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

    if (response.ok) {
      const data = await response.json();
      const prompt = data.choices?.[0]?.message?.content?.trim();
      if (prompt) {
        return prompt.replace(/```(markdown|text)?/g, '').replace(/```/g, '').trim();
      }
    }
  } catch (err) {
    console.warn('  [Warning] Failed to optimize prompt via Qwen, using local fallback:', err.message);
  }

  // Local static prompt fallback
  const text = (title + ' ' + keywords.join(' ')).toLowerCase();
  if (/(补水|保湿|干皮|水润|干燥|水分|透明质酸|玻尿酸|缺水|hydrat|moistur)/.test(text)) {
    return 'Premium skincare hyaluronic acid serum glass bottle with realistic water droplets, pure blue background, soft studio lighting, macro photography, elegant luxury cosmetic brand, 8k resolution.';
  } else if (/(抗衰|抗老|紧致|淡纹|皱纹|胶原|视黄醇|玻色因|age|wrinkle|collagen|retinol)/.test(text)) {
    return 'Luxurious anti-aging skincare bottle, elegant golden essence droplets, soft purple-lavender background, warm luxury gold lighting, micro DNA lattice motif, commercial photography, 8k resolution.';
  } else if (/(舒缓|修护|修复|敏感|红血丝|泛红|屏障|积雪草|sooth|repair|sensit)/.test(text)) {
    return 'Calming barrier repair cream in white aesthetic jar with green centella asiatica leaves, soft forest green background, pristine clean cosmetic branding, macro shot, natural daylight, 8k resolution.';
  } else if (/(美白|淡斑|祛斑|提亮|光感|暗沉|烟酰胺|维c|bright|whit|glow|vitamin c)/.test(text)) {
    return 'Brightening vitamin C skincare bottle, glowing sunray patterns, vibrant orange and amber background, sparkling pure light reflections, elegant premium cosmetics, studio lighting, 8k resolution.';
  }
  return 'Prismatic luxury skincare glass bottle, transparent water drops, minimalist off-white background, elegant natural lighting, commercial macro photography, high-end cosmetic brand aesthetic, 8k.';
}

async function generateWanxImage(title, keywords, content, apiKey) {
  // 1. Optimize prompt via LLM
  console.log('  -> Optimizing image prompt via Qwen...');
  const prompt = await optimizeImagePrompt(title, keywords, content, apiKey);
  console.log('  -> Prompt optimized:', prompt);

  // 2. Submit task to Wanx API
  console.log('  -> Submitting text-to-image task to DashScope Wanx API...');
  const submitRes = await fetch('https://dashscope.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'X-DashScope-Async': 'enable'
    },
    body: JSON.stringify({
      model: 'wanx-v1',
      input: { prompt },
      parameters: {
        style: '<auto>',
        size: '1024*1024',
        n: 1
      }
    })
  });

  if (!submitRes.ok) {
    const errText = await submitRes.text();
    throw new Error(`Wanx API returned status ${submitRes.status}: ${errText}`);
  }

  const submitData = await submitRes.json();
  const taskId = submitData.output?.task_id;
  if (!taskId) {
    throw new Error('No task_id returned from Aliyun Wanx API');
  }
  console.log('  -> Wanx task created successfully. Task ID:', taskId);

  // 3. Poll task status
  const pollUrl = `https://dashscope.aliyuncs.com/api/v1/tasks/${taskId}`;
  let status = 'PENDING';
  let imageUrl = '';
  let retries = 0;
  const maxRetries = 25; // 25 * 2 seconds = 50 seconds max

  while (status !== 'SUCCEEDED' && status !== 'FAILED' && retries < maxRetries) {
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log(`  -> Polling task status... (${retries + 1}/${maxRetries})`);
    
    const pollRes = await fetch(pollUrl, {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });
    
    if (pollRes.ok) {
      const pollData = await pollRes.json();
      status = pollData.output?.task_status || 'PENDING';
      console.log(`  -> Task status: ${status}`);
      
      if (status === 'SUCCEEDED') {
        imageUrl = pollData.output?.results?.[0]?.url || '';
        break;
      } else if (status === 'FAILED') {
        throw new Error(`Wanx task failed: ${pollData.output?.message || 'unknown error'}`);
      }
    } else {
      console.warn('  -> [Warning] Failed to query task status.');
    }
    retries++;
  }

  if (!imageUrl) {
    throw new Error('Wanx image generation timed out or failed');
  }
  console.log('  -> Image generated. URL:', imageUrl);

  // 4. Download and save locally
  console.log('  -> Downloading generated image...');
  const imgRes = await fetch(imageUrl);
  if (!imgRes.ok) {
    throw new Error(`Failed to download image from ${imageUrl}`);
  }

  const arrayBuffer = await imgRes.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const uploadDir = path.join(process.cwd(), 'uploads', 'articles');
  await fs.mkdir(uploadDir, { recursive: true });

  const fileName = `ai-cover-wanx-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.png`;
  const filePath = path.join(uploadDir, fileName);

  await fs.writeFile(filePath, buffer);
  console.log('  -> Saved AI Cover Photo to:', filePath);
  
  return `/uploads/articles/${fileName}`;
}

async function main() {
  console.log('\n=============================================================');
  console.log('  TRASOCHY SKINCARE - SEMANTIC WANX AI COVER PHOTO UPGRADER  ');
  console.log('=============================================================\n');

  try {
    // Retrieve API Key
    const row = sqlite.prepare("SELECT value FROM site_settings WHERE key = 'ai_api_key'").get();
    const apiKey = row?.value || process.env.DASHSCOPE_API_KEY;
    if (!apiKey) {
      console.error('Error: Aliyun DashScope API key (ai_api_key) is not configured in site_settings table or env!');
      process.exit(1);
    }
    console.log('Using API Key ending in:', apiKey.slice(-6));

    // Retrieve all articles
    const articles = sqlite.prepare('SELECT * FROM articles').all();
    console.log(`Found a total of ${articles.length} articles in the database.`);

    let upgradedCount = 0;
    
    for (const art of articles) {
      console.log(`\nProcessing Article #${art.id}: "${art.title}"`);
      
      let tags = [];
      if (art.keywords) {
        try {
          const parsed = JSON.parse(art.keywords);
          tags = Array.isArray(parsed) ? parsed : String(art.keywords).split(',').map(t => t.trim());
        } catch (e) {
          tags = String(art.keywords).split(',').map(t => t.trim());
        }
      }
      tags = tags.filter(Boolean);

      try {
        // Generate beautiful custom cover image
        const newCoverPath = await generateWanxImage(
          art.title,
          tags,
          art.content || '',
          apiKey
        );

        // Update database
        sqlite.prepare('UPDATE articles SET cover_image = ?, updated_at = ? WHERE id = ?')
          .run(newCoverPath, Date.now(), art.id);

        console.log(`  -> SUCCESSFULLY UPGRADED! DB updated with: "${newCoverPath}"`);
        upgradedCount++;
        
        // Brief 1-second pause to spacing out API calls slightly
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (err) {
        console.error(`  -> [Error] Failed to generate AI photo for Article #${art.id}:`, err.message);
        console.log('  -> Skipping article.');
      }
    }

    console.log('\n=============================================================');
    console.log('  AI PHOTO COVER UPGRADE SUMMARY');
    console.log('=============================================================');
    console.log(`  - Successfully Upgraded to Wanx AI Cover Photos: ${upgradedCount} articles`);
    console.log(`  - Total processed: ${articles.length} articles`);
    console.log('=============================================================\n');

  } catch (err) {
    console.error('An error occurred during cover upgrades:', err);
  } finally {
    sqlite.close();
    console.log('Database connection closed.');
  }
}

main();
