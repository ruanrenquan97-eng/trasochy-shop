const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'skincare.db');
const db = new Database(dbPath);

console.log('Creating user_behavior_logs table...');

try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_behavior_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      user_id INTEGER REFERENCES users(id),
      action_type TEXT NOT NULL,
      path TEXT NOT NULL,
      product_id INTEGER REFERENCES products(id),
      dwell_time INTEGER DEFAULT 0,
      created_at INTEGER DEFAULT (cast(strftime('%s','now') as int) * 1000)
    );
  `);
  console.log('Table user_behavior_logs created or already exists.');
} catch (error) {
  console.error('Error creating table:', error);
}
