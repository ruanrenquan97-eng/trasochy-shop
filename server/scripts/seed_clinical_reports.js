const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../data/skincare.db');
const db = new Database(dbPath);

const reports = [
  {
    title: '烟酰胺与透明质酸联合抗老紧致临床观察',
    slug: 'clinical-niacinamide-ha',
    summary: '本临床观察旨在评估含有5%烟酰胺与多重分子量透明质酸的精华组合在改善面部细纹、提升肌肤紧致度方面的功效。通过对60名年龄在30-50岁的亚洲女性受试者进行为期8周的测试，结果显示该组合能显著提升角质层含水量，使肌肤弹性和紧致度分别提升了24%和18%，且对大部分受试者无明显刺激性。',
    coverImage: 'https://images.unsplash.com/photo-1629198688000-71f23e745b6e?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    pdfUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    translations: {
      en: {
        title: 'Clinical Observation of Niacinamide and HA in Anti-aging',
        summary: 'This clinical study evaluates the efficacy of a serum combination containing 5% niacinamide and multi-molecular weight hyaluronic acid in improving facial fine lines and skin firmness. After an 8-week test on 60 Asian female subjects, results showed a 24% increase in skin elasticity and an 18% improvement in firmness.'
      },
      de: {
        title: 'Klinische Beobachtung von Niacinamid und HA bei Anti-Aging',
        summary: 'Diese klinische Studie bewertet die Wirksamkeit einer Serumkombination, die 5 % Niacinamid und Hyaluronsäure enthält, bei der Verbesserung feiner Gesichtslinien und der Hautfestigkeit. Ergebnisse zeigten eine Erhöhung der Hautelastizität um 24 % und eine Verbesserung der Festigkeit um 18 %.'
      }
    }
  },
  {
    title: '多重胜肽精华对敏感肌屏障修复的临床测试',
    slug: 'clinical-multi-peptide-repair',
    summary: '该临床测试招募了45位经皮肤科医生评估为敏感肌（伴随泛红、刺痛等症状）的志愿者。连续使用多重胜肽修复精华4周后，通过经皮水分流失(TEWL)和皮肤红斑指数(Erythema Index)测试发现，受试者的TEWL平均下降了31%，红斑指数显著降低，证实了该产品在修护受损屏障、舒缓肌肤不适方面的卓越表现。',
    coverImage: 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    pdfUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    translations: {
      en: {
        title: 'Clinical Trial of Multi-Peptide Serum on Barrier Repair',
        summary: 'This trial recruited 45 volunteers with sensitive skin. After using the multi-peptide repair serum for 4 weeks, subjects showed a 31% average decrease in TEWL and a significant reduction in the Erythema Index, confirming its excellent performance in repairing damaged barriers.'
      },
      de: {
        title: 'Klinische Studie von Multi-Peptid-Serum zur Barriere-Reparatur',
        summary: 'Für diese Studie wurden 45 Freiwillige mit empfindlicher Haut rekrutiert. Nach 4-wöchiger Anwendung zeigte sich ein durchschnittlicher Rückgang des TEWL um 31 % und eine signifikante Verringerung des Erythem-Index, was die hervorragende Leistung bei der Reparatur bestätigte.'
      }
    }
  },
  {
    title: '积雪草提取物褪红修护功效性评估报告',
    slug: 'clinical-centella-asiatica',
    summary: '本报告对含有高浓度高纯度积雪草提取物（Centella Asiatica Extract）的面霜进行了体外与人体双重评估。人体功效评估阶段表明，在激光类医美项目后使用该面霜，能够有效缩短肌肤恢复周期，泛红消退时间比对照组缩短了近40%，体现了其优异的抗炎舒缓及屏障重塑潜力。',
    coverImage: 'https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    pdfUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    translations: {
      en: {
        title: 'Efficacy Evaluation of Centella Asiatica in Redness Reduction',
        summary: 'This report conducted both in vitro and in vivo evaluations of a cream containing high-purity Centella Asiatica extract. The results indicated that using the cream after laser cosmetic procedures effectively shortened the skin recovery period, with redness fading time reduced by nearly 40% compared to the control group.'
      },
      de: {
        title: 'Wirksamkeitsbewertung von Centella Asiatica zur Rötungsreduzierung',
        summary: 'Dieser Bericht führte Bewertungen einer Creme mit hochreinem Centella Asiatica-Extrakt durch. Die Ergebnisse zeigten, dass die Verwendung der Creme nach Laser-Kosmetikeingriffen die Hauterholungszeit effektiv verkürzte, wobei die Zeit zum Abklingen der Rötung im Vergleich zur Kontrollgruppe um fast 40 % reduziert wurde.'
      }
    }
  }
];

const insertStmt = db.prepare(`
  INSERT INTO clinical_reports (title, slug, summary, cover_image, pdf_url, status, translations, published_at, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, 'published', ?, ?, ?, ?)
`);

try {
  let count = 0;
  for (const r of reports) {
    const existing = db.prepare('SELECT id FROM clinical_reports WHERE slug = ?').get(r.slug);
    if (!existing) {
      const now = Date.now();
      insertStmt.run(
        r.title, 
        r.slug, 
        r.summary, 
        r.coverImage, 
        r.pdfUrl, 
        JSON.stringify(r.translations), 
        now, 
        now, 
        now
      );
      count++;
    }
  }
  console.log(`Successfully generated ${count} clinical reports.`);
} catch (error) {
  console.error("Error inserting reports:", error);
}

db.close();
