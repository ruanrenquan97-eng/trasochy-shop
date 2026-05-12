// Test the server endpoint directly - simulate what the route does after getting aiResult
const Database = require('better-sqlite3');
const db2 = new Database('data/skincare.db');

// Simulate checking if db.insert().returning() works by doing a raw test
console.log('=== Testing db insert + returning simulation ===');

// Check what record 9 looks like
const row = db2.prepare('SELECT id, result_data FROM skin_analysis_records WHERE id = 9').get();
if (row) {
  const rd = JSON.parse(row.result_data);
  console.log('Record 9 exists. mapUrls:', JSON.stringify(rd.mapUrls));
  console.log('Top-level keys:', Object.keys(rd));
  
  // Check the result structure for maps
  const result = rd.result;
  if (result) {
    console.log('\nResult keys:', Object.keys(result).slice(0, 10), '...');
    console.log('Has result.maps:', !!result.maps);
    if (result.maps) {
      console.log('Maps keys:', Object.keys(result.maps));
    }
  }
} else {
  console.log('No record 9 found');
}

// Check if maps dir exists with any files
const fs = require('fs');
const path = require('path');
const mapsDir = path.join(process.cwd(), 'uploads/skin/maps');
if (fs.existsSync(mapsDir)) {
  const files = fs.readdirSync(mapsDir);
  console.log('\nMaps directory files count:', files.length);
  console.log('Files:', files.slice(0, 5));
} else {
  console.log('\nMaps directory does NOT exist');
}
