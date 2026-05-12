const fetch = require('node-fetch');

async function test() {
  try {
    const res = await fetch('http://localhost:3000/api/admin/settings/global_seo_keywords', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ...' // wait I need the token.
      },
      body: JSON.stringify({
        value: 'test,tags',
        translations: undefined
      })
    });
    console.log(res.status);
    console.log(await res.text());
  } catch (err) {
    console.error(err);
  }
}
test();
