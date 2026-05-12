const db = require('better-sqlite3')('data/skincare.db');
const row = db.prepare("SELECT result_data FROM skin_analysis_records ORDER BY id ASC LIMIT 1").get();
console.log(JSON.stringify(JSON.parse(row.result_data), null, 2).substring(0, 1500));
