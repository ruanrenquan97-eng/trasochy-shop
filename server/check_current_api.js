const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve(__dirname, 'data/skincare.db');
const db = new Database(dbPath);

console.log("Current URLs in DB:");
console.log(db.prepare("SELECT key, value FROM site_settings WHERE key LIKE '%url%'").all());
console.log(db.prepare("SELECT key, value FROM site_settings WHERE key LIKE '%megvii%'").all());

const latestRecord = db.prepare("SELECT * FROM skin_analysis_records ORDER BY id DESC LIMIT 1").get();
if (latestRecord) {
  console.log("Latest Record Type:", latestRecord.type);
  const data = JSON.parse(latestRecord.result_data);
  console.log("Has maps in DB record?", !!data.mapUrls, !!(data.result && data.result.face_maps));
  console.log("Maps keys in DB result:", data.result && data.result.face_maps ? Object.keys(data.result.face_maps) : 'none');
  console.log("mapUrls keys:", data.mapUrls ? Object.keys(data.mapUrls) : 'none');
}
