const path = require('path');
const db = require('better-sqlite3')(path.resolve(__dirname, '../data/skincare.db'));
const row = db.prepare(`SELECT value FROM site_settings WHERE key='brand_team_members'`).get();
if (row) {
  const members = JSON.parse(row.value);
  const innovationMembers = members.filter(m => m.isInnovationCenter);
  const len = innovationMembers.length;
  if (len >= 2) {
    innovationMembers[len - 1].img = '/images/european_female_researcher_3.png';
  }
  db.prepare(`UPDATE site_settings SET value = ? WHERE key='brand_team_members'`).run(JSON.stringify(members));
  console.log('Successfully updated image for Dr. Clara Müller');
}
