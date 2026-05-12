const db = require('better-sqlite3')('../data/skincare.db');

const initialMembers = [
  {
    id: "m1",
    name: "阮仁全 博士",
    role: "创始人 / 首席科学家",
    tags: ["中科大博士后", "苏黎世大学MBA", "皇家生物学会院士"],
    desc: "负责中瑞技术战略规划、核心透皮技术研发与产业化落地。",
    img: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?q=80&w=2070&auto=format&fit=crop"
  },
  {
    id: "m2",
    name: "温龙平 教授",
    role: "MSIC 外籍教授",
    tags: ["中科大教授", "斯坦福博士"],
    desc: "指导前沿生物医学工程与纳米材料在递送系统中的应用。",
    img: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?q=80&w=1964&auto=format&fit=crop"
  },
  {
    id: "m3",
    name: "Dr. Linda",
    role: "MSIC 研究员",
    tags: ["苏黎世大学", "生物医学博士"],
    desc: "主导欧洲创新原料开发、机理验证与人体功效数据规范设计。",
    img: "https://images.unsplash.com/photo-1594824436998-efa422cc47a5?q=80&w=2070&auto=format&fit=crop"
  },
  {
    id: "m4",
    name: "Yexinlei Yang",
    role: "MSIC 研究员",
    tags: ["法国工程师大学", "化学工程硕士"],
    desc: "负责配方优化与透皮递送方案的数据化证据评估体系建立。",
    img: "https://images.unsplash.com/photo-1581092795360-fd1ca04f0952?q=80&w=1974&auto=format&fit=crop"
  }
];

const insert = db.prepare(`
  INSERT INTO site_settings (key, value, description) 
  VALUES (?, ?, ?) 
  ON CONFLICT(key) DO UPDATE SET value = excluded.value
`);

insert.run('brand_hero_bg', '/images/tech/hero_bg.png', '品牌与技术页首屏背景图');
insert.run('brand_tech_bg', '/images/tech/ctdp_bg.png', '品牌与技术页核心技术背景图');
insert.run('brand_team_members', JSON.stringify(initialMembers), '品牌与技术页团队成员JSON');

console.log('Initial settings for brand story added.');
