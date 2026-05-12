import * as dotenv from 'dotenv';
dotenv.config();

const API_KEY = process.env.MEGVII_API_KEY || '';
const API_SECRET = process.env.MEGVII_API_SECRET || '';

/**
 * 调用旷视皮肤分析 API
 * @param imageBase64 图片的 Base64 编码 (不带前缀)
 * @param dynamicApiKey 可选，动态传入的 API Key
 * @param dynamicApiSecret 可选，动态传入的 API Secret
 * @param isPro 是否调用专业版接口
 * @returns 皮肤分析结果 JSON
 */
export async function analyzeSkinWithMegvii(imageBase64: string, dynamicApiKey?: string, dynamicApiSecret?: string, isPro: boolean = false, apiUrl?: string): Promise<any> {
  const currentApiKey = (dynamicApiKey || API_KEY).trim();
  const currentApiSecret = (dynamicApiSecret || API_SECRET).trim();

  if (!currentApiKey || !currentApiSecret || currentApiKey === 'your_megvii_api_key_here') {
    throw new Error('未配置旷视的 MEGVII_API_KEY 或 MEGVII_API_SECRET');
  }

  // 旷视 API 推荐使用 multipart/form-data
  let url = apiUrl || (isPro 
    ? `https://api-cn.faceplusplus.com/facepp/v1/skinanalyze_advanced` 
    : `https://api-cn.faceplusplus.com/facepp/v1/skinanalyze`);
  
  // 确保 url 格式正确
  url = url.trim();
  
  const MAX_RETRIES = 3;
  let attempt = 0;

  while (attempt < MAX_RETRIES) {
    const formData = new FormData();
    formData.append('api_key', currentApiKey);
    formData.append('api_secret', currentApiSecret);
    formData.append('image_base64', imageBase64);

    // 注意：Face++ 的 skinanalyze_advanced 不支持 return_maps 参数，
    // 只有 FaceStyle 企业版专线才支持并返回图层。
    // 我们通过识别 URL 来智能决定是否添加该参数。
    // 用户目前在后台填入了 skinanalyze_pro，我们也尝试为其下发 return_maps
    if (isPro && (url.includes('facestyle') || url.includes('skinanalyze_pro') || url.includes('skinanalyze_advanced'))) {
      formData.append('return_maps', 'red_area,brown_area,texture_enhanced_pores,texture_enhanced_blackheads,texture_enhanced_oily_area,texture_enhanced_lines,water_area,rough_area,roi_outline_map');
    }

    const response = await fetch(url, {
      method: 'POST',
      body: formData
    });

    const data = await response.json() as any;
    
    // 调试：打印旷视返回的完整顶层字段（不打印大 base64 内容）
    if (isPro) {
      const topKeys = Object.keys(data);
      console.log('[Megvii Pro] Response top-level keys:', topKeys);
      if (data.result) {
        const resultKeys = Object.keys(data.result);
        console.log('[Megvii Pro] result keys:', resultKeys);
        if (data.result.maps) console.log('[Megvii Pro] maps keys:', Object.keys(data.result.maps));
      }
      if (data.maps) console.log('[Megvii Pro] data.maps keys:', Object.keys(data.maps));
    }
    
    if (data.error_message) {
      if (data.error_message === 'CONCURRENCY_LIMIT_EXCEEDED' && attempt < MAX_RETRIES - 1) {
        attempt++;
        await new Promise(resolve => setTimeout(resolve, 1000));
        continue;
      }
      throw new Error(`分析失败: ${data.error_message}`);
    }
    return data;
  }
}

