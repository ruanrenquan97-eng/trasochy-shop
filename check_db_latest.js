const Database = require('better-sqlite3');
const db2 = new Database('data/skincare.db');

const row = db2.prepare('SELECT id, created_at, result_data FROM skin_analysis_records ORDER BY id DESC LIMIT 1').get();
if (row) {
  console.log('Latest Record ID:', row.id);
  const rd = JSON.parse(row.result_data);
  console.log('mapUrls keys:', Object.keys(rd.mapUrls || {}));
  if (rd.mapUrls) {
    console.log(rd.mapUrls);
  }
}

const fs = require('fs');
const path = require('path');
const mapsDir = path.join(process.cwd(), 'uploads/skin/maps');
if (fs.existsSync(mapsDir)) {
  const files = fs.readdirSync(mapsDir);
  console.log('Total files in maps directory:', files.length);
}
