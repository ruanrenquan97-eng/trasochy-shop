const db = require('better-sqlite3')('data/skincare.db');
const row = db.prepare("SELECT * FROM site_settings WHERE key = 'megvii_pro_api_key'").get();
console.log(row);
