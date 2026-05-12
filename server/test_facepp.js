const fs = require('fs');

async function test() {
  const API_KEY = "3m966egDOe6-zU7rvuXotThpJU0mXwY6";
  const API_SECRET = "sUePW3ShuvSRbgBBkCTf0Fyqi5E3o-FF";
  
  const form = new FormData();
  form.append('api_key', API_KEY);
  form.append('api_secret', API_SECRET);

  let base64Image = '';
  try {
    const files = fs.readdirSync('../uploads/skin');
    const imageFile = files.find(f => f.endsWith('.jpg') || f.endsWith('.png'));
    if (imageFile) {
       const imgBuf = fs.readFileSync('../uploads/skin/' + imageFile);
       base64Image = imgBuf.toString('base64');
    }
  } catch(e) {}
  
  if (!base64Image) {
     base64Image = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
  }
  form.append('image_base64', base64Image);
  
  form.append('return_maps', 'roi_outline_map');

  for (let attempt = 0; attempt < 5; attempt++) {
    console.log(`Attempt ${attempt + 1}...`);
    try {
      const res = await fetch('https://api-facestyle.megvii.com/facestyle/v1/skinanalyze_advanced', {
        method: 'POST',
        body: form
      });
      const data = await res.json();
      console.log("Response FaceStyle:", JSON.stringify(data, null, 2));
      if (data.error_message === 'CONCURRENCY_LIMIT_EXCEEDED') {
         await new Promise(r => setTimeout(r, 2000));
         continue;
      }
      break;
    } catch (e) { console.error(e); break; }
  }
}
test().catch(console.error);
