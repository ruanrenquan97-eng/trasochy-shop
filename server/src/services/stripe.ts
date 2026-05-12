import Stripe from 'stripe';
import { sqlite } from '../db/index';

const stripeKey = process.env.STRIPE_SECRET_KEY || 'sk_test_mock';
// @ts-ignore
export const stripe = new Stripe(stripeKey, {
  apiVersion: '2023-10-16' as any,
});

export interface CreateStripeSessionParams {
  orderNo: string;
  amount: number;
  currency?: string;
  returnUrl: string;
}

export async function createCheckoutSession(params: CreateStripeSessionParams): Promise<string> {
  if (process.env.PAYMENT_MODE === 'mock') {
    return `${params.returnUrl}&mock_stripe=1`;
  }

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: params.currency || 'cny',
          product_data: {
            name: `Order ${params.orderNo}`,
          },
          unit_amount: Math.round(params.amount * 100),
        },
        quantity: 1,
      },
    ],
    mode: 'payment',
    success_url: params.returnUrl,
    cancel_url: params.returnUrl,
    client_reference_id: params.orderNo,
  });

  return session.url as string;
}

export async function createRefund(params: { orderNo: string; refundNo: string; refundAmount: number; reason: string }): Promise<boolean> {
  if (process.env.PAYMENT_MODE === 'mock') {
    return true;
  }
  
  const order = sqlite.prepare('SELECT trade_no FROM orders WHERE order_no = ?').get(params.orderNo) as any;
  if (!order || !order.trade_no) return false;

  try {
    await stripe.refunds.create({
      payment_intent: order.trade_no,
      amount: Math.round(params.refundAmount * 100),
    });
    return true;
  } catch (error) {
    console.error('[Stripe Refund Error]', error);
    return false;
  }
}
