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

import { Router, Request, Response } from 'express';
import express from 'express';
import { sqlite } from '../db/index';
import { authMiddleware, staffMiddleware, permissionMiddleware } from '../middleware/auth';
import {
  createPayment,
  handleWechatNotification,
  handleAlipayNotification,
  queryPayment,
  refundPayment,
  mockPaymentSuccess,
  processNotification,
} from '../services/payment';
import { stripe } from '../services/stripe';
import { captureOrder } from '../services/paypal';

const router = Router();

// ============ 创建预支付 ============
router.post('/create', authMiddleware, async (req: Request, res: Response) => {
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

    const result = await createPayment({
      orderNo,
      channel,
      clientIp,
      userAgent,
      returnUrl: finalReturnUrl,
    });

    res.json({ success: true, ...result });
  } catch (e: any) {
    console.error('[Payment] 创建预支付失败:', e.message);
    res.status(500).json({ error: e.message || '创建预支付失败' });
  }
});

// ============ 微信支付回调（需要raw body验签） ============
router.post('/wechat/notify', express.text({ type: '*/*' }), async (req: Request, res: Response) => {
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const headers: Record<string, string> = {};

    const wechatHeaders = [
      'wechatpay-timestamp', 'wechatpay-nonce', 'wechatpay-signature',
      'wechatpay-serial', 'wechatpay-signature-type',
    ];
    for (const h of wechatHeaders) {
      const val = req.headers[h];
      if (val) headers[h] = Array.isArray(val) ? val[0] : val;
    }

    const success = await handleWechatNotification(headers, body);

    if (success) {
      res.json({ code: 'SUCCESS', message: '成功' });
    } else {
      res.status(400).json({ code: 'FAIL', message: '处理失败' });
    }
  } catch (e: any) {
    console.error('[Payment] 微信回调处理异常:', e.message);
    res.status(500).json({ code: 'FAIL', message: e.message });
  }
});

// ============ 支付宝回调 ============
router.post('/alipay/notify', async (req: Request, res: Response) => {
  try {
    const params = req.body as Record<string, string>;
    const success = await handleAlipayNotification(params);

    if (success) {
      res.send('success');
    } else {
      res.status(400).send('fail');
    }
  } catch (e: any) {
    console.error('[Payment] 支付宝回调处理异常:', e.message);
    res.status(500).send('fail');
  }
});

// ============ Stripe 回调 ============
router.post('/stripe/notify', express.raw({ type: 'application/json' }), async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!endpointSecret || !sig) {
    res.status(400).send('Webhook Secret or Signature missing');
    return;
  }

  try {
    const event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as any;
      const orderNo = session.client_reference_id;
      const tradeNo = session.payment_intent;
      const amount = session.amount_total / 100;
      
      processNotification(orderNo, 'visa', tradeNo, amount, session);
    }
    
    res.json({ received: true });
  } catch (err: any) {
    console.error('[Stripe Webhook Error]', err.message);
    res.status(400).send(`Webhook Error: ${err.message}`);
  }
});

// ============ PayPal 回调 ============
router.post('/paypal/notify', express.json(), async (req: Request, res: Response) => {
  try {
    const event = req.body;
    
    if (event.event_type === 'CHECKOUT.ORDER.APPROVED') {
      const order = event.resource;
      const captureResult = await captureOrder(order.id);
      
      if (captureResult.ok && captureResult.data.status === 'COMPLETED') {
        const orderNo = order.purchase_units[0].reference_id;
        const data = captureResult.data as any;

        if (data.status === 'COMPLETED') {
          const tradeNo = data.id;
          const amount = parseFloat(data.purchase_units?.[0]?.payments?.captures?.[0]?.amount?.value || 0);
          
          processNotification(orderNo, 'paypal', tradeNo, amount, captureResult.data);
        }
      }
    }
    
    res.json({ received: true });
  } catch (err: any) {
    console.error('[PayPal Webhook Error]', err.message);
    res.status(400).send(`Webhook Error: ${err.message}`);
  }
});


// ============ 查询支付状态 ============
router.get('/query/:orderNo', authMiddleware, async (req: Request, res: Response) => {
  try {
    const orderNo = String(req.params.orderNo);

    const order = sqlite.prepare('SELECT id FROM orders WHERE order_no = ? AND user_id = ?')
      .get(orderNo, req.user!.id) as any;
    if (!order) {
      res.status(404).json({ error: '订单不存在' });
      return;
    }

    const result = await queryPayment(orderNo);
    res.json({ success: true, ...result });
  } catch (e: any) {
    res.status(500).json({ error: e.message || '查询支付状态失败' });
  }
});

// ============ 退款 ============
router.post('/refund/:orderNo', authMiddleware, staffMiddleware, permissionMiddleware('orders'), async (req: Request, res: Response) => {
  try {
    const orderNo = String(req.params.orderNo);
    const { reason } = req.body || {};

    const result = await refundPayment(orderNo, reason || '管理员退款');
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ success: false, refundNo: '', message: e.message || '退款失败' });
  }
});

// ============ 模拟支付（仅mock模式） ============
router.post('/mock/:orderNo', authMiddleware, async (req: Request, res: Response) => {
  const mode = (process.env.PAYMENT_MODE || 'mock').toLowerCase();
  if (mode !== 'mock') {
    res.status(403).json({ error: '当前非Mock模式，不可使用模拟支付' });
    return;
  }

  try {
    const { orderNo } = req.params;
    const userId = req.user!.id;
    mockPaymentSuccess(orderNo as string, userId as unknown as number);
    res.json({ success: true, message: '模拟支付成功' });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
