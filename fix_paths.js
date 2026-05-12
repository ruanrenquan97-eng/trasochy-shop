const sqlite = require('better-sqlite3');
const db = new sqlite('./data/skincare.db');
db.prepare("UPDATE site_settings SET value = './certs/apiclient_cert.pem' WHERE key = 'wechat_cert_path'").run();
db.prepare("UPDATE site_settings SET value = './certs/apiclient_key.pem' WHERE key = 'wechat_key_path'").run();
console.log('Fixed wechat cert paths in database.');
