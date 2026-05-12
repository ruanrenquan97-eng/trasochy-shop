const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbs = [
  path.resolve(__dirname, 'data/skincare.db'),
  path.resolve(__dirname, 'skincare.db'),
  path.resolve(__dirname, '../skincare.db')
];

for (const dbPath of dbs) {
  if (fs.existsSync(dbPath)) {
    console.log("Checking DB:", dbPath);
    try {
      const db = new Database(dbPath);
      const records = db.prepare("SELECT * FROM skin_analysis_records ORDER BY id DESC LIMIT 2").all();
      console.log("  Records found:", records.length);
      if (records.length > 0) {
        console.log("  Latest Record Type:", records[0].type);
        console.log("  Has mapUrls?", !!JSON.parse(records[0].result_data).mapUrls);
      }
    } catch(e) {
      console.error(e.message);
    }
  }
}
