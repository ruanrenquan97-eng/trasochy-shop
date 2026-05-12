const fs = require('fs');

async function test() {
  const API_KEY = "3m966egDOe6-zU7rvuXotThpJU0mXwY6";
  const API_SECRET = "sUePW3ShuvSRbgBBkCTf0Fyqi5E3o-FF";
  
  const form = new FormData();
  form.append('api_key', API_KEY);
  form.append('api_secret', API_SECRET);
  form.append('image_base64', "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=");
  
  // Test 1: FaceStyle skinanalyze
  try {
    const res = await fetch('https://api-facestyle.megvii.com/facestyle/v1/skinanalyze', { method: 'POST', body: form });
    const data = await res.json();
    console.log("FaceStyle skinanalyze:", data.error_message || "Success");
  } catch(e) {}

  // Test 2: Face++ skinanalyze
  try {
    const res = await fetch('https://api-cn.faceplusplus.com/facepp/v1/skinanalyze', { method: 'POST', body: form });
    const data = await res.json();
    console.log("Face++ skinanalyze:", data.error_message || "Success");
  } catch(e) {}
}
test();
