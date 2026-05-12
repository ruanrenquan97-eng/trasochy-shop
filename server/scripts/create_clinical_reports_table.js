const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../data/skincare.db');
let db;
try {
  db = new Database(dbPath);
} catch (e) {
  console.log("Database not found", e);
  process.exit(1);
}

db.exec(`
CREATE TABLE IF NOT EXISTS clinical_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  summary TEXT,
  cover_image TEXT,
  pdf_url TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  translations TEXT,
  published_at INTEGER,
  created_at INTEGER DEFAULT (cast(strftime('%s','now') as int) * 1000),
  updated_at INTEGER DEFAULT (cast(strftime('%s','now') as int) * 1000)
);
`);
console.log('clinical_reports table created successfully.');
