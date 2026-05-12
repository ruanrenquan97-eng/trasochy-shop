const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const { fetch } = require('undici');

async function testCurrentApi() {
  const dbPath = path.resolve(__dirname, 'data/skincare.db');
  const db = new Database(dbPath);

  const getSetting = (key) => {
    const row = db.prepare("SELECT value FROM site_settings WHERE key = ?").get(key);
    return row ? row.value : undefined;
  };

  const dynamicApiUrl = getSetting('megvii_pro_api_url');
  const dynamicApiKey = getSetting('megvii_pro_api_key');
  const dynamicApiSecret = getSetting('megvii_pro_api_secret');

  console.log("DB config:");
  console.log("URL:", dynamicApiUrl);
  console.log("Key:", dynamicApiKey ? "Set (length: " + dynamicApiKey.length + ")" : "Not set");
  console.log("Secret:", dynamicApiSecret ? "Set (length: " + dynamicApiSecret.length + ")" : "Not set");

  // Also print the latest record
  const latestRecord = db.prepare("SELECT * FROM skin_analysis_records ORDER BY id DESC LIMIT 1").get();
  if (latestRecord) {
     const data = JSON.parse(latestRecord.result_data);
     console.log("Latest DB Record has mapUrls:", !!data.mapUrls);
     console.log("Top level keys in latest DB result:", Object.keys(data));
     if(data.result) {
       console.log("data.result keys:", Object.keys(data.result));
     }
  }

}

testCurrentApi().catch(console.error);
