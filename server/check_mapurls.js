const Database = require('better-sqlite3');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const envDbPath = process.env.DB_PATH;
const dbPath = envDbPath 
  ? (path.isAbsolute(envDbPath) ? envDbPath : path.resolve(__dirname, '..', envDbPath))
  : path.resolve(__dirname, '../data/skincare.db');

const db = new Database(dbPath);

const records = db.prepare("SELECT * FROM skin_analysis_records ORDER BY id DESC LIMIT 1").all();
if (records.length > 0) {
  const latestRecord = records[0];
  const data = JSON.parse(latestRecord.result_data);
  console.log("mapUrls keys:", Object.keys(data.mapUrls || {}));
  console.log("mapUrls content preview:", JSON.stringify(data.mapUrls).substring(0, 200));
}
