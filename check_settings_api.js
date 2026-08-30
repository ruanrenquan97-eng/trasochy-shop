const http = require('http');

http.get('http://localhost:7000/api/settings', (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log('Settings:', JSON.parse(data));
  });
}).on('error', (err) => {
  console.error('Error:', err.message);
});
