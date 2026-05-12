"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.stripe = void 0;
exports.createCheckoutSession = createCheckoutSession;
exports.createRefund = createRefund;
const stripe_1 = __importDefault(require("stripe"));
const index_1 = require("../db/index");
const stripeKey = process.env.STRIPE_SECRET_KEY || 'sk_test_mock';
// @ts-ignore
exports.stripe = new stripe_1.default(stripeKey, {
    apiVersion: '2023-10-16',
});
async function createCheckoutSession(params) {
    if (process.env.PAYMENT_MODE === 'mock') {
        return `${params.returnUrl}&mock_stripe=1`;
    }
    const session = await exports.stripe.checkout.sessions.create({
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
    return session.url;
}
async function createRefund(params) {
    if (process.env.PAYMENT_MODE === 'mock') {
        return true;
    }
    const order = index_1.sqlite.prepare('SELECT trade_no FROM orders WHERE order_no = ?').get(params.orderNo);
    if (!order || !order.trade_no)
        return false;
    try {
        await exports.stripe.refunds.create({
            payment_intent: order.trade_no,
            amount: Math.round(params.refundAmount * 100),
        });
        return true;
    }
    catch (error) {
        console.error('[Stripe Refund Error]', error);
        return false;
    }
}
