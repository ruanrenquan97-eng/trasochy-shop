const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const db = new Database('data/skincare.db');
const apiKeyRow = db.prepare("SELECT value FROM site_settings WHERE key = 'megvii_pro_api_key'").get();
const apiSecretRow = db.prepare("SELECT value FROM site_settings WHERE key = 'megvii_pro_api_secret'").get();

const uploadsDir = path.join(process.cwd(), 'uploads/skin');
const testImagePath = path.join(uploadsDir, 'b2379df5-af53-4dee-b284-f0a50976b39e.jpg');
const imageBase64 = fs.readFileSync(testImagePath).toString('base64');

async function testAPI() {
  const formData = new FormData();
  formData.append('api_key', apiKeyRow.value);
  formData.append('api_secret', apiSecretRow.value);
  formData.append('image_base64', imageBase64);
  formData.append('return_maps', 'red_area,brown_area,texture_enhanced_pores,texture_enhanced_blackheads,texture_enhanced_oily_area,texture_enhanced_lines,water_area,rough_area,roi_outline_map,texture_enhanced_bw,right_roi_outline_map,left_roi_outline_map');
  
  const response = await fetch('https://api-cn.faceplusplus.com/facepp/v1/skinanalyze_pro', {
    method: 'POST',
    body: formData
  });

  const data = await response.json();
  if (data.result && data.result.face_maps) {
    console.log('SUCCESS! face_maps keys:', Object.keys(data.result.face_maps));
  } else {
    console.log('FAILED to find face_maps', Object.keys(data));
  }
}

testAPI().catch(console.error);
