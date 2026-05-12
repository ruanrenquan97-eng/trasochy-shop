"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createOrder = createOrder;
exports.captureOrder = captureOrder;
const getBaseUrl = () => {
    return process.env.PAYMENT_MODE === 'production'
        ? 'https://api-m.paypal.com'
        : 'https://api-m.sandbox.paypal.com';
};
async function getAccessToken() {
    const clientId = process.env.PAYPAL_CLIENT_ID || 'mock_client';
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET || 'mock_secret';
    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const response = await fetch(`${getBaseUrl()}/v1/oauth2/token`, {
        method: 'POST',
        body: 'grant_type=client_credentials',
        headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
        },
    });
    const data = await response.json();
    if (!response.ok) {
        throw new Error(`PayPal Auth Error: ${JSON.stringify(data)}`);
    }
    return data.access_token;
}
async function createOrder(params) {
    if (process.env.PAYMENT_MODE === 'mock') {
        return `${params.returnUrl}&mock_paypal=1`;
    }
    const accessToken = await getAccessToken();
    const response = await fetch(`${getBaseUrl()}/v2/checkout/orders`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            intent: 'CAPTURE',
            purchase_units: [
                {
                    reference_id: params.orderNo,
                    amount: {
                        currency_code: params.currency || 'USD',
                        value: params.amount.toFixed(2),
                    },
                },
            ],
            payment_source: {
                paypal: {
                    experience_context: {
                        return_url: params.returnUrl,
                        cancel_url: params.returnUrl,
                    }
                }
            }
        }),
    });
    const data = await response.json();
    if (!response.ok) {
        console.error('[PayPal Create Order Error]', data);
        throw new Error(`PayPal Create Order Error: ${JSON.stringify(data)}`);
    }
    const approveLink = data.links?.find((link) => link.rel === 'approve');
    return approveLink?.href || '';
}
async function captureOrder(orderId) {
    const accessToken = await getAccessToken();
    const response = await fetch(`${getBaseUrl()}/v2/checkout/orders/${orderId}/capture`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
    });
    const data = await response.json();
    return { ok: response.ok, data };
}
