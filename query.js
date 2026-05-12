const sqlite = require('better-sqlite3');
const db = new sqlite('./data/skincare.db');
const rows = db.prepare("SELECT key, value FROM site_settings WHERE key LIKE 'wechat_%' OR key = 'payment_mode'").all();
console.log(rows);
