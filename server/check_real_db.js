const Database = require('better-sqlite3');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const envDbPath = process.env.DB_PATH;
const dbPath = envDbPath 
  ? (path.isAbsolute(envDbPath) ? envDbPath : path.resolve(__dirname, '..', envDbPath))
  : path.resolve(__dirname, '../data/skincare.db');

const db = new Database(dbPath);

console.log("Connected successfully to database at:", dbPath);
const records = db.prepare("SELECT * FROM skin_analysis_records ORDER BY id DESC LIMIT 1").all();
if (records.length > 0) {
  const latestRecord = records[0];
  const data = JSON.parse(latestRecord.result_data);
  console.log("Record ID:", latestRecord.id);
  console.log("Has mapUrls?", !!data.mapUrls);
  console.log("API result keys:", Object.keys(data.result || {}));
  
  if (data.result && data.result.error_message) {
    console.log("API Error message:", data.result.error_message);
  }
} else {
  console.log("No records found in skin_analysis_records table.");
}
