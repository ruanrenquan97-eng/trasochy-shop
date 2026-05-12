const jwt = require('jsonwebtoken');
const http = require('http');

const JWT_SECRET = process.env.JWT_SECRET || 'skincare_secret_key_2024';
const token = jwt.sign({ id: 1, level: 'admin' }, JWT_SECRET, { expiresIn: '1d' });

const req = http.request({
  hostname: '127.0.0.1',
  port: 5000,
  path: '/api/admin/users?limit=20&page=1',
  method: 'GET',
  headers: {
    'Authorization': 'Bearer ' + token
  }
}, res => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log(res.statusCode, data));
});
req.on('error', console.error);
req.end();
