import * as fs from 'fs/promises';
import * as path from 'path';

export interface SkincareTheme {
  bgStart: string;
  bgMiddle: string;
  bgEnd: string;
  panelStart: string;
  panelEnd: string;
  accentColor: string;
  accentOpacity: number;
  highlightColor: string;
  iconSvg: string;
  themeName: string;
}

export function getSkincareTheme(title: string, keywords: string[] = []): SkincareTheme {
  const text = (title + ' ' + keywords.join(' ')).toLowerCase();

  // 1. 补水保湿 (Hydration)
  if (/(补水|保湿|干皮|水润|干燥|水分|透明质酸|玻尿酸|缺水|舒润|锁水|hydrat|moistur)/.test(text)) {
    return {
      themeName: 'Hydration & Moisture',
      bgStart: '#f0f9ff', // light sky blue
      bgMiddle: '#e0f2fe',
      bgEnd: '#bae6fd',
      panelStart: '#075985', // deep sky blue
      panelEnd: '#0284c7',
      accentColor: '#38bdf8', // bright sky blue
      accentOpacity: 0.85,
      highlightColor: '#ffffff',
      // Water bubbles and ripples
      iconSvg: `
        <!-- Ripple 1 -->
        <circle cx="274" cy="400" r="120" fill="none" stroke="#38bdf8" stroke-width="2" opacity="0.3" />
        <circle cx="274" cy="400" r="80" fill="none" stroke="#38bdf8" stroke-width="4" opacity="0.4" />
        <circle cx="274" cy="400" r="40" fill="none" stroke="#ffffff" stroke-width="6" opacity="0.6" />
        <!-- Floating bubbles -->
        <circle cx="200" cy="250" r="18" fill="none" stroke="#ffffff" stroke-width="2.5" opacity="0.7" />
        <circle cx="220" cy="230" r="6" fill="#ffffff" opacity="0.8" />
        <circle cx="320" cy="300" r="28" fill="none" stroke="#38bdf8" stroke-width="3" opacity="0.5" />
        <circle cx="340" cy="285" r="9" fill="#ffffff" opacity="0.6" />
        <circle cx="180" cy="480" r="24" fill="none" stroke="#38bdf8" stroke-width="2" opacity="0.5" />
        <circle cx="290" cy="520" r="15" fill="none" stroke="#ffffff" stroke-width="2" opacity="0.8" />
        <path d="M 150,550 Q 220,530 274,560 T 400,530" fill="none" stroke="#38bdf8" stroke-width="6" stroke-linecap="round" opacity="0.4" />
      `
    };
  }

  // 2. 抗衰老 (Anti-aging)
  if (/(抗衰|抗老|紧致|淡纹|皱纹|胶原|视黄醇|玻色因|波色因|精纯|修护精粹|老化|age|wrinkle|collagen|retinol)/.test(text)) {
    return {
      themeName: 'Anti-Aging & Firming',
      bgStart: '#faf5ff', // rich light lavender/purple-grey
      bgMiddle: '#f5f3ff',
      bgEnd: '#ddd6fe',
      panelStart: '#4c1d95', // deep purple
      panelEnd: '#6d28d9',
      accentColor: '#c084fc', // soft purple accent
      accentOpacity: 0.85,
      highlightColor: '#fbbf24', // luxury gold highlight
      // DNA helix and glowing lattice
      iconSvg: `
        <!-- DNA Helix / Golden luxury waves -->
        <path d="M 180,220 Q 220,180 274,220 T 368,220" fill="none" stroke="#fbbf24" stroke-width="6" stroke-linecap="round" opacity="0.8" />
        <path d="M 180,220 Q 220,260 274,220 T 368,220" fill="none" stroke="#c084fc" stroke-width="4" stroke-linecap="round" opacity="0.6" />
        <line x1="210" y1="202" x2="210" y2="238" stroke="#ffffff" stroke-width="2" opacity="0.5" />
        <line x1="240" y1="208" x2="240" y2="232" stroke="#ffffff" stroke-width="2" opacity="0.5" />
        <line x1="308" y1="208" x2="308" y2="232" stroke="#ffffff" stroke-width="2" opacity="0.5" />
        <line x1="338" y1="202" x2="338" y2="238" stroke="#ffffff" stroke-width="2" opacity="0.5" />
        <!-- Structural cell lattice -->
        <path d="M190 350 L240 320 L290 350 L290 410 L240 440 L190 410 Z" fill="none" stroke="#fbbf24" stroke-width="3" opacity="0.7"/>
        <path d="M290 350 L340 320 L390 350 L390 410 L340 440 L290 410" fill="none" stroke="#c084fc" stroke-width="2" opacity="0.5"/>
        <path d="M240 440 L240 500 L290 530 L340 500 L340 440" fill="none" stroke="#ffffff" stroke-width="2.5" opacity="0.6"/>
        <!-- Glowing energy stars -->
        <circle cx="240" cy="320" r="6" fill="#fbbf24" />
        <circle cx="290" cy="350" r="6" fill="#ffffff" />
        <circle cx="340" cy="320" r="6" fill="#fbbf24" />
        <circle cx="290" cy="410" r="6" fill="#ffffff" />
        <!-- Luxury curves -->
        <path d="M 150,560 C 250,560 220,480 320,500" fill="none" stroke="#fbbf24" stroke-width="8" stroke-linecap="round" opacity="0.5" />
      `
    };
  }

  // 3. 舒缓修护 / 敏感肌 (Soothe & Repair)
  if (/(舒缓|修护|修复|敏感|红血丝|泛红|屏障|积雪草|舒敏|特护|角质|sooth|repair|sensit)/.test(text)) {
    return {
      themeName: 'Soothe & Barrier Repair',
      bgStart: '#f0fdf4', // soft green
      bgMiddle: '#dcfce7',
      bgEnd: '#bbf7d0',
      panelStart: '#064e3b', // deep forest green
      panelEnd: '#047857',
      accentColor: '#34d399', // emerald green
      accentOpacity: 0.85,
      highlightColor: '#a7f3d0',
      // Botanical leaves and protective shields
      iconSvg: `
        <!-- Calming wave rings -->
        <circle cx="274" cy="420" r="140" fill="none" stroke="#34d399" stroke-width="1.5" opacity="0.2" />
        <circle cx="274" cy="420" r="110" fill="none" stroke="#34d399" stroke-width="3" opacity="0.3" />
        <!-- Protective Shield outline -->
        <path d="M224 230 C224 230 274 210 274 210 C274 210 324 230 324 230 C324 290 314 340 274 370 C234 340 224 290 224 230 Z" fill="none" stroke="#ffffff" stroke-width="4" stroke-linecap="round" opacity="0.8" />
        <path d="M239 245 C239 245 274 230 274 230 C274 230 309 245 309 245 C309 290 301 325 274 350 C247 325 239 290 239 245 Z" fill="none" stroke="#34d399" stroke-width="2" opacity="0.6" />
        <!-- Elegant Botanical Leaf -->
        <path d="M160 480 Q230 420 280 480 T400 480" fill="none" stroke="#34d399" stroke-width="6" stroke-linecap="round" opacity="0.4" />
        <path d="M 230,480 C 240,430 280,430 290,480" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round" opacity="0.7" />
        <circle cx="274" cy="280" r="8" fill="#ffffff" opacity="0.9" />
        <circle cx="250" cy="305" r="5" fill="#34d399" opacity="0.8" />
        <circle cx="298" cy="305" r="5" fill="#34d399" opacity="0.8" />
      `
    };
  }

  // 4. 美白淡斑 (Brightening)
  if (/(美白|淡斑|祛斑|提亮|光感|暗沉|色素|黑色素|烟酰胺|维c|vc|熊果苷|传明酸|bright|whit|glow|vitamin c)/.test(text)) {
    return {
      themeName: 'Brightening & Glow',
      bgStart: '#fffbeb', // solar yellow
      bgMiddle: '#fef3c7',
      bgEnd: '#fde68a',
      panelStart: '#7c2d12', // deep amber/orange
      panelEnd: '#b45309',
      accentColor: '#f59e0b', // bright orange/gold
      accentOpacity: 0.85,
      highlightColor: '#ffffff',
      // Radiant energy lines and glowing stars
      iconSvg: `
        <!-- Radiant Glowing Center -->
        <circle cx="274" cy="320" r="70" fill="none" stroke="#f59e0b" stroke-width="1.5" opacity="0.4" />
        <circle cx="274" cy="320" r="50" fill="none" stroke="#ffffff" stroke-width="3" opacity="0.6" />
        <circle cx="274" cy="320" r="30" fill="#ffffff" opacity="0.9" />
        <!-- Solar Rays -->
        <line x1="274" y1="210" x2="274" y2="235" stroke="#f59e0b" stroke-width="4" stroke-linecap="round" opacity="0.8" />
        <line x1="274" y1="405" x2="274" y2="430" stroke="#f59e0b" stroke-width="4" stroke-linecap="round" opacity="0.8" />
        <line x1="164" y1="320" x2="189" y2="320" stroke="#f59e0b" stroke-width="4" stroke-linecap="round" opacity="0.8" />
        <line x1="359" y1="320" x2="384" y2="320" stroke="#f59e0b" stroke-width="4" stroke-linecap="round" opacity="0.8" />
        <line x1="196" y1="242" x2="214" y2="260" stroke="#ffffff" stroke-width="3" stroke-linecap="round" opacity="0.7" />
        <line x1="334" y1="380" x2="352" y2="398" stroke="#ffffff" stroke-width="3" stroke-linecap="round" opacity="0.7" />
        <line x1="334" y1="260" x2="352" y2="242" stroke="#ffffff" stroke-width="3" stroke-linecap="round" opacity="0.7" />
        <line x1="196" y1="398" x2="214" y2="380" stroke="#ffffff" stroke-width="3" stroke-linecap="round" opacity="0.7" />
        <!-- Floating sparkling stars -->
        <path d="M190,170 L195,180 L205,185 L195,190 L190,200 L185,190 L175,185 L185,180 Z" fill="#ffffff" opacity="0.9"/>
        <path d="M350,470 L353,478 L361,481 L353,484 L350,492 L347,484 L339,481 L347,478 Z" fill="#f59e0b" opacity="0.8"/>
        <path d="M160,450 C 230,470 280,410 370,450" fill="none" stroke="#f59e0b" stroke-width="8" stroke-linecap="round" opacity="0.5" />
      `
    };
  }

  // 5. 祛痘控油 (Acne & Oil Control)
  if (/(祛痘|控油|痘痘|粉刺|黑头|闭口|毛孔|水杨酸|茶树|消炎|酸|果酸|去角质|acne|oil|pore|salicyl)/.test(text)) {
    return {
      themeName: 'Purity & Oil Control',
      bgStart: '#f0fdfa', // clear teal
      bgMiddle: '#ccfbf1',
      bgEnd: '#99f6e4',
      panelStart: '#111827', // slate black
      panelEnd: '#374151',
      accentColor: '#2dd4bf', // bright teal
      accentOpacity: 0.85,
      highlightColor: '#ffffff',
      // High-precision laser lines, hexagons, crystals
      iconSvg: `
        <!-- Target Grid / Precision Cleansing -->
        <circle cx="274" cy="350" r="100" fill="none" stroke="#2dd4bf" stroke-width="1" stroke-dasharray="4,4" opacity="0.6" />
        <circle cx="274" cy="350" r="70" fill="none" stroke="#2dd4bf" stroke-width="2" opacity="0.4" />
        <circle cx="274" cy="350" r="40" fill="none" stroke="#ffffff" stroke-width="3" opacity="0.8" />
        <!-- Crosshairs -->
        <line x1="154" y1="350" x2="394" y2="350" stroke="#2dd4bf" stroke-width="1.5" opacity="0.5" />
        <line x1="274" y1="230" x2="274" y2="470" stroke="#2dd4bf" stroke-width="1.5" opacity="0.5" />
        <!-- Purity hexagons -->
        <polygon points="214,240 234,230 254,240 254,260 234,270 214,260" fill="none" stroke="#ffffff" stroke-width="2" opacity="0.8"/>
        <polygon points="314,460 334,450 354,460 354,480 334,490 314,480" fill="none" stroke="#2dd4bf" stroke-width="2.5" opacity="0.7"/>
        <circle cx="274" cy="350" r="6" fill="#2dd4bf" />
        <path d="M 150,540 L 400,540" stroke="#2dd4bf" stroke-width="6" stroke-linecap="round" opacity="0.4" />
        <path d="M 170,560 L 380,560" stroke="#ffffff" stroke-width="3" stroke-linecap="round" opacity="0.6" />
      `
    };
  }

  // 6. 默认学术/科学护肤 (General Science)
  return {
    themeName: 'TRASOCHY Clinical Science',
    bgStart: '#fff7f2', // warm light soft rose-beige
    bgMiddle: '#f3ebe1',
    bgEnd: '#d8e3df',
    panelStart: '#292524', // elegant dark warm charcoal
    panelEnd: '#57534e',
    accentColor: '#f5d0c5', // classic soft rose-pink
    accentOpacity: 0.9,
    highlightColor: '#ffffff',
    // Luxury brand curves
    iconSvg: `
      <!-- Elegant abstract swooshes -->
      <path d="M207 580 C228 474, 201 388, 260 305 C306 239, 392 225, 424 151" fill="none" stroke="#f5d0c5" stroke-width="22" stroke-linecap="round" opacity="0.7"/>
      <path d="M179 498 C232 493, 277 510, 333 482 C377 460, 398 414, 430 382" fill="none" stroke="#ffffff" stroke-width="12" stroke-linecap="round" opacity="0.72"/>
      <circle cx="252" cy="252" r="42" fill="#f5d0c5" opacity="0.9"/>
      <circle cx="340" cy="338" r="26" fill="#ffffff" opacity="0.72"/>
      <circle cx="220" cy="420" r="14" fill="#ffffff" opacity="0.4"/>
    `
  };
}

