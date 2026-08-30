import { Link, useNavigate } from 'react-router-dom';
import { Camera, ChevronLeft } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';

type IntroCopy = {
  title: string;
  equipmentTitle: string;
  equipmentIntro: string;
  heroTitle: string;
  heroBody: string;
  cta: string;
  equipment: Array<{ title: string; alt: string; src: string }>;
  sections: Array<{
    title: string;
    rows: Array<{ label: string; value: string; indent?: boolean; note?: boolean }>;
  }>;
};

const INTRO_COPY: Record<'zh' | 'en' | 'de', IntroCopy> = {
  zh: {
    title: '瑞士皮肤衰老检测中心',
    equipmentTitle: '尖端临床检测设备支持',
    equipmentIntro: '系统背后的皮肤大模型，依托专业级检测设备与临床图像库联合训练而成。',
    heroTitle: '全面了解您的肌肤维度',
    heroBody: '深度解析多达50余项精确维度的皮肤检测分析。上传照片即可获取您的专属报告。',
    cta: '现在开始AI深度测试',
    equipment: [
      { title: 'DermiVue 面部皮肤分析仪', alt: 'DermiVue 皮肤分析仪', src: '/images/visia_machine.png' },
      { title: '高精度 3D 轮廓扫描仪', alt: '3D 面部扫描仪', src: '/images/skin_scanner.png' },
      { title: '多维探头式皮肤分析仪', alt: '接触式探头皮肤检测仪', src: '/images/probe_analyzer.png' },
      { title: '科研级高倍光学显微成像', alt: '高倍率显微镜', src: '/images/lab_microscope.png' },
    ],
    sections: [
      { title: '基础指标', rows: [
        { label: '肌龄', value: '25岁' },
        { label: '总体分数', value: '71' },
      ] },
      { title: '肤质分析', rows: [
        { label: '肤质分类', value: '混合型' },
        { label: '油光分数', value: '39' },
        { label: '全脸', value: '', note: true },
        { label: '出油严重程度', value: '严重', indent: true },
        { label: '面积占比', value: '37.00%', indent: true },
        { label: '水分分数', value: '62' },
        { label: '缺水严重程度', value: '中度' },
        { label: '全脸缺水面积占比', value: '33.30%', indent: true },
      ] },
      { title: '肤色分析', rows: [
        { label: '东亚肤色分类', value: '白皙' },
        { label: 'ITA肤色分型', value: '0 - very light' },
      ] },
      { title: '粗糙度分析', rows: [
        { label: '黑头分数', value: '81' },
        { label: '黑头个数', value: '64个' },
        { label: '毛孔分数', value: '70' },
        { label: '额头', value: '', note: true },
        { label: '毛孔分数', value: '54', indent: true },
        { label: '粗大毛孔数', value: '460', indent: true },
        { label: '整体面部粗糙面积占比', value: '25.30%' },
      ] },
      { title: '色素沉着', rows: [
        { label: '棕区分数', value: '83' },
        { label: '严重程度', value: '轻度' },
        { label: '色素沉着区域全脸占比', value: '10.10%' },
        { label: '黄褐斑 / 雀斑', value: '无' },
      ] },
      { title: '敏感性与衰老', rows: [
        { label: '敏感性分数', value: '93' },
        { label: '敏感皮肤面积占比', value: '0.20%' },
        { label: '总体皱纹分数', value: '75' },
        { label: '左眼鱼尾纹', value: '', note: true },
        { label: '分数', value: '32', indent: true },
        { label: '严重程度', value: '中度', indent: true },
        { label: '右眼鱼尾纹', value: '', note: true },
        { label: '分数', value: '8', indent: true },
        { label: '严重程度', value: '轻度', indent: true },
        { label: '法令纹', value: '轻度' },
      ] },
      { title: '眼部分析', rows: [
        { label: '眼袋检测', value: '无' },
        { label: '黑眼圈分数', value: '100' },
        { label: '黑眼圈类型检测', value: '无黑眼圈' },
        { label: '血管型黑眼圈严重程度', value: '无' },
        { label: '色素型黑眼圈严重程度', value: '无' },
        { label: '结构型黑眼圈严重程度', value: '无' },
      ] },
    ],
  },
  en: {
    title: 'Swiss Skin Aging Analysis Center',
    equipmentTitle: 'Supported by advanced clinical imaging',
    equipmentIntro: 'The skin intelligence model is trained from medical-grade imaging workflows and large clinical image datasets.',
    heroTitle: 'Understand your skin across every dimension',
    heroBody: 'Analyze more than 50 precise skin indicators. Upload a photo to receive your personalized deep-skin report.',
    cta: 'Start AI deep skin analysis',
    equipment: [
      { title: 'DermiVue facial skin analyzer', alt: 'DermiVue skin analyzer', src: '/images/visia_machine.png' },
      { title: 'High-precision 3D contour scanner', alt: '3D facial scanner', src: '/images/skin_scanner.png' },
      { title: 'Multi-dimensional probe analyzer', alt: 'Contact probe skin analyzer', src: '/images/probe_analyzer.png' },
      { title: 'Clinical-grade medical microscope', alt: 'High-magnification microscope', src: '/images/lab_microscope.png' },
    ],
    sections: [
      { title: 'Core indicators', rows: [
        { label: 'Skin age', value: '25 years' },
        { label: 'Overall score', value: '71' },
      ] },
      { title: 'Skin type analysis', rows: [
        { label: 'Skin type', value: 'Combination' },
        { label: 'Oiliness score', value: '39' },
        { label: 'Full face', value: '', note: true },
        { label: 'Oiliness severity', value: 'Severe', indent: true },
        { label: 'Area ratio', value: '37.00%', indent: true },
        { label: 'Hydration score', value: '62' },
        { label: 'Dehydration severity', value: 'Moderate' },
        { label: 'Full-face dehydration area', value: '33.30%', indent: true },
      ] },
      { title: 'Skin tone analysis', rows: [
        { label: 'East Asian skin tone class', value: 'Fair' },
        { label: 'ITA skin tone type', value: '0 - very light' },
      ] },
      { title: 'Texture analysis', rows: [
        { label: 'Blackhead score', value: '81' },
        { label: 'Blackhead count', value: '64' },
        { label: 'Pore score', value: '70' },
        { label: 'Forehead', value: '', note: true },
        { label: 'Pore score', value: '54', indent: true },
        { label: 'Enlarged pore count', value: '460', indent: true },
        { label: 'Overall roughness area ratio', value: '25.30%' },
      ] },
      { title: 'Pigmentation', rows: [
        { label: 'Brown spot score', value: '83' },
        { label: 'Severity', value: 'Mild' },
        { label: 'Pigmentation area ratio', value: '10.10%' },
        { label: 'Melasma / freckles', value: 'None' },
      ] },
      { title: 'Sensitivity and aging', rows: [
        { label: 'Sensitivity score', value: '93' },
        { label: 'Sensitive skin area ratio', value: '0.20%' },
        { label: 'Overall wrinkle score', value: '75' },
        { label: 'Left crow\'s feet', value: '', note: true },
        { label: 'Score', value: '32', indent: true },
        { label: 'Severity', value: 'Moderate', indent: true },
        { label: 'Right crow\'s feet', value: '', note: true },
        { label: 'Score', value: '8', indent: true },
        { label: 'Severity', value: 'Mild', indent: true },
        { label: 'Nasolabial folds', value: 'Mild' },
      ] },
      { title: 'Eye-area analysis', rows: [
        { label: 'Eye bag detection', value: 'None' },
        { label: 'Dark-circle score', value: '100' },
        { label: 'Dark-circle type', value: 'No dark circles' },
        { label: 'Vascular dark-circle severity', value: 'None' },
        { label: 'Pigmented dark-circle severity', value: 'None' },
        { label: 'Structural dark-circle severity', value: 'None' },
      ] },
    ],
  },
  de: {
    title: 'Schweizer Zentrum fur Hautalterungsanalyse',
    equipmentTitle: 'Unterstutzt durch klinische Spitzentechnologie',
    equipmentIntro: 'Das Hautmodell wurde mit medizinischen Bildgebungsprozessen und umfangreichen klinischen Bilddaten trainiert.',
    heroTitle: 'Verstehen Sie Ihre Haut in allen Dimensionen',
    heroBody: 'Analysieren Sie mehr als 50 prazise Hautindikatoren. Laden Sie ein Foto hoch und erhalten Sie Ihren personlichen Tiefenhautbericht.',
    cta: 'AI-Tiefenhautanalyse starten',
    equipment: [
      { title: 'DermiVue Gesichtshaut-Analysator', alt: 'DermiVue Hautanalysator', src: '/images/visia_machine.png' },
      { title: 'Hochpraziser 3D-Konturscanner', alt: '3D-Gesichtsscanner', src: '/images/skin_scanner.png' },
      { title: 'Mehrdimensionaler Sondenanalysator', alt: 'Kontaktsonde fur Hautanalyse', src: '/images/probe_analyzer.png' },
      { title: 'Klinisches medizinisches Mikroskop', alt: 'Hochvergroserndes Mikroskop', src: '/images/lab_microscope.png' },
    ],
    sections: [
      { title: 'Kernindikatoren', rows: [
        { label: 'Hautalter', value: '25 Jahre' },
        { label: 'Gesamtwert', value: '71' },
      ] },
      { title: 'Hauttypanalyse', rows: [
        { label: 'Hauttyp', value: 'Mischhaut' },
        { label: 'Oligkeitswert', value: '39' },
        { label: 'Ganzes Gesicht', value: '', note: true },
        { label: 'Starke der Oligkeit', value: 'Stark', indent: true },
        { label: 'Flachenanteil', value: '37.00%', indent: true },
        { label: 'Feuchtigkeitswert', value: '62' },
        { label: 'Dehydrationsgrad', value: 'Mittel' },
        { label: 'Dehydrierte Gesichtsflache', value: '33.30%', indent: true },
      ] },
      { title: 'Hauttonanalyse', rows: [
        { label: 'Ostasiatische Hauttonklasse', value: 'Hell' },
        { label: 'ITA-Hautton-Typ', value: '0 - very light' },
      ] },
      { title: 'Texturanalyse', rows: [
        { label: 'Mitesser-Wert', value: '81' },
        { label: 'Mitesser-Anzahl', value: '64' },
        { label: 'Porenwert', value: '70' },
        { label: 'Stirn', value: '', note: true },
        { label: 'Porenwert', value: '54', indent: true },
        { label: 'Anzahl vergrosserter Poren', value: '460', indent: true },
        { label: 'Gesamter Rauheitsanteil', value: '25.30%' },
      ] },
      { title: 'Pigmentierung', rows: [
        { label: 'Braunflecken-Wert', value: '83' },
        { label: 'Schweregrad', value: 'Leicht' },
        { label: 'Pigmentierungsflache', value: '10.10%' },
        { label: 'Melasma / Sommersprossen', value: 'Keine' },
      ] },
      { title: 'Sensibilitat und Alterung', rows: [
        { label: 'Sensibilitatswert', value: '93' },
        { label: 'Anteil empfindlicher Haut', value: '0.20%' },
        { label: 'Gesamtwert Falten', value: '75' },
        { label: 'Linke Krahenfusse', value: '', note: true },
        { label: 'Wert', value: '32', indent: true },
        { label: 'Schweregrad', value: 'Mittel', indent: true },
        { label: 'Rechte Krahenfusse', value: '', note: true },
        { label: 'Wert', value: '8', indent: true },
        { label: 'Schweregrad', value: 'Leicht', indent: true },
        { label: 'Nasolabialfalten', value: 'Leicht' },
      ] },
      { title: 'Augenbereichsanalyse', rows: [
        { label: 'Tranenbeutel-Erkennung', value: 'Keine' },
        { label: 'Augenringe-Wert', value: '100' },
        { label: 'Augenringe-Typ', value: 'Keine Augenringe' },
        { label: 'Vaskulare Augenringe', value: 'Keine' },
        { label: 'Pigmentierte Augenringe', value: 'Keine' },
        { label: 'Strukturelle Augenringe', value: 'Keine' },
      ] },
    ],
  },
};

