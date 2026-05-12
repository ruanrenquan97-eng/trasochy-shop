const apiKey = 'sk-e8f2a07da88b4e689edbde149bf507ff';
const systemPrompt = `你是一位名为 TRASOCHY AI 的首席电商运营总监。你的任务是根据给定的近期网站访客行为数据，进行深度的商业洞察分析，并输出一份排版清晰、具有实操性的《AI 智能运营与推广策略报告》。`;
const userPrompt = `以下是商城近期的前端埋点行为数据统计：\n\n- 操作: page_view, 路径: /products/amino-acid-cleanser, 次数: 5, 总停留: 120秒, 商品: 氨基酸温和洁面乳 (￥198)\n\n请分析这些数据，并输出一份 Markdown 格式的报告...`;

async function testAI() {
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

    if (!response.ok) {
      const errText = await response.text();
      console.error('DashScope API Error:', errText);
    } else {
      const data = await response.json();
      console.log('Success:', data.choices?.[0]?.message?.content?.substring(0, 50));
    }
  } catch (err) {
    console.error('Network Error:', err);
  }
}

testAI();