export function escapeSvgText(value: string): string {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function wrapSvgText(text: string, maxChars: number, maxLines: number): string[] {
  const normalized = String(text || '').replace(/\s+/g, ' ').trim();
  const words = /\s/.test(normalized)
    ? normalized.split(' ')
    : Array.from(normalized.match(new RegExp(`.{1,${maxChars}}`, 'g')) || []);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);

  return lines.slice(0, maxLines).map((line, index, arr) => {
    if (index === maxLines - 1 && lines.length > maxLines) return `${line.replace(/[,.，。;；:：!?！？]*$/, '')}...`;
    return line;
  });
}

async function optimizeImagePrompt(params: { title: string; keywords: string[]; content: string; apiKey: string }): Promise<string> {
  const systemPrompt = `你是 TRASOCHY 传诗奇的高端护肤美学导演。你需要将一篇护肤科普文章的标题、关键词及内容，转化为一段用于通义万相 AI 画家 (Wanx-V1) 的高品质生图提示词 (Prompt)。

要求：
1. 提示词必须是英文，描述一幅高端、纯净、极简主义的护肤品大片或护肤成分意境图。
2. 包含细节：professional studio lighting, macro photography, natural soft light, high-end cosmetic brand aesthetic, luxury minimalist, water drops, organic botanical leaves, serum texture, smooth gel 等。
3. 结构简单，不要包含 markdown 标记，不要解释，只输出最终的英文提示词字符串。字数控制在 50-70 个单词以内。
4. 不要出现敏感词、医疗病症或低俗词汇，确保可以通过内容审查。`;

  const userPrompt = `文章标题: ${params.title}
关键词: ${params.keywords.join(', ')}
正文大意: ${params.content.slice(0, 300)}`;

  try {
    const response = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${params.apiKey}`
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
      const data: any = await response.json();
      const prompt = data.choices?.[0]?.message?.content?.trim();
      if (prompt) {
        // Strip out code block if LLM accidentally output markdown format
        return prompt.replace(/```(markdown|text)?/g, '').replace(/```/g, '').trim();
      }
    }
  } catch (err) {
    console.warn('[AI Cover Gen] Failed to optimize image prompt via LLM:', err);
  }

  // Fallback static prompt based on keywords or title
  const text = (params.title + ' ' + params.keywords.join(' ')).toLowerCase();
  if (/(补水|保湿|干皮|水润|干燥|水分|透明质酸|玻尿酸|缺水|hydrat|moistur)/.test(text)) {
    return 'Premium skincare hyaluronic acid serum glass bottle with realistic water droplets, pure blue background, soft studio lighting, macro photography, elegant luxury cosmetic brand, 8k resolution.';
  } else if (/(抗衰|抗老|紧致|淡纹|皱纹|胶原|视黄醇|玻色因|age|wrinkle|collagen|retinol)/.test(text)) {
    return 'Luxurious anti-aging skincare bottle, elegant golden essence droplets, soft purple-lavender background, warm luxury gold lighting, micro DNA lattice motif, commercial photography, 8k resolution.';
  } else if (/(舒缓|修护|修复|敏感|红血丝|泛红|屏障|积雪草|sooth|repair|sensit)/.test(text)) {
    return 'Calming barrier repair cream in white aesthetic jar with green centella asiatica leaves, soft forest green background, pristine clean cosmetic branding, macro shot, natural daylight, 8k resolution.';
  } else if (/(美白|淡斑|祛斑|提亮|光感|暗沉|烟酰胺|维c|bright|whit|glow|vitamin c)/.test(text)) {
    return 'Brightening vitamin C skincare bottle, glowing sunray patterns, vibrant orange and amber background, sparkling pure light reflections, elegant premium cosmetics, studio lighting, 8k resolution.';
  } else if (/(祛痘|控油|痘痘|粉刺|黑头|闭口|毛孔|水杨酸|茶树|acne|oil|pore)/.test(text)) {
    return 'Clear purifying acne oil control serum bottle, tea tree leaves, soothing light teal background, pristine clean cosmetic aesthetic, sharp micro water droplets, scientific and aesthetic photography, 8k.';
  }
  return 'Prismatic luxury skincare glass bottle, transparent water drops, minimalist off-white background, elegant natural lighting, commercial macro photography, high-end cosmetic brand aesthetic, 8k.';
}

async function generateWanxCoverImage(params: {
  title: string;
  keywords?: string[];
  content?: string;
  apiKey: string;
}): Promise<string> {
  const keywords = params.keywords || [];
  const content = params.content || '';
  
  // 1. Optimize prompt
  console.log('[AI Cover Gen] Optimizing image prompt via Qwen...');
  const prompt = await optimizeImagePrompt({ title: params.title, keywords, content, apiKey: params.apiKey });
  console.log('[AI Cover Gen] Generated prompt for Wanx:', prompt);

  // 2. Submit task to Aliyun Wanx API
  console.log('[AI Cover Gen] Submitting task to DashScope Wanx API...');
  const submitRes = await fetch('https://dashscope.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${params.apiKey}`,
      'X-DashScope-Async': 'enable'
    },
    body: JSON.stringify({
      model: 'wanx-v1',
      input: {
        prompt: prompt
      },
      parameters: {
        style: '<auto>',
        size: '1024*1024',
        n: 1
      }
    })
  });

  if (!submitRes.ok) {
    const errText = await submitRes.text();
    throw new Error(`Wanx submission failed: ${submitRes.status} - ${errText}`);
  }

  const submitData: any = await submitRes.json();
  const taskId = submitData.output?.task_id;
  if (!taskId) {
    throw new Error('Wanx API returned no task_id');
  }
  console.log('[AI Cover Gen] Wanx task created successfully. Task ID:', taskId);

  // 3. Poll task status
  const pollUrl = `https://dashscope.aliyuncs.com/api/v1/tasks/${taskId}`;
  let status = 'PENDING';
  let imageUrl = '';
  let retries = 0;
  const maxRetries = 25; // 25 retries * 2 seconds = 50 seconds max

  while (status !== 'SUCCEEDED' && status !== 'FAILED' && retries < maxRetries) {
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log(`[AI Cover Gen] Polling task status... (${retries + 1}/${maxRetries})`);
    
    const pollRes = await fetch(pollUrl, {
      headers: { 'Authorization': `Bearer ${params.apiKey}` }
    });
    
    if (pollRes.ok) {
      const pollData: any = await pollRes.json();
      status = pollData.output?.task_status || 'PENDING';
      console.log(`[AI Cover Gen] Task status: ${status}`);
      
      if (status === 'SUCCEEDED') {
        imageUrl = pollData.output?.results?.[0]?.url || '';
        break;
      } else if (status === 'FAILED') {
        throw new Error(`Wanx generation task failed: ${pollData.output?.message || 'unknown error'}`);
      }
    } else {
      console.warn('[AI Cover Gen] Polling endpoint returned error status:', pollRes.status);
    }
    retries++;
  }

  if (!imageUrl) {
    throw new Error('Wanx generation timed out or failed to return image URL');
  }
  console.log('[AI Cover Gen] Wanx generated image successfully. Image URL:', imageUrl);

  // 4. Download and save the image locally
  console.log('[AI Cover Gen] Downloading generated image...');
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
  console.log('[AI Cover Gen] Saved cover image to:', filePath);
  
  return `/uploads/articles/${fileName}`;
}

