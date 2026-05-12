const Database = require('better-sqlite3');
const db = new Database('./data/skincare.db');
try {
  const q = "SELECT o.order_no, o.pay_amount, o.status, o.created_at, u.name as user_name, o.recipient_name, o.recipient_phone, o.recipient_address, (SELECT GROUP_CONCAT(product_name || ' x' || quantity, ', ') FROM order_items WHERE order_id = o.id) as products_summary FROM orders o JOIN users u ON o.user_id=u.id WHERE o.status = 'paid' ORDER BY o.created_at ASC LIMIT 10";
  console.log(db.prepare(q).all());
} catch(e) {
  console.error(e)
}
