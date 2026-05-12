"use strict";
/**
 * 支付配置读取服务
 *
 * 优先从数据库 site_settings 表读取，fallback 到 process.env。
 * 支持热更新：数据库保存后立即生效，无需重启。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.refreshPaymentConfig = refreshPaymentConfig;
exports.getPaymentMode = getPaymentMode;
exports.getWechatAppId = getWechatAppId;
exports.getWechatMchId = getWechatMchId;
exports.getWechatApiKeyV3 = getWechatApiKeyV3;
exports.getWechatCertPath = getWechatCertPath;
exports.getWechatKeyPath = getWechatKeyPath;
exports.getWechatSerialNo = getWechatSerialNo;
exports.getWechatNotifyUrl = getWechatNotifyUrl;
exports.getAlipayAppId = getAlipayAppId;
exports.getAlipayPrivateKey = getAlipayPrivateKey;
exports.getAlipayPublicKey = getAlipayPublicKey;
exports.getAlipayNotifyUrl = getAlipayNotifyUrl;
exports.getAlipayGateway = getAlipayGateway;
exports.isWechatConfigComplete = isWechatConfigComplete;
exports.isAlipayConfigComplete = isAlipayConfigComplete;
exports.getAllPaymentSettings = getAllPaymentSettings;
exports.savePaymentSettings = savePaymentSettings;
const index_1 = require("../db/index");
// 内存缓存，避免每次请求都查库
let configCache = null;
let cacheTime = 0;
const CACHE_TTL = 5000; // 5秒缓存
/** 刷新缓存 */
function refreshPaymentConfig() {
    configCache = null;
    cacheTime = 0;
}
/** 从数据库读取所有支付配置 */
function loadFromDB() {
    try {
        const rows = index_1.sqlite.prepare("SELECT key, value FROM site_settings WHERE key LIKE 'payment_%' OR key LIKE 'wechat_%' OR key LIKE 'alipay_%'").all();
        const map = {};
        rows.forEach(r => { map[r.key] = r.value; });
        return map;
    }
    catch (e) {
        console.error('[PaymentConfig] 读取数据库配置失败:', e.message);
        return {};
    }
}
/** 获取带缓存的数据库配置 */
function getDBConfig() {
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
function get(key, envKey) {
    const db = getDBConfig();
    return db[key] || process.env[envKey] || '';
}
// ============ 对外接口 ============
function getPaymentMode() {
    return (get('payment_mode', 'PAYMENT_MODE') || 'mock').toLowerCase();
}
// 微信支付配置
function getWechatAppId() {
    return get('wechat_app_id', 'WECHAT_APP_ID');
}
function getWechatMchId() {
    return get('wechat_mch_id', 'WECHAT_MCH_ID');
}
function getWechatApiKeyV3() {
    return get('wechat_api_key_v3', 'WECHAT_API_KEY_V3');
}
function getWechatCertPath() {
    return get('wechat_cert_path', 'WECHAT_CERT_PATH') || './certs/apiclient_cert.pem';
}
function getWechatKeyPath() {
    return get('wechat_key_path', 'WECHAT_KEY_PATH') || './certs/apiclient_key.pem';
}
function getWechatSerialNo() {
    return get('wechat_serial_no', 'WECHAT_SERIAL_NO');
}
function getWechatNotifyUrl() {
    return get('wechat_notify_url', 'WECHAT_NOTIFY_URL') || 'https://www.trasochy.com/api/payment/wechat/notify';
}
// 支付宝配置
function getAlipayAppId() {
    return get('alipay_app_id', 'ALIPAY_APP_ID');
}
function getAlipayPrivateKey() {
    return get('alipay_private_key', 'ALIPAY_PRIVATE_KEY');
}
function getAlipayPublicKey() {
    return get('alipay_public_key', 'ALIPAY_PUBLIC_KEY');
}
function getAlipayNotifyUrl() {
    return get('alipay_notify_url', 'ALIPAY_NOTIFY_URL') || 'https://www.trasochy.com/api/payment/alipay/notify';
}
function getAlipayGateway() {
    return get('alipay_gateway', 'ALIPAY_GATEWAY') || 'https://openapi.alipay.com/gateway.do';
}
// 微信配置是否完整
function isWechatConfigComplete() {
    return !!(getWechatAppId() &&
        getWechatMchId() &&
        getWechatApiKeyV3() &&
        getWechatCertPath() &&
        getWechatKeyPath());
}
// 支付宝配置是否完整
function isAlipayConfigComplete() {
    return !!(getAlipayAppId() && getAlipayPrivateKey());
}
/** 获取所有支付配置（供后台管理页面使用） */
function getAllPaymentSettings() {
    const paymentKeys = [
        'payment_mode', 'wechat_app_id', 'wechat_mch_id', 'wechat_api_key_v3',
        'wechat_cert_path', 'wechat_key_path', 'wechat_serial_no', 'wechat_notify_url',
        'alipay_app_id', 'alipay_private_key', 'alipay_public_key',
        'alipay_notify_url', 'alipay_gateway',
    ];
    return paymentKeys.map(key => {
        const row = index_1.sqlite.prepare('SELECT key, value, description FROM site_settings WHERE key = ?').get(key);
        return {
            key,
            value: row?.value || '',
            description: row?.description || key,
        };
    });
}
/** 批量保存支付配置 */
function savePaymentSettings(settings) {
    const now = Date.now();
    const stmt = index_1.sqlite.prepare('UPDATE site_settings SET value = ?, updated_at = ? WHERE key = ?');
    for (const [key, value] of Object.entries(settings)) {
        stmt.run(value, now, key);
    }
    // 清除缓存，立即生效
    refreshPaymentConfig();
}