export async function createArticleCoverImage(params: {
  title: string;
  subtitle?: string;
  keywords?: string[];
  content?: string;
  coverStyle?: string;
  apiKey?: string;
}): Promise<string> {
  const { title, subtitle, keywords, content, coverStyle, apiKey } = params;

  if (coverStyle === 'wanx' && apiKey) {
    try {
      const coverUrl = await generateWanxCoverImage({
        title,
        keywords,
        content,
        apiKey
      });
      return coverUrl;
    } catch (err) {
      console.error('[AI Cover Gen] Wanx cover generation failed. Falling back to SVG template. Error:', err);
    }
  }

  // --- SVG fallback generation logic ---
  const uploadDir = path.join(process.cwd(), 'uploads', 'articles');
  await fs.mkdir(uploadDir, { recursive: true });

  const fileName = `ai-cover-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.svg`;
  const filePath = path.join(uploadDir, fileName);

  const titleLines = wrapSvgText(title || 'TRASOCHY Skin Research', 22, 3);
  const subtitleLines = wrapSvgText(subtitle || 'AI-powered skincare science and clinical insight', 42, 2);
  const tags = (keywords || []).slice(0, 4);

  // Retrieve customized theme based on title & keywords
  const theme = getSkincareTheme(title, keywords);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${theme.bgStart}"/>
      <stop offset="48%" stop-color="${theme.bgMiddle}"/>
      <stop offset="100%" stop-color="${theme.bgEnd}"/>
    </linearGradient>
    <linearGradient id="panel" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${theme.panelStart}"/>
      <stop offset="100%" stop-color="${theme.panelEnd}"/>
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="18" stdDeviation="24" flood-color="#292524" flood-opacity="0.16"/>
    </filter>
  </defs>
  <rect width="1200" height="800" fill="url(#bg)"/>
  <circle cx="1040" cy="120" r="210" fill="#ffffff" opacity="0.46"/>
  <circle cx="130" cy="700" r="260" fill="#ffffff" opacity="0.34"/>
  <rect x="82" y="76" width="1036" height="648" rx="32" fill="#ffffff" opacity="0.78" filter="url(#shadow)"/>
  <rect x="122" y="116" width="304" height="568" rx="28" fill="url(#panel)"/>
  
  <!-- Themed Graphics Inside Left Panel -->
  ${theme.iconSvg}
  
  <!-- Left Panel Branding Text -->
  <text x="160" y="188" fill="#fafaf9" font-family="Arial, Helvetica, sans-serif" font-size="25" letter-spacing="4">TRASOCHY</text>
  <text x="160" y="225" fill="#d6d3d1" font-family="Arial, Helvetica, sans-serif" font-size="13" letter-spacing="3">SKIN RESEARCH</text>
  
  <!-- Right Editorial Content -->
  <text x="488" y="166" fill="${theme.panelEnd}" font-family="Arial, Helvetica, sans-serif" font-size="14" font-weight="bold" letter-spacing="4">TRASOCHY EDITORIAL REPORT</text>
  ${titleLines.map((line, i) => `<text x="488" y="${270 + i * 66}" fill="#1c1917" font-family="Georgia, 'Times New Roman', serif" font-size="52" font-weight="500">${escapeSvgText(line)}</text>`).join('')}
  ${subtitleLines.map((line, i) => `<text x="492" y="${500 + i * 30}" fill="#78716c" font-family="Arial, Helvetica, sans-serif" font-size="22">${escapeSvgText(line)}</text>`).join('')}
  <line x1="492" y1="588" x2="1032" y2="588" stroke="#d6d3d1"/>
  ${tags.map((tag, i) => `<text x="${492 + i * 132}" y="646" fill="#57534e" font-family="Arial, Helvetica, sans-serif" font-size="16"># ${escapeSvgText(tag)}</text>`).join('')}
  <text x="492" y="690" fill="#a8a29e" font-family="Arial, Helvetica, sans-serif" font-size="13" letter-spacing="2">GENERATED FOR TRASOCHY SKINCARE INSTITUTE</text>
</svg>`;

  await fs.writeFile(filePath, svg, 'utf8');
  return `/uploads/articles/${fileName}`;
}
