const Database = require('better-sqlite3');
const http = require('http');

const db = new Database('data/skincare.db');
const product = db.prepare("SELECT slug FROM products WHERE name LIKE '%寡肽%'").get();

http.get('http://localhost:5173/api/products/' + product.slug, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log('Product API response:', JSON.parse(data));
  });
}).on('error', (err) => {
  console.error('Error:', err.message);
});
