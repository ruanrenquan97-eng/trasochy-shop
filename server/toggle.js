const db = require('better-sqlite3')('../data/skincare.db');
db.prepare("INSERT INTO site_settings (key, value, description) VALUES ('feature_company_intro', '1', '开启品牌与技术团队介绍') ON CONFLICT(key) DO UPDATE SET value = '1'").run();
console.log('Feature toggled to 1');
