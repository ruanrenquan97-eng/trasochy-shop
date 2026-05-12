const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.join(__dirname, '../data/skincare.db'));

const tables = [
  {
    name: 'dosage_forms',
    label: '产品剂型',
    seeds: [
      { name: '肌底液', slug: 'essence' },
      { name: '卸妆水/油', slug: 'makeup-remover' },
      { name: '原液', slug: 'ampoule' },
      { name: '凝胶/啫喱', slug: 'gel' },
      { name: '精油', slug: 'facial-oil' },
      { name: '去角质', slug: 'exfoliator' },
      { name: '唇膜', slug: 'lip-mask' },
    ]
  },
  {
    name: 'skin_concerns',
    label: '肌肤诉求',
    seeds: [
      { name: '淡化细纹', slug: 'fine-lines' },
      { name: '收缩毛孔', slug: 'pore-minimizing' },
      { name: '深层清洁', slug: 'deep-cleansing' },
      { name: '平衡水油', slug: 'oil-balancing' },
      { name: '改善暗沉', slug: 'dullness' },
      { name: '抗氧化', slug: 'antioxidant' },
      { name: '晒后修护', slug: 'after-sun-care' },
      { name: '去黑头/闭口', slug: 'blackhead-removal' },
    ]
  },
  {
    name: 'skin_types',
    label: '肤质分类',
    seeds: [
      { name: '痘痘肌肤', slug: 'acne-prone' },
      { name: '熟龄肌肤', slug: 'mature' },
      { name: '极干性肌肤', slug: 'very-dry' },
      { name: '外油内干肌肤', slug: 'dehydrated-oily' },
    ]
  }
];

let addedCount = 0;

for (const table of tables) {
  // Get current max sort_order
  const maxSortOrderRow = db.prepare(`SELECT MAX(sort_order) as max_sort FROM ${table.name}`).get();
  let startSortOrder = (maxSortOrderRow && maxSortOrderRow.max_sort !== null) ? maxSortOrderRow.max_sort + 1 : 0;

  const stmt = db.prepare(`INSERT OR IGNORE INTO ${table.name} (name, slug, sort_order) VALUES (?, ?, ?)`);
  
  let currentAdded = 0;
  for (const s of table.seeds) {
    const info = stmt.run(s.name, s.slug, startSortOrder++);
    if (info.changes > 0) {
      currentAdded++;
      addedCount++;
    }
  }
  console.log(`  → Added ${currentAdded} new items to ${table.label}`);
}

db.close();
console.log(`\nSuccessfully added ${addedCount} total new items!`);
