const fs = require('fs');
const db = require('better-sqlite3')('e:/私有云/我的AI管理系统/TRASOCHY-shop/data/skincare.db');

try {
  const row = db.prepare(`SELECT value FROM site_settings WHERE key='brand_team_members'`).get();
  if (row) {
    const members = JSON.parse(row.value);
    // Find the last two innovation center members and update their images
    const innovationMembers = members.filter(m => m.isInnovationCenter);
    const len = innovationMembers.length;
    if (len >= 2) {
      innovationMembers[len - 2].img = '/images/european_female_researcher_1.png';
      innovationMembers[len - 1].img = '/images/european_female_researcher_2.png';
    }
    
    // Write back to DB
    db.prepare(`UPDATE site_settings SET value = ? WHERE key='brand_team_members'`).run(JSON.stringify(members));
    console.log('Successfully updated brand_team_members');
  } else {
    console.log('Not found');
  }
} catch (e) {
  console.log('Error:', e.message);
}
