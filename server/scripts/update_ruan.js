const db = require('better-sqlite3')('../data/skincare.db');

const row = db.prepare("SELECT value FROM site_settings WHERE key = 'brand_team_members'").get();
if (row) {
  const members = JSON.parse(row.value);
  const ruan = members.find(m => m.name === '阮仁全 博士');
  if (ruan) {
    ruan.fullDesc = `
**Trasochy 传诗奇品牌 创始人**  
**美尔健（深圳）生物科技有限公司 创始人**  
**MELLPRO Swiss Innovation Center 首席科学家**  
**乾妍国际（香港）科技集团 董事长**  

*全球生物透皮递送技术领导者*

---

### 01 职称
- 生物技术类 注册高级工程师
- 英国皇家学会 注册科学家 (CSci) 注册生物学家 (CBio)
- 哈佛大学医学院 认证皮肤学专家

### 02 教育与科研背景
- 瑞士苏黎世大学 工商管理学 硕士
- 中国科学技术大学 博士后研究员
- 中国科学技术大学生物医学工程 博士
- 中国科学技术大学细胞生物学 硕士

### 03 科研协同
- 中国农科院深圳基因研究生校外研究生导师
- 华南理工大学 校外研究生导师
- 合肥大学校外研究生导师

### 04 科技成果
- 发表国际高水平学术期刊 10篇
- 获得科研专项基金 6项
- 获得发明专利授权 50项
- 广东省化妆品学会科技进步一等奖

### 05 科技荣誉
- 英国皇家生物学会 院士
- 英国皇家工艺院 终身院士
- 深圳市高层次领军人才

### 06 行业荣誉
- 中国美都化妆品产业创新研究院科学家
- 世界中联 中药养颜产业分会理事
- 中国抗衰老促进会化妆品分会专家委员
- 第四届3.9工程师节·海豚奖 杰出工程师奖
- 深圳国际生物谷·生命科学产业园和海洋生物产业园专家顾问

---
*中国好成分·透皮好吸收*
`;
    // Update translations with English equivalent if possible (optional but good)
    ruan.en = ruan.en || {};
    ruan.en.fullDesc = `
**Founder of TRASOCHY Brand**  
**Founder of Mellgen (Shenzhen) Biotechnology Co., Ltd.**  
**Chief Scientist of MELLPRO Swiss Innovation Center**  
**Chairman of Qianyan International (Hong Kong) Technology Group**  

*Global Leader in Bio-Transdermal Delivery Technology*

---

### 01 Professional Titles
- Registered Senior Engineer in Biotechnology
- Chartered Scientist (CSci) & Chartered Biologist (CBio), Royal Society of Biology
- Certified Dermatological Expert, Harvard Medical School

### 02 Education & Academic Background
- Master of Business Administration, University of Zurich, Switzerland
- Postdoctoral Fellow, University of Science and Technology of China (USTC)
- Ph.D. in Biomedical Engineering, USTC
- Master's in Cell Biology, USTC

### 03 Research Collaboration
- Off-campus Graduate Supervisor, Shenzhen Agricultural Genomics Institute, Chinese Academy of Agricultural Sciences
- Off-campus Graduate Supervisor, South China University of Technology
- Off-campus Graduate Supervisor, Hefei University

### 04 Scientific Achievements
- Published 10 high-impact international academic papers
- Secured 6 specialized scientific research funds
- Granted 50 invention patents
- First Prize for Scientific and Technological Progress, Guangdong Cosmetics Association

### 05 Scientific Honors
- Fellow of the Royal Society of Biology (FRSB)
- Fellow of the Royal Society of Arts (FRSA)
- High-level Leading Talent of Shenzhen

### 06 Industry Honors
- Scientist, China Meidu Cosmetics Industry Innovation Research Institute
- Director, Chinese Medicine Beauty Industry Branch, WFCMS
- Expert Committee Member, Cosmetics Branch, China Anti-Aging Promoting Association
- Outstanding Engineer Award, 4th "3.9 Engineer's Day" Dolphin Awards
- Expert Consultant, Shenzhen International Bio-Valley Life Science Industrial Park & Marine Biological Industrial Park

---
*Premium Ingredients for China · Deep Transdermal Absorption*
`;
    
    ruan.de = ruan.de || {};
    ruan.de.fullDesc = `
**Gründer der Marke TRASOCHY**  
**Gründer der Mellgen (Shenzhen) Biotechnology Co., Ltd.**  
**Leitender Wissenschaftler des MELLPRO Swiss Innovation Center**  
**Vorsitzender der Qianyan International (Hong Kong) Technology Group**  

*Weltweiter Marktführer in der biologischen transdermalen Abgabetechnologie*

---

### 01 Berufliche Titel
- Registrierter leitender Ingenieur für Biotechnologie
- Chartered Scientist (CSci) & Chartered Biologist (CBio), Royal Society of Biology
- Zertifizierter Experte für Dermatologie, Harvard Medical School

### 02 Bildung & Wissenschaftlicher Hintergrund
- Master of Business Administration, Universität Zürich, Schweiz
- Postdoktorand, University of Science and Technology of China (USTC)
- Ph.D. in Biomedizinischer Technik, USTC
- Master in Zellbiologie, USTC

### 03 Forschungskooperationen
- Externer Betreuer für Postgraduierte, Shenzhen Agricultural Genomics Institute
- Externer Betreuer für Postgraduierte, South China University of Technology
- Externer Betreuer für Postgraduierte, Universität Hefei

### 04 Wissenschaftliche Errungenschaften
- Veröffentlichung von 10 Artikeln in internationalen wissenschaftlichen Fachzeitschriften
- Erhalt von 6 speziellen Forschungsfonds
- Erteilung von 50 Erfindungspatenten
- Erster Preis für wissenschaftlichen und technologischen Fortschritt, Guangdong Cosmetics Association

### 05 Wissenschaftliche Auszeichnungen
- Fellow of the Royal Society of Biology (FRSB)
- Fellow of the Royal Society of Arts (FRSA)
- High-Level Leading Talent von Shenzhen

### 06 Branchenauszeichnungen
- Wissenschaftler, China Meidu Cosmetics Industry Innovation Research Institute
- Direktor, Fachbereich für Kosmetik aus der Traditionellen Chinesischen Medizin (WFCMS)
- Mitglied im Expertenausschuss, Fachbereich Kosmetik, China Anti-Aging Promoting Association
- Auszeichnung für herausragende Ingenieure, 4. "3.9 Engineer's Day" Dolphin Awards
- Expertenberater, Shenzhen International Bio-Valley Life Science Industrial Park

---
*Premium-Inhaltsstoffe für China · Tiefe transdermale Absorption*
`;

    db.prepare("UPDATE site_settings SET value = ? WHERE key = 'brand_team_members'").run(JSON.stringify(members));
    console.log("Updated team members with Ruan's full desc.");
  } else {
    console.log("Could not find Ruan.");
  }
}
