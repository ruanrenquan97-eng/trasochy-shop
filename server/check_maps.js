const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve(__dirname, 'data/skincare.db');
const db = new Database(dbPath);

const records = db.prepare("SELECT * FROM skin_analysis_records ORDER BY id DESC LIMIT 5").all();
console.log("Found records:", records.length);
if (records.length > 0) {
  const latestRecord = records[0];
  const data = JSON.parse(latestRecord.result_data);
  console.log("Record ID:", latestRecord.id);
  console.log("Has mapUrls?", !!data.mapUrls);
  if (data.mapUrls) {
     console.log("mapUrls content:", data.mapUrls);
  }
  const resultObj = data.result && data.result.result ? data.result.result : data.result;
  if (resultObj) {
     console.log("Keys in API result:", Object.keys(resultObj));
     console.log("Has face_maps?", !!resultObj.face_maps);
     console.log("Has maps?", !!resultObj.maps);
     if (resultObj.face_maps) {
       console.log("face_maps keys:", Object.keys(resultObj.face_maps));
     }
  } else {
     console.log("No resultObj found in data");
  }
}
