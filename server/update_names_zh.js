const db = require('better-sqlite3')('e:/私有云/我的AI管理系统/TRASOCHY-shop/data/skincare.db');
const row = db.prepare(`SELECT value FROM site_settings WHERE key='brand_team_members'`).get();
if (row) {
  const members = JSON.parse(row.value);
  const innovationMembers = members.filter(m => m.isInnovationCenter);
  const len = innovationMembers.length;
  if (len >= 2) {
    // Update the 3rd member (Chinese)
    innovationMembers[len - 2].name = 'Dr. Elena Rossi';
    innovationMembers[len - 2].role = '首席皮肤科医生';
    innovationMembers[len - 2].tags = ['皮肤科', '抗衰老'];
    innovationMembers[len - 2].desc = 'Rossi 博士领导瑞士的临床研究团队，专注于非侵入性抗衰老治疗。';
    
    // Update the 4th member (Chinese)
    innovationMembers[len - 1].name = 'Dr. Clara Müller';
    innovationMembers[len - 1].role = '首席化妆品科学家';
    innovationMembers[len - 1].tags = ['化妆品科学', '配方研发'];
    innovationMembers[len - 1].desc = '凭借在化妆品科学领域超15年的经验，Müller 博士致力于研发能实现最佳皮肤渗透的前沿配方。';
  }
  
  db.prepare(`UPDATE site_settings SET value = ? WHERE key='brand_team_members'`).run(JSON.stringify(members));
  console.log('Successfully updated Chinese names and descriptions');
}
