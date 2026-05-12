const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.join(__dirname, '../data/skincare.db'));

const tables = [
  {
    name: 'dosage_forms',
    label: '产品剂型',
    seeds: [
      { name: '精华液', slug: 'serum' },
      { name: '面霜', slug: 'cream' },
      { name: '爽肤水', slug: 'toner' },
      { name: '洁面乳', slug: 'cleanser' },
      { name: '面膜', slug: 'mask' },
      { name: '眼霜', slug: 'eye-cream' },
      { name: '防晒霜', slug: 'sunscreen' },
      { name: '乳液', slug: 'lotion' },
    ]
  },
  {
    name: 'skin_concerns',
    label: '肌肤诉求',
    seeds: [
      { name: '抗衰老', slug: 'anti-aging' },
      { name: '美白提亮', slug: 'brightening' },
      { name: '保湿补水', slug: 'hydrating' },
      { name: '控油祛痘', slug: 'acne-control' },
      { name: '修护屏障', slug: 'barrier-repair' },
      { name: '紧致提拉', slug: 'firming' },
      { name: '淡斑祛印', slug: 'dark-spots' },
      { name: '舒缓退红', slug: 'soothing' },
    ]
  },
  {
    name: 'skin_types',
    label: '肤质分类',
    seeds: [
      { name: '干性肌肤', slug: 'dry' },
      { name: '油性肌肤', slug: 'oily' },
      { name: '混合性肌肤', slug: 'combination' },
      { name: '敏感肌肤', slug: 'sensitive' },
      { name: '中性肌肤', slug: 'normal' },
    ]
  }
];

for (const table of tables) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS ${table.name} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      translations TEXT
    )
  `);
  console.log(`✓ Table '${table.name}' created`);

  // Seed data
  const stmt = db.prepare(`INSERT OR IGNORE INTO ${table.name} (name, slug, sort_order) VALUES (?, ?, ?)`);
  table.seeds.forEach((s, i) => {
    stmt.run(s.name, s.slug, i);
  });
  console.log(`  → Seeded ${table.seeds.length} ${table.label}`);
}

db.close();
console.log('\nDone!');
