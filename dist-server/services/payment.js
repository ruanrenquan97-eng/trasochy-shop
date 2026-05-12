"use strict";
/**
 * 统一支付服务 — 支付入口调度层
 *
 * 根据支付模式和渠道，调用微信支付或支付宝服务。
 * 负责订单状态更新、支付日志记录、幂等处理。
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
exports.createPayment = createPayment;
exports.handleWechatNotification = handleWechatNotification;
exports.handleAlipayNotification = handleAlipayNotification;
exports.processNotification = processNotification;
exports.queryPayment = queryPayment;
exports.refundPayment = refundPayment;
exports.mockPaymentSuccess = mockPaymentSuccess;
const index_1 = require("../db/index");
const WechatPay = __importStar(require("./wechat-pay"));
const Alipay = __importStar(require("./alipay"));
const StripePay = __importStar(require("./stripe"));
const Paypal = __importStar(require("./paypal"));
const PaymentConfig = __importStar(require("./payment-config"));
const getPaymentMode = () => PaymentConfig.getPaymentMode();
// ============ 创建预支付 ============
async function createPayment(params) {
    const mode = getPaymentMode();
    // 1. 查询订单
    const order = index_1.sqlite.prepare('SELECT * FROM orders WHERE order_no = ?').get(params.orderNo);
    if (!order)
        throw new Error('订单不存在');
    if (order.status !== 'pending')
        throw new Error(`订单状态不允许支付（当前：${order.status}）`);
    // 2. 记录支付日志
    index_1.sqlite.prepare(`
    INSERT INTO payment_logs (order_id, channel, status, amount, created_at, updated_at)
    VALUES (?, ?, 'pending', ?, ?, ?)
  `).run(order.id, params.channel, order.pay_amount, Date.now(), Date.now());
    // 3. Mock模式 — 直接返回模拟
    if (mode === 'mock') {
        return {
            type: 'mock',
            data: '',
            orderNo: params.orderNo,
            payAmount: order.pay_amount,
        };
    }
    // 4. 微信支付
    if (params.channel === 'wechat') {
        const ua = params.userAgent || '';
        // 检测是否微信浏览器 → JSAPI，否则判断是否手机浏览器 → H5，否则(PC) → Native
        if (/MicroMessenger/i.test(ua)) {
            // JSAPI支付 — 需要openid（这里简化处理，实际需要前端或OAuth获取，这里演示可能报错如果openid缺失）
            // 此处假设我们仍然由于openid问题暂未完全实现，若前端能传openid，则需调用 createJSAPIOrder
            // 但为了兼容先返回一个提示或者调用jsapi（由于缺乏openid可能会失败）
            // TODO: 完整的JSAPI支付需要openid参数
            return {
                type: 'jsapi',
                data: '需要微信OAuth获取openid才能进行JSAPI支付，暂未完全实现',
                orderNo: params.orderNo,
                payAmount: order.pay_amount,
            };
        }
        else if (/Mobile|Android|iPhone|iPad/i.test(ua)) {
            // 手机外部浏览器 -> H5支付
            const result = await WechatPay.createH5Order({
                orderNo: params.orderNo,
                amount: order.pay_amount,
                description: `传诗奇订单-${params.orderNo}`,
                clientIp: params.clientIp || '127.0.0.1',
                returnUrl: params.returnUrl,
            });
            return {
                type: 'h5_url',
                data: result.h5_url || '',
                orderNo: params.orderNo,
                payAmount: order.pay_amount,
            };
        }
        else {
            // PC浏览器 -> Native支付
            const result = await WechatPay.createNativeOrder({
                orderNo: params.orderNo,
                amount: order.pay_amount,
                description: `传诗奇订单-${params.orderNo}`,
            });
            return {
                type: 'native_qrcode',
                data: result.code_url || '',
                orderNo: params.orderNo,
                payAmount: order.pay_amount,
            };
        }
    }
    // 5. 支付宝
    if (params.channel === 'alipay') {
        const formHtml = await Alipay.createWapOrder({
            orderNo: params.orderNo,
            amount: order.pay_amount,
            subject: `传诗奇订单-${params.orderNo}`,
            returnUrl: params.returnUrl,
        });
        return {
            type: 'form',
            data: formHtml,
            orderNo: params.orderNo,
            payAmount: order.pay_amount,
        };
    }
    // 6. Visa / Credit Card via Stripe
    if (params.channel === 'visa') {
        const url = await StripePay.createCheckoutSession({
            orderNo: params.orderNo,
            amount: order.pay_amount,
            returnUrl: params.returnUrl,
        });
        return {
            type: 'h5_url',
            data: url,
            orderNo: params.orderNo,
            payAmount: order.pay_amount,
        };
    }
    // 7. PayPal
    if (params.channel === 'paypal') {
        const url = await Paypal.createOrder({
            orderNo: params.orderNo,
            amount: order.pay_amount,
            returnUrl: params.returnUrl,
        });
        return {
            type: 'h5_url',
            data: url,
            orderNo: params.orderNo,
            payAmount: order.pay_amount,
        };
    }
    throw new Error('不支持的支付渠道');
}
// ============ 处理支付通知 ============
async function handleWechatNotification(headers, body) {
    const result = await WechatPay.verifyNotification(headers, body);
    if (!result)
        return false;
    return processNotification(result.out_trade_no, 'wechat', result.trade_no, result.amount, body);
}
async function handleAlipayNotification(params) {
    const verified = Alipay.verifyNotification(params);
    if (!verified) {
        console.log('[Payment] 支付宝通知验签失败');
        return false;
    }
    const parsed = Alipay.parseNotification(params);
    if (!parsed)
        return false;
    // 支付宝 trade_status: TRADE_SUCCESS, TRADE_FINISHED
    const isSuccess = parsed.status === 'TRADE_SUCCESS' || parsed.status === 'TRADE_FINISHED';
    if (!isSuccess) {
        console.log(`[Payment] 支付宝通知状态非成功: ${parsed.status}`);
        return false;
    }
    return processNotification(parsed.out_trade_no, 'alipay', parsed.trade_no, parsed.amount, params);
}
/**
 * 统一处理支付成功通知（幂等）
 */
