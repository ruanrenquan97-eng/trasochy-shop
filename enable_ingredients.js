const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'data/skincare.db');
const db = new Database(dbPath);

db.prepare(`
  INSERT INTO site_settings (key, value, description)
  VALUES ('feature_ingredient_glossary', '1', '开启成分百科功能 (1开启/0关闭)')
  ON CONFLICT(key) DO UPDATE SET value = '1'
`).run();

console.log('Feature ingredient glossary enabled.');