function getIntroLanguage(language?: string) {
  const base = (language || 'zh').split('-')[0].toLowerCase();
  return base === 'en' || base === 'de' ? base : 'zh';
}

export default function SkinAnalysisProIntroPage() {
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const copy = INTRO_COPY[getIntroLanguage(i18n.resolvedLanguage || i18n.language)];

  return (
    <div className="min-h-screen bg-stone-50 pb-20">
      <Helmet>
        <title>{copy.title} - TRASOCHY</title>
      </Helmet>

      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-stone-100 flex items-center h-14 px-4">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-stone-600" aria-label="Back">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="flex-1 text-center font-medium text-lg pr-8">{copy.title}</h1>
      </header>

      <section className="max-w-6xl mx-auto px-4 mt-8 mb-12">
        <div className="text-center mb-10">
          <h3 className="text-2xl font-medium text-stone-900 tracking-wide mb-3">{copy.equipmentTitle}</h3>
          <p className="text-stone-500 text-sm max-w-2xl mx-auto">{copy.equipmentIntro}</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {copy.equipment.map((item) => (
            <div key={item.src} className="bg-white p-2 rounded-xl border border-stone-100 shadow-sm group">
              <div className="aspect-square overflow-hidden rounded-lg bg-stone-50 mb-3">
                <img src={item.src} alt={item.alt} className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700" />
              </div>
              <h4 className="text-center text-sm font-medium text-stone-800">{item.title}</h4>
            </div>
          ))}
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4">
        <div className="bg-gradient-to-br from-stone-900 to-stone-800 text-white py-12 px-6 text-center rounded-2xl shadow-sm">
          <h2 className="text-2xl md:text-3xl font-light tracking-wide mb-4">{copy.heroTitle}</h2>
          <p className="text-stone-300 text-sm md:text-base leading-relaxed max-w-2xl mx-auto">{copy.heroBody}</p>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 mt-8 flex flex-col lg:flex-row gap-8">
        <div className="lg:w-[55%] flex flex-col gap-4">
          <div className="bg-[#1c1c1c] rounded-xl shadow-sm border border-stone-800 p-2 overflow-hidden">
            <img src="/images/ai_skin_demo_10maps_new.png" alt="AI skin map demo" className="w-full h-auto object-contain rounded-lg" />
          </div>

          <div className="grid grid-cols-2 gap-4 mt-2">
            <div className="bg-white rounded-xl shadow-sm border border-stone-100 overflow-hidden">
              <img src="/images/ai_demo_score_cards.png" alt="Score cards demo" className="w-full h-auto object-cover" />
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-stone-100 overflow-hidden">
              <img src="/images/ai_demo_report.png" alt="AI report demo" className="w-full h-auto object-cover" />
            </div>
          </div>

          <div className="mt-4">
            <Link to="/skin-analysis-pro" className="flex items-center justify-center gap-2 w-full bg-stone-900 text-white px-8 py-4 rounded-xl font-medium tracking-widest text-lg hover:bg-stone-800 transition-colors shadow-xl">
              <Camera size={20} />
              {copy.cta}
            </Link>
          </div>
        </div>

        <div className="lg:w-[45%] bg-white rounded-xl shadow-sm border border-stone-100 p-6 md:p-8 overflow-y-auto max-h-[800px] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-stone-200 [&::-webkit-scrollbar-thumb]:rounded-full">
          {copy.sections.map((section, sectionIndex) => (
            <section key={section.title}>
              {sectionIndex > 0 && <h3 className="text-lg font-bold mt-8 mb-3 text-stone-900">{section.title}</h3>}
              {sectionIndex === 0 && <div className="sr-only">{section.title}</div>}
              <div className="space-y-1.5 text-sm">
                {section.rows.map((row, rowIndex) => row.note ? (
                  <p key={`${section.title}-${row.label}-${rowIndex}`} className="text-stone-400 italic mt-3 mb-1 font-serif">{row.label}</p>
                ) : (
                  <div key={`${section.title}-${row.label}-${rowIndex}`} className={`flex justify-between items-center py-1 border-b border-stone-50 ${row.indent ? 'pl-4' : ''}`}>
                    <span className="text-stone-600">{row.label}</span>
                    <span className="text-blue-500 text-right ml-4">{row.value}</span>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>

      <div className="pb-12 mt-12" />
    </div>
  );
}
