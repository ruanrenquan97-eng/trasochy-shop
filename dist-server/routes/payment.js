"use strict";
/**
 * 支付 API 路由
 *
 * POST /payment/create         [auth] 创建预支付
 * POST /payment/wechat/notify          微信回调（平台调用，无auth）
 * POST /payment/alipay/notify          支付宝回调（平台调用，无auth）
 * GET  /payment/query/:orderNo [auth] 轮询查询支付状态
 * POST /payment/refund/:orderNo [admin/staff] 退款
 * POST /payment/mock/:orderNo   [auth] 模拟支付（仅mock模式）
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_2 = __importDefault(require("express"));
const index_1 = require("../db/index");
const auth_1 = require("../middleware/auth");
const payment_1 = require("../services/payment");
const stripe_1 = require("../services/stripe");
const paypal_1 = require("../services/paypal");
const router = (0, express_1.Router)();
// ============ 创建预支付 ============
router.post('/create', auth_1.authMiddleware, async (req, res) => {
    try {
        const { orderNo, channel, returnUrl } = req.body;
        if (!orderNo || !channel) {
            res.status(400).json({ error: '缺少订单号或支付渠道' });
            return;
        }
        if (!['wechat', 'alipay', 'visa', 'paypal'].includes(channel)) {
            res.status(400).json({ error: '不支持的支付渠道' });
            return;
        }
        const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';
        const userAgent = req.headers['user-agent'] || '';
        const finalReturnUrl = returnUrl || `${req.protocol}://${req.get('host')}/payment/result?orderNo=${orderNo}`;
        const result = await (0, payment_1.createPayment)({
            orderNo,
            channel,
            clientIp,
            userAgent,
            returnUrl: finalReturnUrl,
        });
        res.json({ success: true, ...result });
    }
    catch (e) {
        console.error('[Payment] 创建预支付失败:', e.message);
        res.status(500).json({ error: e.message || '创建预支付失败' });
    }
});
// ============ 微信支付回调（需要raw body验签） ============
router.post('/wechat/notify', express_2.default.text({ type: '*/*' }), async (req, res) => {
    try {
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        const headers = {};
        const wechatHeaders = [
            'wechatpay-timestamp', 'wechatpay-nonce', 'wechatpay-signature',
            'wechatpay-serial', 'wechatpay-signature-type',
        ];
        for (const h of wechatHeaders) {
            const val = req.headers[h];
            if (val)
                headers[h] = Array.isArray(val) ? val[0] : val;
        }
        const success = await (0, payment_1.handleWechatNotification)(headers, body);
        if (success) {
            res.json({ code: 'SUCCESS', message: '成功' });
        }
        else {
            res.status(400).json({ code: 'FAIL', message: '处理失败' });
        }
    }
    catch (e) {
        console.error('[Payment] 微信回调处理异常:', e.message);
        res.status(500).json({ code: 'FAIL', message: e.message });
    }
});
// ============ 支付宝回调 ============
router.post('/alipay/notify', async (req, res) => {
    try {
        const params = req.body;
        const success = await (0, payment_1.handleAlipayNotification)(params);
        if (success) {
            res.send('success');
        }
        else {
            res.status(400).send('fail');
        }
    }
    catch (e) {
        console.error('[Payment] 支付宝回调处理异常:', e.message);
        res.status(500).send('fail');
    }
});
// ============ Stripe 回调 ============
router.post('/stripe/notify', express_2.default.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!endpointSecret || !sig) {
        res.status(400).send('Webhook Secret or Signature missing');
        return;
    }
    try {
        const event = stripe_1.stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
        if (event.type === 'checkout.session.completed') {
            const session = event.data.object;
            const orderNo = session.client_reference_id;
            const tradeNo = session.payment_intent;
            const amount = session.amount_total / 100;
            (0, payment_1.processNotification)(orderNo, 'visa', tradeNo, amount, session);
        }
        res.json({ received: true });
    }
    catch (err) {
        console.error('[Stripe Webhook Error]', err.message);
        res.status(400).send(`Webhook Error: ${err.message}`);
    }
});
// ============ PayPal 回调 ============
router.post('/paypal/notify', express_2.default.json(), async (req, res) => {
    try {
        const event = req.body;
        if (event.event_type === 'CHECKOUT.ORDER.APPROVED') {
            const order = event.resource;
            const captureResult = await (0, paypal_1.captureOrder)(order.id);
            if (captureResult.ok && captureResult.data.status === 'COMPLETED') {
                const orderNo = order.purchase_units[0].reference_id;
                const data = captureResult.data;
                if (data.status === 'COMPLETED') {
                    const tradeNo = data.id;
                    const amount = parseFloat(data.purchase_units?.[0]?.payments?.captures?.[0]?.amount?.value || 0);
                    (0, payment_1.processNotification)(orderNo, 'paypal', tradeNo, amount, captureResult.data);
                }
            }
        }
        res.json({ received: true });
    }
    catch (err) {
        console.error('[PayPal Webhook Error]', err.message);
        res.status(400).send(`Webhook Error: ${err.message}`);
    }
});
// ============ 查询支付状态 ============
router.get('/query/:orderNo', auth_1.authMiddleware, async (req, res) => {
    try {
        const orderNo = String(req.params.orderNo);
        const order = index_1.sqlite.prepare('SELECT id FROM orders WHERE order_no = ? AND user_id = ?')
            .get(orderNo, req.user.id);
        if (!order) {
            res.status(404).json({ error: '订单不存在' });
            return;
        }
        const result = await (0, payment_1.queryPayment)(orderNo);
        res.json({ success: true, ...result });
    }
    catch (e) {
        res.status(500).json({ error: e.message || '查询支付状态失败' });
    }
});
// ============ 退款 ============
router.post('/refund/:orderNo', auth_1.staffMiddleware, (0, auth_1.permissionMiddleware)('orders'), async (req, res) => {
    try {
        const orderNo = String(req.params.orderNo);
        const { reason } = req.body || {};
        const result = await (0, payment_1.refundPayment)(orderNo, reason || '管理员退款');
        res.json(result);
    }
    catch (e) {
        res.status(500).json({ success: false, refundNo: '', message: e.message || '退款失败' });
    }
});
// ============ 模拟支付（仅mock模式） ============
router.post('/mock/:orderNo', auth_1.authMiddleware, async (req, res) => {
    const mode = (process.env.PAYMENT_MODE || 'mock').toLowerCase();
    if (mode !== 'mock') {
        res.status(403).json({ error: '当前非Mock模式，不可使用模拟支付' });
        return;
    }
    try {
        const { orderNo } = req.params;
        const userId = req.user.id;
        (0, payment_1.mockPaymentSuccess)(orderNo, userId);
        res.json({ success: true, message: '模拟支付成功' });
    }
    catch (e) {
        res.status(400).json({ error: e.message });
    }
});
exports.default = router;
