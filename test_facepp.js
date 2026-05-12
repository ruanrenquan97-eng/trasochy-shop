const fs = require('fs');
require('dotenv').config({ path: 'server/.env' });

async function test() {
  const API_KEY = process.env.MEGVII_API_KEY;
  const API_SECRET = process.env.MEGVII_API_SECRET;
  
  const FormData = require('form-data');
  const form = new FormData();
  form.append('api_key', API_KEY);
  form.append('api_secret', API_SECRET);
  const base64Image = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
  form.append('image_base64', base64Image);
  form.append('return_maps', 'roi_outline_map');

  const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
  const res = await fetch('https://api-cn.faceplusplus.com/facepp/v1/skinanalyze_advanced', {
    method: 'POST',
    body: form
  });
  const data = await res.json();
  console.log("Response:", JSON.stringify(data, null, 2));
}
test().catch(console.error);
