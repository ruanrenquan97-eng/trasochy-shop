const path = require('path');
const db = require('better-sqlite3')(path.resolve(__dirname, '../data/skincare.db'));
const row = db.prepare(`SELECT value FROM site_settings WHERE key='brand_team_members'`).get();
if (row) {
  const members = JSON.parse(row.value);
  const innovationMembers = members.filter(m => m.isInnovationCenter);
  const len = innovationMembers.length;
  if (len >= 2) {
    // Update the 3rd member
    innovationMembers[len - 2].name = 'Dr. Elena Rossi';
    innovationMembers[len - 2].role = 'Chief Dermatologist';
    innovationMembers[len - 2].tags = ['Dermatology', 'Anti-aging'];
    innovationMembers[len - 2].desc = 'Dr. Rossi leads the clinical research team in Switzerland, focusing on non-invasive anti-aging treatments.';
    innovationMembers[len - 2].en = {
      name: 'Dr. Elena Rossi',
      role: 'Chief Dermatologist',
      tags: ['Dermatology', 'Anti-aging'],
      desc: 'Dr. Rossi leads the clinical research team in Switzerland, focusing on non-invasive anti-aging treatments.'
    };
    
    // Update the 4th member
    innovationMembers[len - 1].name = 'Dr. Clara Müller';
    innovationMembers[len - 1].role = 'Lead Cosmetic Scientist';
    innovationMembers[len - 1].tags = ['Cosmetic Science', 'Formulation'];
    innovationMembers[len - 1].desc = 'With over 15 years in cosmetic science, Dr. Müller develops cutting-edge formulations for optimal skin penetration.';
    innovationMembers[len - 1].en = {
      name: 'Dr. Clara Müller',
      role: 'Lead Cosmetic Scientist',
      tags: ['Cosmetic Science', 'Formulation'],
      desc: 'With over 15 years in cosmetic science, Dr. Müller develops cutting-edge formulations for optimal skin penetration.'
    };
  }
  
  db.prepare(`UPDATE site_settings SET value = ? WHERE key='brand_team_members'`).run(JSON.stringify(members));
  console.log('Successfully updated names and descriptions');
}
