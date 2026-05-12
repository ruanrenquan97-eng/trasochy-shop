/**
 * 微信支付 V3 API 服务
 *
 * 使用 wechatpay-node-v3 封装微信支付接口：
 * - H5支付（手机浏览器）
 * - JSAPI支付（微信内置浏览器）
 * - 通知验签与解密
 * - 订单查询
 * - 退款
 */

import WxPay from 'wechatpay-node-v3';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import * as PaymentConfig from './payment-config';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let wxpayInstance: any = null;
let lastConfigHash = '';

function getWxPay(): any {
  // 检查配置是否变化，变化时重新初始化（热更新）
  const hash = [
    PaymentConfig.getWechatAppId(),
    PaymentConfig.getWechatMchId(),
    PaymentConfig.getWechatApiKeyV3(),
    PaymentConfig.getWechatCertPath(),
    PaymentConfig.getWechatKeyPath(),
    PaymentConfig.getWechatSerialNo(),
  ].join('|');

  if (wxpayInstance && lastConfigHash === hash) return wxpayInstance;

  const appId = PaymentConfig.getWechatAppId();
  const mchId = PaymentConfig.getWechatMchId();
  const apiKeyV3 = PaymentConfig.getWechatApiKeyV3();
  const certPath = PaymentConfig.getWechatCertPath();
  const keyPath = PaymentConfig.getWechatKeyPath();
  const serialNo = PaymentConfig.getWechatSerialNo();

  if (!appId || !mchId || !apiKeyV3 || !certPath || !keyPath) {
    console.log('[WechatPay] 微信支付配置不完整，跳过初始化');
    return null;
  }

  // 读取证书文件
  let privateKey: string;
  let publicKey: string;
  try {
    publicKey = fs.readFileSync(path.resolve(certPath), 'utf-8');
    privateKey = fs.readFileSync(path.resolve(keyPath), 'utf-8');
  } catch (e: any) {
    console.error('[WechatPay] 证书文件读取失败:', e.message);
    return null;
  }

  wxpayInstance = new WxPay({
    appid: appId,
    mchid: mchId,
    publicKey: Buffer.from(publicKey),
    privateKey: Buffer.from(privateKey),
    key: apiKeyV3,
    serial_no: serialNo || '',
  });
  lastConfigHash = hash;

  return wxpayInstance;
}

export interface WxPayOrderResult {
  h5_url?: string;
  code_url?: string;
  jsapi_params?: {
    appId: string;
    timeStamp: string;
    nonceStr: string;
    package: string;
    signType: string;
    paySign: string;
  };
}

/**
 * 创建Native支付订单
 */
export async function createNativeOrder(params: {
  orderNo: string;
  amount: number;
  description: string;
}): Promise<WxPayOrderResult> {
  const wxpay = getWxPay();
  if (!wxpay) throw new Error('微信支付未配置');

  const notifyUrl = PaymentConfig.getWechatNotifyUrl();

  const result: any = await wxpay.transactions_native({
    description: params.description,
    out_trade_no: params.orderNo,
    notify_url: notifyUrl,
    amount: {
      total: Math.round(params.amount * 100),
      currency: 'CNY',
    },
  });

  if (result.error) {
    let errorMsg = '微信Native支付请求失败';
    try {
      const errObj = JSON.parse(result.error);
      errorMsg = errObj.message || errorMsg;
    } catch(e) {
      errorMsg = result.error;
    }
    throw new Error(errorMsg);
  }

  const code_url = result.code_url || result?.data?.code_url;
  if (!code_url) {
    console.error('[WechatPay] 无法获取 code_url, API返回:', result);
    throw new Error('微信Native支付请求失败: 未返回二维码链接');
  }

  return { code_url };
}

/**
 * 创建H5支付订单
 */
export async function createH5Order(params: {
  orderNo: string;
  amount: number;
  description: string;
  clientIp: string;
  returnUrl: string;
}): Promise<WxPayOrderResult> {
  const wxpay = getWxPay();
  if (!wxpay) throw new Error('微信支付未配置');

  const notifyUrl = PaymentConfig.getWechatNotifyUrl();

  const result: any = await wxpay.transactions_h5({
    description: params.description,
    out_trade_no: params.orderNo,
    notify_url: notifyUrl,
    amount: {
      total: Math.round(params.amount * 100),
      currency: 'CNY',
    },
    scene_info: {
      payer_client_ip: params.clientIp,
      h5_info: {
        type: 'Wap',
        app_url: params.returnUrl,
        app_name: '传诗奇商城',
      },
    },
  });

  if (result.error) {
    let errorMsg = '微信H5支付请求失败';
    try {
      const errObj = JSON.parse(result.error);
      errorMsg = errObj.message || errorMsg;
    } catch(e) {
      errorMsg = result.error;
    }
    throw new Error(errorMsg);
  }

  const h5_url = result.h5_url || result?.data?.h5_url;
  if (!h5_url) {
    console.error('[WechatPay] 无法获取 h5_url, API返回:', result);
    throw new Error('微信H5支付请求失败: 未返回支付链接');
  }

  return { h5_url };
}

