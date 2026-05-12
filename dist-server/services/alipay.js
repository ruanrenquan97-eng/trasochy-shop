"use strict";
/**
 * 支付宝支付服务
 *
 * 使用 alipay-sdk 封装支付宝接口：
 * - 手机网站支付（WAP）
 * - 通知验签
 * - 订单查询
 * - 退款
 */
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
exports.createWapOrder = createWapOrder;
exports.verifyNotification = verifyNotification;
exports.parseNotification = parseNotification;
exports.queryOrder = queryOrder;
exports.createRefund = createRefund;
exports.isAlipayConfigured = isAlipayConfigured;
const PaymentConfig = __importStar(require("./payment-config"));
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let alipayInstance = null;
let lastConfigHash = '';
function getAlipay() {
    // 检查配置是否变化，变化时重新初始化（热更新）
    const hash = [
        PaymentConfig.getAlipayAppId(),
        PaymentConfig.getAlipayPrivateKey(),
        PaymentConfig.getAlipayPublicKey(),
        PaymentConfig.getAlipayGateway(),
    ].join('|');
    if (alipayInstance && lastConfigHash === hash)
        return alipayInstance;
    const appId = PaymentConfig.getAlipayAppId();
    const privateKey = PaymentConfig.getAlipayPrivateKey();
    const alipayPublicKey = PaymentConfig.getAlipayPublicKey();
    if (!appId || !privateKey) {
        console.log('[Alipay] 支付宝配置不完整，跳过初始化');
        return null;
    }
    const gateway = PaymentConfig.getAlipayGateway();
    // 动态导入 alipay-sdk
    const AlipaySdk = require('alipay-sdk').default;
    alipayInstance = new AlipaySdk({
        appId,
        privateKey,
        alipayPublicKey: alipayPublicKey || undefined,
        gateway,
        signType: 'RSA2',
    });
    lastConfigHash = hash;
    return alipayInstance;
}
/**
 * 创建手机网站支付订单
 */
async function createWapOrder(params) {
    const alipay = getAlipay();
    if (!alipay)
        throw new Error('支付宝未配置');
    const notifyUrl = PaymentConfig.getAlipayNotifyUrl();
    // 动态导入 AlipayFormData
    const AlipayFormData = require('alipay-sdk/lib/form').default;
    const formData = new AlipayFormData();
    formData.setMethod('get');
    formData.addField('bizContent', {
        out_trade_no: params.orderNo,
        total_amount: params.amount.toFixed(2),
        subject: params.subject,
        product_code: 'QUICK_WAP_WAY',
    });
    formData.addField('returnUrl', params.returnUrl);
    formData.addField('notifyUrl', notifyUrl);
    if (params.quitUrl) {
        formData.addField('quitUrl', params.quitUrl);
    }
    const result = await alipay.pageExec('alipay.trade.wap.pay', { formData });
    return typeof result === 'string' ? result : JSON.stringify(result);
}
/**
 * 验证支付宝异步通知签名
 */
function verifyNotification(params) {
    const alipay = getAlipay();
    if (!alipay)
        return false;
    try {
        return alipay.checkNotifySign(params);
    }
    catch (e) {
        console.error('[Alipay] 通知验签失败:', e.message);
        return false;
    }
}
/**
 * 从通知参数中提取订单信息
 */
function parseNotification(params) {
    if (!params.out_trade_no || !params.trade_no)
        return null;
    return {
        trade_no: params.trade_no,
        out_trade_no: params.out_trade_no,
        amount: parseFloat(params.total_amount || '0'),
        status: params.trade_status || '',
        buyer_id: params.buyer_id || '',
    };
}
/**
 * 查询订单支付状态
 */
async function queryOrder(orderNo) {
    const alipay = getAlipay();
    if (!alipay)
        return null;
    try {
        const result = await alipay.exec('alipay.trade.query', {
            bizContent: { out_trade_no: orderNo },
        });
        const data = result?.alipay_trade_query_response;
        if (!data)
            return null;
        return {
            trade_no: data.trade_no || '',
            status: data.trade_status || '',
            amount: parseFloat(data.total_amount || '0'),
            pay_time: data.send_pay_date || '',
        };
    }
    catch (e) {
        console.error('[Alipay] 查询失败:', e.message);
        return null;
    }
}
/**
 * 创建退款
 */
async function createRefund(params) {
    const alipay = getAlipay();
    if (!alipay)
        return null;
    try {
        const result = await alipay.exec('alipay.trade.refund', {
            bizContent: {
                out_trade_no: params.orderNo,
                out_request_no: params.refundNo,
                refund_amount: params.refundAmount.toFixed(2),
                refund_reason: params.reason,
            },
        });
        const data = result?.alipay_trade_refund_response;
        if (!data || data.code !== '10000') {
            console.error('[Alipay] 退款失败:', data?.sub_msg || data?.msg);
            return null;
        }
        return { trade_no: data.trade_no || '', status: 'SUCCESS' };
    }
    catch (e) {
        console.error('[Alipay] 退款失败:', e.message);
        return null;
    }
}
/**
 * 检查支付宝是否已配置
 */
function isAlipayConfigured() {
    const mode = PaymentConfig.getPaymentMode();
    return mode !== 'mock' && PaymentConfig.isAlipayConfigComplete();
}
