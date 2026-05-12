const db = require('better-sqlite3')('../data/skincare.db');
console.log(db.prepare("PRAGMA table_info('users')").all());
