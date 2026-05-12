const WxPay = require('wechatpay-node-v3');
const fs = require('fs');
const path = require('path');

const certPath = path.resolve('certs/apiclient_cert.pem');
const keyPath = path.resolve('certs/apiclient_key.pem');

const publicKey = fs.readFileSync(certPath, 'utf-8');
const privateKey = fs.readFileSync(keyPath, 'utf-8');

const wxpay = new WxPay({
  appid: 'wxa180a94ff0c1cde9',
  mchid: '1699250292',
  publicKey: Buffer.from(publicKey),
  privateKey: Buffer.from(privateKey),
  key: 'MellgenBiotech2018813RuanRenQuan',
  serial_no: '7A905DC00DCE8A516D15EC2DC063E55CCEF7E269'
});

async function test() {
  try {
    const result = await wxpay.transactions_h5({
      description: 'Test Order',
      out_trade_no: 'TEST_' + Date.now(),
      notify_url: 'https://www.trasochy.com/api/payment/wechat/notify',
      amount: {
        total: 1,
        currency: 'CNY',
      },
      scene_info: {
        payer_client_ip: '127.0.0.1',
        h5_info: {
          type: 'Wap',
          app_url: 'https://www.trasochy.com',
          app_name: '传诗奇商城',
        },
      },
    });
    console.log('Result:', result);
  } catch (e) {
    console.error('Error:', e);
  }
}

test();
