const { fetch } = require('undici');

async function test() {
  const API_KEY = "3m966egDOe6-zU7rvuXotThpJU0mXwY6";
  const API_SECRET = "sUePW3ShuvSRbgBBkCTf0Fyqi5E3o-FF";
  
  const form = new FormData();
  form.append('api_key', API_KEY);
  form.append('api_secret', API_SECRET);
  form.append('image_base64', "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=");
  form.append('return_maps', '1');

  try {
    const res = await fetch('https://api-cn.faceplusplus.com/facepp/v1/skinanalyze_pro', { method: 'POST', body: form });
    const data = await res.json();
    console.log("Face++ skinanalyze_pro:", data.error_message || "Success! Keys: " + Object.keys(data));
  } catch(e) {
    console.error("Face++ skinanalyze_pro:", e.message);
  }
}
test();
