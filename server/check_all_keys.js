const Database = require('better-sqlite3');
const path = require('path');
const dbPath = path.resolve(__dirname, 'data/skincare.db');
const db = new Database(dbPath);
const allSettings = db.prepare("SELECT key, value FROM site_settings").all();
console.log(allSettings.map(s => s.key).join(', '));
