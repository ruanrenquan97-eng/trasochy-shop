const db = require('better-sqlite3')('e:/私有云/我的AI管理系统/TRASOCHY-shop/data/skincare.db');
const row = db.prepare(`SELECT value FROM site_settings WHERE key='brand_team_members'`).get();
if (row) {
  const members = JSON.parse(row.value);
  console.log(members.filter(m => m.isInnovationCenter).map(m => ({ id: m.id, name: m.name, img: m.img })));
}
