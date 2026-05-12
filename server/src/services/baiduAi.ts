import * as dotenv from 'dotenv';
dotenv.config();

const API_KEY = process.env.BAIDU_API_KEY || '';
const SECRET_KEY = process.env.BAIDU_SECRET_KEY || '';

/**
 * 获取百度 AI 的 Access Token
 */
export async function getBaiduAccessToken(dynamicApiKey?: string, dynamicApiSecret?: string): Promise<string> {
  const currentApiKey = (dynamicApiKey || API_KEY).trim();
  const currentApiSecret = (dynamicApiSecret || SECRET_KEY).trim();

  if (!currentApiKey || !currentApiSecret) {
    throw new Error('未配置百度的 API_KEY 或 SECRET_KEY');
  }

  const url = `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${currentApiKey}&client_secret=${currentApiSecret}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  });

  const data = await response.json() as any;
  if (data.error) {
    throw new Error(`获取 Token 失败: ${data.error_description}`);
  }
  return data.access_token;
}

/**
 * 调用皮肤分析 API
 * @param imageBase64 图片的 Base64 编码 (不带前缀)
 * @param dynamicApiKey 可选，动态传入的 API Key
 * @param dynamicApiSecret 可选，动态传入的 API Secret
 * @returns 皮肤分析结果 JSON
 */
export async function analyzeSkin(imageBase64: string, dynamicApiKey?: string, dynamicApiSecret?: string): Promise<any> {
  const token = await getBaiduAccessToken(dynamicApiKey, dynamicApiSecret);
  const url = `https://aip.baidubce.com/rest/2.0/face/v1/skinanalyze?access_token=${token}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({
      image: imageBase64,
      image_type: 'BASE64'
    })
  });

  const data = await response.json() as any;
  if (data.error_code) {
    throw new Error(`分析失败: ${data.error_msg}`);
  }
  return data.result;
}