/**
 * 创建JSAPI支付订单
 */
export async function createJSAPIOrder(params: {
  orderNo: string;
  amount: number;
  description: string;
  openid: string;
  returnUrl: string;
}): Promise<WxPayOrderResult> {
  const wxpay = getWxPay();
  if (!wxpay) throw new Error('微信支付未配置');

  const notifyUrl = PaymentConfig.getWechatNotifyUrl();
  const nonceStr = crypto.randomBytes(16).toString('hex');
  const timeStamp = Math.floor(Date.now() / 1000).toString();

  const result: any = await wxpay.transactions_jsapi({
    description: params.description,
    out_trade_no: params.orderNo,
    notify_url: notifyUrl,
    amount: {
      total: Math.round(params.amount * 100),
      currency: 'CNY',
    },
    payer: { openid: params.openid },
  });

  if (result.error) {
    let errorMsg = '微信JSAPI支付请求失败';
    try {
      const errObj = JSON.parse(result.error);
      errorMsg = errObj.message || errorMsg;
    } catch(e) {
      errorMsg = result.error;
    }
    throw new Error(errorMsg);
  }

  const data = result?.data || result;
  const prepayId = data.prepay_id;
  const appId = PaymentConfig.getWechatAppId() || '';

  return {
    jsapi_params: {
      appId,
      timeStamp,
      nonceStr,
      package: `prepay_id=${prepayId}`,
      signType: 'RSA',
      paySign: '',
    },
  };
}

/**
 * 验证并解密微信支付通知
 */
export async function verifyNotification(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  headers: Record<string, string>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body: any
): Promise<{
  event_type: string;
  trade_no: string;
  out_trade_no: string;
  amount: number;
  status: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  raw: any;
} | null> {
  const wxpay = getWxPay();
  if (!wxpay) return null;

  try {
    const { resource, event_type } = body;
    const decrypted: any = wxpay.decipher_gcm(
      resource.ciphertext,
      resource.associated_data,
      resource.nonce,
      PaymentConfig.getWechatApiKeyV3() || ''
    );
    const data = typeof decrypted === 'string' ? JSON.parse(decrypted) : decrypted;

    return {
      event_type: event_type || 'TRANSACTION.SUCCESS',
      trade_no: data.transaction_id || '',
      out_trade_no: data.out_trade_no || '',
      amount: (data.amount?.payer_total || 0) / 100,
      status: data.trade_state || 'SUCCESS',
      raw: data,
    };
  } catch (e: any) {
    console.error('[WechatPay] 通知验证失败:', e.message);
    return null;
  }
}

/**
 * 查询订单支付状态
 */
export async function queryOrder(orderNo: string): Promise<{
  trade_no: string;
  status: string;
  amount: number;
  pay_time: string;
} | null> {
  const wxpay = getWxPay();
  if (!wxpay) return null;

  try {
    const result: any = await wxpay.query({ out_trade_no: orderNo });
    const data = result?.data || result;
    return {
      trade_no: data.transaction_id || '',
      status: data.trade_state || '',
      amount: (data.amount?.payer_total || 0) / 100,
      pay_time: data.success_time || '',
    };
  } catch (e: any) {
    console.error('[WechatPay] 查询失败:', e.message);
    return null;
  }
}

/**
 * 创建退款
 */
export async function createRefund(params: {
  orderNo: string;
  refundNo: string;
  totalAmount: number;
  refundAmount: number;
  reason: string;
}): Promise<{ refund_no: string; status: string } | null> {
  const wxpay = getWxPay();
  if (!wxpay) return null;

  try {
    const result: any = await wxpay.refunds({
      out_trade_no: params.orderNo,
      out_refund_no: params.refundNo,
      amount: {
        refund: Math.round(params.refundAmount * 100),
        total: Math.round(params.totalAmount * 100),
        currency: 'CNY',
      },
    });

    if (result.error) {
      let errorMsg = '微信退款请求失败';
      try {
        const errObj = JSON.parse(result.error);
        errorMsg = errObj.message || errorMsg;
      } catch(e) {
        errorMsg = result.error;
      }
      throw new Error(errorMsg);
    }

    const data = result?.data || result;
    return {
      refund_no: String(data.refund_id || params.refundNo),
      status: String(data.status || 'PROCESSING'),
    };
  } catch (e: any) {
    console.error('[WechatPay] 退款失败:', e.message);
    return null;
  }
}

/**
 * 检查微信支付是否已配置
 */
export function isWechatPayConfigured(): boolean {
  const mode = PaymentConfig.getPaymentMode();
  return mode !== 'mock' && PaymentConfig.isWechatConfigComplete();
}
