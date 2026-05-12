const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const { v4: uuidv4 } = require('uuid');

const db = new Database('data/skincare.db');
const apiKeyRow = db.prepare("SELECT value FROM site_settings WHERE key = 'megvii_pro_api_key'").get();
const apiSecretRow = db.prepare("SELECT value FROM site_settings WHERE key = 'megvii_pro_api_secret'").get();

async function fixLatestRecord() {
  const row = db.prepare('SELECT id, image_url, result_data FROM skin_analysis_records ORDER BY id DESC LIMIT 1').get();
  if (!row) {
    console.log('No records found.');
    return;
  }
  
  console.log(`Fixing Record ID: ${row.id}`);
  let rd = JSON.parse(row.result_data);
  if (Object.keys(rd.mapUrls || {}).length > 0) {
    console.log('Record already has mapUrls, skipping.');
    return;
  }

  const imagePath = path.join(process.cwd(), row.image_url.replace(/^\//, ''));
  if (!fs.existsSync(imagePath)) {
    console.log(`Image not found: ${imagePath}`);
    return;
  }

  const imageBase64 = fs.readFileSync(imagePath).toString('base64');
  console.log('Calling Megvii API...');

  const formData = new FormData();
  formData.append('api_key', apiKeyRow.value);
  formData.append('api_secret', apiSecretRow.value);
  formData.append('image_base64', imageBase64);
  formData.append('return_maps', [
    'red_area', 'brown_area', 'texture_enhanced_pores', 'texture_enhanced_blackheads',
    'texture_enhanced_oily_area', 'texture_enhanced_lines', 'water_area', 'rough_area',
    'roi_outline_map', 'texture_enhanced_bw', 'right_roi_outline_map', 'left_roi_outline_map'
  ].join(','));
  
  formData.append('return_marks', [
    'wrinkle_mark', 'blackheads_mark', 'pores_mark', 'sensitivity_mark',
    'melanin_mark', 'dark_circle_outline', 'cheekbone_mark'
  ].join(','));

  const response = await fetch('https://api-cn.faceplusplus.com/facepp/v1/skinanalyze_pro', {
    method: 'POST',
    body: formData
  });

  const aiResult = await response.json();
  if (aiResult.error_message) {
    console.error('API Error:', aiResult.error_message);
    return;
  }

  const mapsDir = path.join(process.cwd(), 'uploads/skin/maps');
  if (!fs.existsSync(mapsDir)) fs.mkdirSync(mapsDir, { recursive: true });

  const MAP_KEY_MAP = {
    red_area: 'red',
    brown_area: 'melanin',
    texture_enhanced_pores: 'pores',
    texture_enhanced_blackheads: 'blackhead',
    texture_enhanced_oily_area: 'oily',
    texture_enhanced_lines: 'wrinkle',
    water_area: 'water',
    rough_area: 'rough',
    roi_outline_map: 'acne',
  };

  const mapUrls = {};
  const maps = aiResult.result?.face_maps || {};
  let savedCount = 0;

  for (const [apiKey, shortKey] of Object.entries(MAP_KEY_MAP)) {
    const mapData = maps[apiKey];
    if (!mapData) continue;
    try {
      const raw = String(mapData).replace(/^data:image\/\w+;base64,/, '');
      const ext = ['texture_enhanced_pores','texture_enhanced_blackheads','texture_enhanced_oily_area','rough_area','roi_outline_map'].includes(apiKey) ? 'png' : 'jpg';
      const fileName = `${uuidv4()}_${shortKey}.${ext}`;
      fs.writeFileSync(path.join(mapsDir, fileName), Buffer.from(raw, 'base64'));
      mapUrls[shortKey] = `/uploads/skin/maps/${fileName}`;
      savedCount++;
    } catch (e) {
      console.warn(`Failed to save map ${apiKey}:`, e);
    }
  }

  console.log(`Saved ${savedCount} map images.`);

  rd = { ...rd, mapUrls, result: { ...rd.result, face_maps: undefined } }; // avoid saving giant base64s to db
  
  db.prepare('UPDATE skin_analysis_records SET result_data = ? WHERE id = ?').run(JSON.stringify(rd), row.id);
  console.log('Database record updated! Frontend can now be refreshed.');
}

fixLatestRecord().catch(console.error);
