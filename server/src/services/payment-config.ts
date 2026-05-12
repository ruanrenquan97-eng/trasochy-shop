/**
 * 支付配置读取服务
 *
 * 优先从数据库 site_settings 表读取，fallback 到 process.env。
 * 支持热更新：数据库保存后立即生效，无需重启。
 */

import { sqlite } from '../db/index';

// 内存缓存，避免每次请求都查库
let configCache: Record<string, string> | null = null;
let cacheTime = 0;
const CACHE_TTL = 5000; // 5秒缓存

/** 刷新缓存 */
export function refreshPaymentConfig(): void {
  configCache = null;
  cacheTime = 0;
}

/** 从数据库读取所有支付配置 */
function loadFromDB(): Record<string, string> {
  try {
    const rows = sqlite.prepare(
      "SELECT key, value FROM site_settings WHERE key LIKE 'payment_%' OR key LIKE 'wechat_%' OR key LIKE 'alipay_%'"
    ).all() as { key: string; value: string }[];

    const map: Record<string, string> = {};
    rows.forEach(r => { map[r.key] = r.value; });
    return map;
  } catch (e: any) {
    console.error('[PaymentConfig] 读取数据库配置失败:', e.message);
    return {};
  }
}

/** 获取带缓存的数据库配置 */
function getDBConfig(): Record<string, string> {
  const now = Date.now();
  if (!configCache || now - cacheTime > CACHE_TTL) {
    configCache = loadFromDB();
    cacheTime = now;
  }
  return configCache;
}

/**
 * 获取支付配置值
 * 数据库优先，fallback 到 process.env
 */
function get(key: string, envKey: string): string {
  const db = getDBConfig();
  return db[key] || process.env[envKey] || '';
}

// ============ 对外接口 ============

export function getPaymentMode(): string {
  return (get('payment_mode', 'PAYMENT_MODE') || 'mock').toLowerCase();
}

// 微信支付配置
export function getWechatAppId(): string {
  return get('wechat_app_id', 'WECHAT_APP_ID');
}

export function getWechatMchId(): string {
  return get('wechat_mch_id', 'WECHAT_MCH_ID');
}

export function getWechatApiKeyV3(): string {
  return get('wechat_api_key_v3', 'WECHAT_API_KEY_V3');
}

export function getWechatCertPath(): string {
  return get('wechat_cert_path', 'WECHAT_CERT_PATH') || './certs/apiclient_cert.pem';
}

export function getWechatKeyPath(): string {
  return get('wechat_key_path', 'WECHAT_KEY_PATH') || './certs/apiclient_key.pem';
}

export function getWechatSerialNo(): string {
  return get('wechat_serial_no', 'WECHAT_SERIAL_NO');
}

export function getWechatNotifyUrl(): string {
  return get('wechat_notify_url', 'WECHAT_NOTIFY_URL') || 'https://www.trasochy.com/api/payment/wechat/notify';
}

// 支付宝配置
export function getAlipayAppId(): string {
  return get('alipay_app_id', 'ALIPAY_APP_ID');
}

export function getAlipayPrivateKey(): string {
  return get('alipay_private_key', 'ALIPAY_PRIVATE_KEY');
}

export function getAlipayPublicKey(): string {
  return get('alipay_public_key', 'ALIPAY_PUBLIC_KEY');
}

export function getAlipayNotifyUrl(): string {
  return get('alipay_notify_url', 'ALIPAY_NOTIFY_URL') || 'https://www.trasochy.com/api/payment/alipay/notify';
}

export function getAlipayGateway(): string {
  return get('alipay_gateway', 'ALIPAY_GATEWAY') || 'https://openapi.alipay.com/gateway.do';
}

// 微信配置是否完整
export function isWechatConfigComplete(): boolean {
  return !!(
    getWechatAppId() &&
    getWechatMchId() &&
    getWechatApiKeyV3() &&
    getWechatCertPath() &&
    getWechatKeyPath()
  );
}

// 支付宝配置是否完整
export function isAlipayConfigComplete(): boolean {
  return !!(getAlipayAppId() && getAlipayPrivateKey());
}

/** 获取所有支付配置（供后台管理页面使用） */
export function getAllPaymentSettings(): { key: string; value: string; description: string }[] {
  const paymentKeys = [
    'payment_mode', 'wechat_app_id', 'wechat_mch_id', 'wechat_api_key_v3',
    'wechat_cert_path', 'wechat_key_path', 'wechat_serial_no', 'wechat_notify_url',
    'alipay_app_id', 'alipay_private_key', 'alipay_public_key',
    'alipay_notify_url', 'alipay_gateway',
  ];
  return paymentKeys.map(key => {
    const row = sqlite.prepare('SELECT key, value, description FROM site_settings WHERE key = ?').get(key) as any;
    return {
      key,
      value: row?.value || '',
      description: row?.description || key,
    };
  });
}

/** 批量保存支付配置 */
export function savePaymentSettings(settings: Record<string, string>): void {
  const now = Date.now();
  const stmt = sqlite.prepare('UPDATE site_settings SET value = ?, updated_at = ? WHERE key = ?');
  for (const [key, value] of Object.entries(settings)) {
    stmt.run(value, now, key);
  }
  // 清除缓存，立即生效
  refreshPaymentConfig();
}
