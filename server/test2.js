const Database = require('better-sqlite3');
const path = require('path');
const sqlite = new Database(path.join(process.cwd(), 'data', 'skincare.db'));
try {
  const row = sqlite.prepare("SELECT value FROM site_settings WHERE key = 'ai_api_key'").get();
  console.log('API Key:', row ? row.value : 'Not set');
} catch (e) {
  console.error(e);
}