function processNotification(outTradeNo, channel, tradeNo, amount, rawNotify) {
    // 查询订单
    const order = index_1.sqlite.prepare('SELECT * FROM orders WHERE order_no = ?').get(outTradeNo);
    if (!order) {
        console.log(`[Payment] 订单不存在: ${outTradeNo}`);
        return false;
    }
    // 幂等：已支付过的订单不再处理
    if (order.status === 'paid') {
        console.log(`[Payment] 订单已支付，跳过: ${outTradeNo}`);
        return true;
    }
    // 金额校验（允许1分钱误差）
    if (Math.abs(order.pay_amount - amount) > 0.01) {
        console.error(`[Payment] 金额不匹配! 订单=${order.pay_amount}, 通知=${amount}, orderNo=${outTradeNo}`);
        // 仍然更新，但记录告警
    }
    const now = Date.now();
    // 更新订单状态
    const updateOrder = index_1.sqlite.transaction(() => {
        index_1.sqlite.prepare(`
      UPDATE orders
      SET status = 'paid', pay_time = ?, trade_no = ?, updated_at = ?
      WHERE order_no = ? AND status = 'pending'
    `).run(now, tradeNo, now, outTradeNo);
        // 更新支付日志
        index_1.sqlite.prepare(`
      UPDATE payment_logs
      SET status = 'success', trade_no = ?, raw_notify = ?, updated_at = ?
      WHERE order_id = ? AND channel = ? AND status = 'pending'
    `).run(tradeNo, JSON.stringify(rawNotify), now, order.id, channel);
        // 更新用户消费总额
        index_1.sqlite.prepare(`
      UPDATE users SET total_spend = total_spend + ?, updated_at = ? WHERE id = ?
    `).run(order.pay_amount, now, order.user_id);
        // 读取积分日配置
        const pointsDayActiveRow = index_1.sqlite.prepare("SELECT value FROM site_settings WHERE key='points_day_active'").get();
        const pointsDayMultiplierRow = index_1.sqlite.prepare("SELECT value FROM site_settings WHERE key='points_day_multiplier'").get();
        const pointsDayActive = pointsDayActiveRow?.value === '1';
        const pointsDayMultiplier = parseFloat(pointsDayMultiplierRow?.value || '2');
        // 读取合伙人返利比例配置
        const rebateDefaultRow = index_1.sqlite.prepare("SELECT value FROM site_settings WHERE key='partner_rebate_default'").get();
        const rebateAdvancedRow = index_1.sqlite.prepare("SELECT value FROM site_settings WHERE key='partner_rebate_advanced'").get();
        const rebateSuperRow = index_1.sqlite.prepare("SELECT value FROM site_settings WHERE key='partner_rebate_super'").get();
        const rebateGoldRow = index_1.sqlite.prepare("SELECT value FROM site_settings WHERE key='partner_rebate_gold'").get();
        const rebateDiamondRow = index_1.sqlite.prepare("SELECT value FROM site_settings WHERE key='partner_rebate_diamond'").get();
        const rebateDefault = (rebateDefaultRow && rebateDefaultRow.value !== '') ? parseFloat(rebateDefaultRow.value) : 0.10;
        const rebateAdvanced = (rebateAdvancedRow && rebateAdvancedRow.value !== '') ? parseFloat(rebateAdvancedRow.value) : 0.15;
        const rebateSuper = (rebateSuperRow && rebateSuperRow.value !== '') ? parseFloat(rebateSuperRow.value) : 0.20;
        const rebateGold = (rebateGoldRow && rebateGoldRow.value !== '') ? parseFloat(rebateGoldRow.value) : 0.25;
        const rebateDiamond = (rebateDiamondRow && rebateDiamondRow.value !== '') ? parseFloat(rebateDiamondRow.value) : 0.30;
        // 读取合伙人邀请门槛配置
        const thresholdAdvRow = index_1.sqlite.prepare("SELECT value FROM site_settings WHERE key='partner_threshold_advanced'").get();
        const thresholdSupRow = index_1.sqlite.prepare("SELECT value FROM site_settings WHERE key='partner_threshold_super'").get();
        const thresholdGoldRow = index_1.sqlite.prepare("SELECT value FROM site_settings WHERE key='partner_threshold_gold'").get();
        const thresholdDiaRow = index_1.sqlite.prepare("SELECT value FROM site_settings WHERE key='partner_threshold_diamond'").get();
        const tAdv = (thresholdAdvRow && thresholdAdvRow.value !== '') ? parseInt(thresholdAdvRow.value) : 10;
        const tSup = (thresholdSupRow && thresholdSupRow.value !== '') ? parseInt(thresholdSupRow.value) : 50;
        const tGold = (thresholdGoldRow && thresholdGoldRow.value !== '') ? parseInt(thresholdGoldRow.value) : 100;
        const tDia = (thresholdDiaRow && thresholdDiaRow.value !== '') ? parseInt(thresholdDiaRow.value) : 500;
        // 1. 购买者基础积分（实付金额 1:1，如遇积分日则翻倍）
        const baseBuyerPoints = Math.floor(order.pay_amount);
        if (baseBuyerPoints > 0) {
            const finalBuyerPoints = pointsDayActive ? Math.floor(baseBuyerPoints * pointsDayMultiplier) : baseBuyerPoints;
            index_1.sqlite.prepare("UPDATE users SET points = points + ? WHERE id=?").run(finalBuyerPoints, order.user_id);
            index_1.sqlite.prepare("INSERT INTO points_history (user_id, amount, type, description, created_at) VALUES (?, ?, ?, ?, ?)").run(order.user_id, finalBuyerPoints, 'purchase_reward', `购物奖励 (订单号: ${outTradeNo})${pointsDayActive ? ' [积分日翻倍]' : ''}`, now);
        }
        // 2. 推荐人返利（合伙人阶梯等级）
        const buyer = index_1.sqlite.prepare("SELECT referred_by FROM users WHERE id=?").get(order.user_id);
        if (buyer && buyer.referred_by) {
            const referrer = index_1.sqlite.prepare("SELECT partner_tier FROM users WHERE id=?").get(buyer.referred_by);
            let referralPercentage = rebateDefault;
            if (referrer && referrer.partner_tier) {
                // 使用手动覆盖的等级
                if (referrer.partner_tier === 'diamond')
                    referralPercentage = rebateDiamond;
                else if (referrer.partner_tier === 'gold')
                    referralPercentage = rebateGold;
                else if (referrer.partner_tier === 'super')
                    referralPercentage = rebateSuper;
                else if (referrer.partner_tier === 'advanced')
                    referralPercentage = rebateAdvanced;
            }
            else {
                // 自动计算推荐人已推荐的总人数
                const refCountRow = index_1.sqlite.prepare("SELECT COUNT(*) as c FROM users WHERE referred_by=?").get(buyer.referred_by);
                const refCount = refCountRow.c || 0;
                if (refCount >= tDia)
                    referralPercentage = rebateDiamond;
                else if (refCount >= tGold)
                    referralPercentage = rebateGold;
                else if (refCount >= tSup)
                    referralPercentage = rebateSuper;
                else if (refCount >= tAdv)
                    referralPercentage = rebateAdvanced;
            }
            const baseReferralPoints = Math.floor(order.pay_amount * referralPercentage);
            if (baseReferralPoints > 0) {
                const finalReferralPoints = pointsDayActive ? Math.floor(baseReferralPoints * pointsDayMultiplier) : baseReferralPoints;
                index_1.sqlite.prepare("UPDATE users SET points = points + ? WHERE id=?").run(finalReferralPoints, buyer.referred_by);
                index_1.sqlite.prepare("INSERT INTO points_history (user_id, amount, type, description, created_at) VALUES (?, ?, ?, ?, ?)").run(buyer.referred_by, finalReferralPoints, 'referral_reward', `推荐用户下单奖励 (订单号: ${outTradeNo}, 返利比例: ${referralPercentage * 100}%)${pointsDayActive ? ' [积分日翻倍]' : ''}`, now);
            }
        }
    });
    try {
        updateOrder();
        console.log(`[Payment] 订单支付成功: ${outTradeNo}, 渠道=${channel}, 交易号=${tradeNo}`);
        return true;
    }
    catch (e) {
        console.error(`[Payment] 更新订单失败: ${e.message}`);
        return false;
    }
}
// ============ 查询支付状态 ============
async function queryPayment(orderNo) {
    const order = index_1.sqlite.prepare('SELECT * FROM orders WHERE order_no = ?').get(orderNo);
    if (!order) {
        return { status: 'failed', tradeNo: null, payTime: null, channel: null };
    }
    // 如果已支付，直接返回数据库状态
    if (order.status === 'paid') {
        return {
            status: 'paid',
            tradeNo: order.trade_no,
            payTime: order.pay_time,
            channel: order.pay_method,
        };
    }
    // 如果已取消，返回失败
    if (order.status === 'cancelled') {
        return { status: 'failed', tradeNo: null, payTime: null, channel: order.pay_method };
    }
    // pending状态：向第三方查询
    if (getPaymentMode() !== 'mock') {
        try {
            let result = null;
            if (order.pay_method === 'wechat') {
                result = await WechatPay.queryOrder(orderNo);
            }
            else if (order.pay_method === 'alipay') {
                result = await Alipay.queryOrder(orderNo);
            }
            if (result && result.status === 'SUCCESS' || result?.status === 'TRADE_SUCCESS') {
                // 第三方确认已支付，同步更新本地
                const success = processNotification(orderNo, order.pay_method || '', result.trade_no, result.amount, { query: true });
                if (success) {
                    return {
                        status: 'paid',
                        tradeNo: result.trade_no,
                        payTime: Date.now(),
                        channel: order.pay_method,
                    };
                }
            }
        }
        catch (e) {
            console.error(`[Payment] 查询第三方失败: ${e.message}`);
        }
    }
    return {
        status: 'pending',
        tradeNo: null,
        payTime: null,
        channel: order.pay_method,
    };
}
// ============ 退款 ============
async function refundPayment(orderNo, refundReason) {
    const order = index_1.sqlite.prepare('SELECT * FROM orders WHERE order_no = ?').get(orderNo);
    if (!order) {
        return { success: false, refundNo: '', message: '订单不存在' };
    }
    if (!['paid', 'processing', 'shipped'].includes(order.status)) {
        return { success: false, refundNo: '', message: '该订单状态不允许退款' };
    }
    const refundNo = `RF${order.order_no}`;
    const now = Date.now();
    const mode = getPaymentMode();
    let refundResult = false;
    if (mode === 'mock') {
        // Mock模式直接成功
        refundResult = true;
    }
    else if (order.pay_method === 'wechat') {
        const result = await WechatPay.createRefund({
            orderNo,
            refundNo,
            totalAmount: order.pay_amount,
            refundAmount: order.pay_amount,
            reason: refundReason,
        });
        refundResult = !!result;
    }
    else if (order.pay_method === 'alipay') {
        const result = await Alipay.createRefund({
            orderNo,
            refundNo,
            refundAmount: order.pay_amount,
            reason: refundReason,
        });
        refundResult = !!result;
    }
    else if (order.pay_method === 'visa') {
        const result = await StripePay.createRefund({
            orderNo,
            refundNo,
            refundAmount: order.pay_amount,
            reason: refundReason,
        });
        refundResult = !!result;
    }
    if (refundResult) {
        const doRefund = index_1.sqlite.transaction(() => {
            index_1.sqlite.prepare(`
        UPDATE orders SET status = 'refunded', updated_at = ? WHERE order_no = ?
      `).run(now, orderNo);
            // 恢复库存
            const items = index_1.sqlite.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
            for (const item of items) {
                index_1.sqlite.prepare('UPDATE products SET stock = stock + ? WHERE id = ?').run(item.quantity, item.product_id);
            }
            // 更新用户消费总额
            index_1.sqlite.prepare(`
        UPDATE users SET total_spend = total_spend - ?, updated_at = ? WHERE id = ?
      `).run(order.pay_amount, now, order.user_id);
            // 记录退款日志
            index_1.sqlite.prepare(`
        INSERT INTO payment_logs (order_id, channel, trade_no, status, amount, created_at, updated_at)
        VALUES (?, ?, ?, 'refunded', ?, ?, ?)
      `).run(order.id, order.pay_method, refundNo, order.pay_amount, now, now);
        });
        doRefund();
        return { success: true, refundNo, message: '退款成功' };
    }
    return { success: false, refundNo: '', message: '退款失败，请重试或联系客服' };
}
// ============ Mock模式模拟支付 ============
function mockPaymentSuccess(orderNo, userId) {
    const mode = getPaymentMode();
    if (mode !== 'mock') {
        throw new Error('仅Mock模式可使用模拟支付');
    }
    const order = index_1.sqlite.prepare('SELECT * FROM orders WHERE order_no = ? AND user_id = ?').get(orderNo, userId);
    if (!order)
        throw new Error('订单不存在');
    if (order.status !== 'pending')
        throw new Error('订单状态不允许支付');
    const now = Date.now();
    const tradeNo = `MOCK_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const doMock = index_1.sqlite.transaction(() => {
        index_1.sqlite.prepare(`
      UPDATE orders
      SET status = 'paid', pay_time = ?, trade_no = ?, updated_at = ?
      WHERE order_no = ? AND status = 'pending'
    `).run(now, tradeNo, now, orderNo);
        index_1.sqlite.prepare(`
      UPDATE payment_logs
      SET status = 'success', trade_no = ?, updated_at = ?
      WHERE order_id = ? AND status = 'pending'
    `).run(tradeNo, now, order.id);
        index_1.sqlite.prepare(`
      UPDATE users SET total_spend = total_spend + ?, updated_at = ? WHERE id = ?
    `).run(order.pay_amount, now, userId);
        // 读取积分日配置
        const pointsDayActiveRow = index_1.sqlite.prepare("SELECT value FROM site_settings WHERE key='points_day_active'").get();
        const pointsDayMultiplierRow = index_1.sqlite.prepare("SELECT value FROM site_settings WHERE key='points_day_multiplier'").get();
        const pointsDayActive = pointsDayActiveRow?.value === '1';
        const pointsDayMultiplier = parseFloat(pointsDayMultiplierRow?.value || '2');
        // 读取合伙人返利比例配置
        const rebateDefaultRow = index_1.sqlite.prepare("SELECT value FROM site_settings WHERE key='partner_rebate_default'").get();
        const rebateAdvancedRow = index_1.sqlite.prepare("SELECT value FROM site_settings WHERE key='partner_rebate_advanced'").get();
        const rebateSuperRow = index_1.sqlite.prepare("SELECT value FROM site_settings WHERE key='partner_rebate_super'").get();
        const rebateGoldRow = index_1.sqlite.prepare("SELECT value FROM site_settings WHERE key='partner_rebate_gold'").get();
        const rebateDiamondRow = index_1.sqlite.prepare("SELECT value FROM site_settings WHERE key='partner_rebate_diamond'").get();
        const rebateDefault = (rebateDefaultRow && rebateDefaultRow.value !== '') ? parseFloat(rebateDefaultRow.value) : 0.10;
        const rebateAdvanced = (rebateAdvancedRow && rebateAdvancedRow.value !== '') ? parseFloat(rebateAdvancedRow.value) : 0.15;
        const rebateSuper = (rebateSuperRow && rebateSuperRow.value !== '') ? parseFloat(rebateSuperRow.value) : 0.20;
        const rebateGold = (rebateGoldRow && rebateGoldRow.value !== '') ? parseFloat(rebateGoldRow.value) : 0.25;
        const rebateDiamond = (rebateDiamondRow && rebateDiamondRow.value !== '') ? parseFloat(rebateDiamondRow.value) : 0.30;
        // 读取合伙人邀请门槛配置
        const thresholdAdvRow = index_1.sqlite.prepare("SELECT value FROM site_settings WHERE key='partner_threshold_advanced'").get();
        const thresholdSupRow = index_1.sqlite.prepare("SELECT value FROM site_settings WHERE key='partner_threshold_super'").get();
        const thresholdGoldRow = index_1.sqlite.prepare("SELECT value FROM site_settings WHERE key='partner_threshold_gold'").get();
        const thresholdDiaRow = index_1.sqlite.prepare("SELECT value FROM site_settings WHERE key='partner_threshold_diamond'").get();
        const tAdv = (thresholdAdvRow && thresholdAdvRow.value !== '') ? parseInt(thresholdAdvRow.value) : 10;
        const tSup = (thresholdSupRow && thresholdSupRow.value !== '') ? parseInt(thresholdSupRow.value) : 50;
        const tGold = (thresholdGoldRow && thresholdGoldRow.value !== '') ? parseInt(thresholdGoldRow.value) : 100;
        const tDia = (thresholdDiaRow && thresholdDiaRow.value !== '') ? parseInt(thresholdDiaRow.value) : 500;
        // 1. 购买者基础积分（实付金额 1:1，如遇积分日则翻倍）
        const baseBuyerPoints = Math.floor(order.pay_amount);
        if (baseBuyerPoints > 0) {
            const finalBuyerPoints = pointsDayActive ? Math.floor(baseBuyerPoints * pointsDayMultiplier) : baseBuyerPoints;
            index_1.sqlite.prepare("UPDATE users SET points = points + ? WHERE id=?").run(finalBuyerPoints, userId);
            index_1.sqlite.prepare("INSERT INTO points_history (user_id, amount, type, description, created_at) VALUES (?, ?, ?, ?, ?)").run(userId, finalBuyerPoints, 'purchase_reward', `购物奖励 (订单号: ${orderNo})${pointsDayActive ? ' [积分日翻倍]' : ''}`, now);
        }
        // 2. 推荐人返利（合伙人阶梯等级）
        const buyer = index_1.sqlite.prepare("SELECT referred_by FROM users WHERE id=?").get(userId);
        if (buyer && buyer.referred_by) {
            const referrer = index_1.sqlite.prepare("SELECT partner_tier FROM users WHERE id=?").get(buyer.referred_by);
            let referralPercentage = rebateDefault;
            if (referrer && referrer.partner_tier) {
                // 使用手动覆盖的等级
                if (referrer.partner_tier === 'diamond')
                    referralPercentage = rebateDiamond;
                else if (referrer.partner_tier === 'gold')
                    referralPercentage = rebateGold;
                else if (referrer.partner_tier === 'super')
                    referralPercentage = rebateSuper;
                else if (referrer.partner_tier === 'advanced')
                    referralPercentage = rebateAdvanced;
            }
            else {
                // 自动计算推荐人已推荐的总人数
                const refCountRow = index_1.sqlite.prepare("SELECT COUNT(*) as c FROM users WHERE referred_by=?").get(buyer.referred_by);
                const refCount = refCountRow.c || 0;
                if (refCount >= tDia)
                    referralPercentage = rebateDiamond;
                else if (refCount >= tGold)
                    referralPercentage = rebateGold;
                else if (refCount >= tSup)
                    referralPercentage = rebateSuper;
                else if (refCount >= tAdv)
                    referralPercentage = rebateAdvanced;
            }
            const baseReferralPoints = Math.floor(order.pay_amount * referralPercentage);
            if (baseReferralPoints > 0) {
                const finalReferralPoints = pointsDayActive ? Math.floor(baseReferralPoints * pointsDayMultiplier) : baseReferralPoints;
                index_1.sqlite.prepare("UPDATE users SET points = points + ? WHERE id=?").run(finalReferralPoints, buyer.referred_by);
                index_1.sqlite.prepare("INSERT INTO points_history (user_id, amount, type, description, created_at) VALUES (?, ?, ?, ?, ?)").run(buyer.referred_by, finalReferralPoints, 'referral_reward', `推荐用户下单奖励 (订单号: ${orderNo}, 返利比例: ${referralPercentage * 100}%)${pointsDayActive ? ' [积分日翻倍]' : ''}`, now);
            }
        }
    });
    doMock();
    return true;
}
