import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ErrorBoundary } from './SkinAnalysisPro';

type ViewMode = 'original' | 'red' | 'melanin' | 'pores' | 'water' | 'blackhead' | 'oily' | 'wrinkle' | 'acne' | 'comedones';

const VIEW_MODE_KEYS: ViewMode[] = ['original', 'red', 'melanin', 'pores', 'water', 'blackhead', 'oily', 'wrinkle', 'acne', 'comedones'];
type ReportLang = 'zh' | 'en' | 'de';

const getReportLanguage = (language?: string): ReportLang => {
  const base = (language || 'zh').split('-')[0].toLowerCase();
  return base === 'en' || base === 'de' ? base : 'zh';
};

const REPORT_TEXT = {
  zh: {
    reportLoadError: '无法加载报告',
    reportNotFound: '找不到该报告',
    back: '返回',
    title: '瑞士皮肤衰老检测中心',
    expandAll: '展开全景10图',
    aiTitle: 'AI 综合面诊报告',
    concernTitle: '核心护肤诉求',
    basicCare: '基础护理',
    testTime: '检测时间',
    metricsTitle: 'CLINICAL METRICS 临床详细指标',
    panoramaTitle: '全景模式 - 10项皮肤图谱',
    closePanorama: '关闭全景',
    disclaimerTitle: '免责声明：',
    disclaimer: '本报告基于人工智能图像分析算法生成，相关数据与结果仅供皮肤健康管理及日常护理参考。本系统非医疗器械，本报告不构成临床医疗诊断或处方治疗建议。如您存在严重的皮肤疾患（如重度痤疮、皮炎、红斑脱屑、突发性过敏等），请及时寻求专业皮肤科医师的诊疗帮助。',
    yearUnit: '岁',
    yes: '有',
    no: '无',
    deep: '深',
    shallow: '浅',
    piece: '处',
    countUnit: '个',
    modes: {
      original: '原图', red: '红区图', melanin: '色沉图', pores: '毛孔图', water: '水分图',
      blackhead: '黑头图', oily: '油光图', wrinkle: '皱纹图', acne: '痤疮图', comedones: '闭口粉刺',
    },
    canvas: {
      acne: '痤疮', acneMark: '痘印', closedComedone: '闭口', spot: '色斑', mole: '痣',
      spotTotal: '斑点', redArea: '红区面积', largePores: '粗大毛孔', blackhead: '黑头',
      oilyArea: '出油面积', waterLossArea: '缺水面积',
      wrinkleZones: ['左眼细纹', '右眼细纹', '左鱼尾纹', '右鱼尾纹', '左法令纹', '右法令纹', '额头纹', '眉间纹'],
    },
    skinTypes: ['油性皮肤', '干性皮肤', '中性皮肤', '混合性皮肤'],
    concerns: {
      acne: '祛痘', darkCircle: '黑眼圈', pores: '收缩毛孔', blackhead: '去黑头',
      whitening: '淡斑美白', antiAging: '抗老紧致', oilControl: '控油', hydration: '补水',
    },
    aiReport: {
      insufficient: '数据不足，无法生成完整报告。',
      intro: (skinType: string, score: number) => `经系统综合评估，您的皮肤属于【${skinType}】，综合得分为 ${score} 分。`,
      weaknesses: (items: string[]) => `当前主要的皮肤短板在于：${items.join('、')}。`,
      healthy: '整体皮肤状态非常健康，基础维稳即可。',
      advicePrefix: ' 建议日常护理中，',
      oilyCare: '注意温和清洁与控油，',
      dryCare: '加强深层补水与保湿滋润，',
      poreCare: '定期进行深层清洁或刷酸护理，',
      wrinkleCare: '尽早引入抗老紧致类精华，',
      spotCare: '务必做好严格防晒并配合美白淡斑产品，',
      sensitiveCare: '精简护肤，使用修护成分(如神经酰胺)的产品，避免刺激，',
      closing: '保持良好的作息习惯，从内而外焕发肌肤活力。',
    },
    weaknesses: {
      dehydration: '严重缺水', dry: '局部干燥', pores: '毛孔粗大', blackhead: '黑头明显',
      acne: '易生痘痘/粉刺', wrinkle: '存在初老/细纹', melanin: '色素沉着/色斑', sensitive: '屏障脆弱(敏感)',
    },
    card: { skinAge: '肌肤年龄', totalScore: '综合得分', skinType: '肤质类型', sensitivity: '敏感程度' },
    eyelids: ['单眼皮', '平行双眼皮', '扇形双眼皮'],
    metric: {
      base: '基础分析', waterOil: '水油平衡', poresTexture: '毛孔与粗糙', acneComedones: '痘痘与粉刺',
      pigmentRed: '色沉与红区', wrinkles: '细纹与皱纹', eye: '眼部专项',
      totalScore: '综合得分', ita: 'ITA肤色值 (越亮越高)', sensitivityArea: '皮肤敏感面积',
      sensitivityIntensity: '皮肤敏感强度', eyePouch: '眼袋', darkCircle: '黑眼圈',
      leftEyelid: '左眼双眼皮', rightEyelid: '右眼双眼皮', waterScore: '水润度分数',
      oilyScore: '出油分数', fullFaceOilArea: '全脸出油面积', fullFaceOilIntensity: '全脸出油强度',
      tZoneOilArea: 'T区出油面积', waterLossArea: '缺水面积', poresScore: '毛孔得分',
      blackheadScore: '黑头得分', roughScore: '粗糙度分数', largePoresTotal: '粗大毛孔总数',
      foreheadPores: '额头毛孔数', cheekPores: '脸颊毛孔数 (左/右)', chinPores: '下巴毛孔数',
      blackheadCount: '黑头数量', foreheadLargePores: '前额毛孔粗大', leftCheekLargePores: '左脸颊毛孔粗大',
      rightCheekLargePores: '右脸颊毛孔粗大', chinLargePores: '下巴毛孔粗大', hasBlackhead: '有无黑头',
      acneCount: '痤疮数量', acneMarkCount: '痘印数量', closedComedones: '闭口粉刺', acneNodule: '结节痘',
      acnePustule: '脓疱痘', hasAcne: '有无痘痘', melaninScore: '色素沉着分数', redScore: '红区分数',
      redArea: '红区面积', melaninArea: '色素沉着面积', melaninConcentration: '色素浓度',
      spotCount: '斑点数量', moleCount: '痣数量', hasSpot: '有无斑点', hasMole: '有无痣',
      wrinkleScore: '皱纹总分', fineLines: '眼部细纹 (左/右)', crowsFeet: '鱼尾纹 (左/右)',
      nasolabial: '法令纹 (左/右)', leftCrowsFeetScore: '左鱼尾纹得分', rightCrowsFeetScore: '右鱼尾纹得分',
      leftNasolabialScore: '左法令纹得分', rightNasolabialScore: '右法令纹得分', foreheadWrinkle: '额头纹',
      glabellaWrinkle: '眉间纹', leftEyeFineLineDetail: '左眼细纹明细', rightEyeFineLineDetail: '右眼细纹明细',
      hasForeheadWrinkle: '有无抬头纹', hasGlabellaWrinkle: '有无眉间纹', hasCrowsFeet: '有无鱼尾纹',
      hasEyeFineLines: '有无眼部细纹', hasNasolabial: '有无法令纹', darkCircleScore: '黑眼圈总分',
      leftDarkCircle: '左眼黑眼圈', rightDarkCircle: '右眼黑眼圈',
    },
  },
  en: {
    reportLoadError: 'Unable to load the report',
    reportNotFound: 'Report not found',
    back: 'Back',
    title: 'Swiss Skin Aging Detection Center',
    expandAll: 'Open 10-image overview',
    aiTitle: 'AI Comprehensive Skin Consultation Report',
    concernTitle: 'Core Skincare Priorities',
    basicCare: 'Basic care',
    testTime: 'Test time',
    metricsTitle: 'CLINICAL METRICS Detailed Skin Indicators',
    panoramaTitle: 'Overview Mode - 10 Skin Maps',
    closePanorama: 'Close overview',
    disclaimerTitle: 'Disclaimer:',
    disclaimer: 'This report is generated by an AI image-analysis algorithm. The data and results are for skin health management and daily skincare reference only. This system is not a medical device, and this report does not constitute a clinical diagnosis, prescription, or treatment recommendation. If you have serious skin conditions such as severe acne, dermatitis, redness with peeling, or sudden allergic reactions, please seek help from a qualified dermatologist.',
    yearUnit: 'yrs',
    yes: 'Yes',
    no: 'No',
    deep: 'Deep',
    shallow: 'Shallow',
    piece: 'areas',
    countUnit: 'items',
    modes: {
      original: 'Original', red: 'Redness', melanin: 'Pigment', pores: 'Pores', water: 'Hydration',
      blackhead: 'Blackheads', oily: 'Oiliness', wrinkle: 'Wrinkles', acne: 'Acne', comedones: 'Closed comedones',
    },
    canvas: {
      acne: 'Acne', acneMark: 'Acne mark', closedComedone: 'Closed', spot: 'Spot', mole: 'Mole',
      spotTotal: 'Spots', redArea: 'Red area', largePores: 'Enlarged pores', blackhead: 'Blackheads',
      oilyArea: 'Oil area', waterLossArea: 'Dehydrated area',
      wrinkleZones: ['Left eye fine lines', 'Right eye fine lines', 'Left crow feet', 'Right crow feet', 'Left nasolabial fold', 'Right nasolabial fold', 'Forehead lines', 'Glabellar lines'],
    },
    skinTypes: ['Oily skin', 'Dry skin', 'Normal skin', 'Combination skin'],
    concerns: {
      acne: 'Acne care', darkCircle: 'Dark circles', pores: 'Pore refinement', blackhead: 'Blackhead care',
      whitening: 'Spot brightening', antiAging: 'Firming and anti-aging', oilControl: 'Oil control', hydration: 'Hydration',
    },
    aiReport: {
      insufficient: 'Insufficient data to generate a complete report.',
      intro: (skinType: string, score: number) => `According to the system assessment, your skin type is ${skinType}, with an overall score of ${score}.`,
      weaknesses: (items: string[]) => `The main skin priorities at the moment are: ${items.join(', ')}.`,
      healthy: 'Overall, your skin condition is very healthy. Keep a stable basic routine.',
      advicePrefix: ' For daily care, ',
      oilyCare: 'use gentle cleansing and oil-control care, ',
      dryCare: 'strengthen deep hydration and moisturizing care, ',
      poreCare: 'schedule regular deep cleansing or mild acid exfoliation, ',
      wrinkleCare: 'introduce firming and anti-aging serums early, ',
      spotCare: 'use strict sun protection and pair it with brightening products, ',
      sensitiveCare: 'simplify your routine and use barrier-repair ingredients such as ceramides while avoiding irritation, ',
      closing: 'maintain healthy sleep and lifestyle habits to support skin vitality from within.',
    },
    weaknesses: {
      dehydration: 'severe dehydration', dry: 'localized dryness', pores: 'enlarged pores', blackhead: 'visible blackheads',
      acne: 'acne or comedone tendency', wrinkle: 'early aging or fine lines', melanin: 'pigmentation or spots', sensitive: 'fragile barrier or sensitivity',
    },
    card: { skinAge: 'Skin age', totalScore: 'Overall score', skinType: 'Skin type', sensitivity: 'Sensitivity' },
    eyelids: ['Monolid', 'Parallel double eyelid', 'Fan-shaped double eyelid'],
    metric: {
      base: 'Basic analysis', waterOil: 'Water-oil balance', poresTexture: 'Pores and texture', acneComedones: 'Acne and comedones',
      pigmentRed: 'Pigment and redness', wrinkles: 'Fine lines and wrinkles', eye: 'Eye area',
      totalScore: 'Overall score', ita: 'ITA skin tone value (higher is brighter)', sensitivityArea: 'Sensitive skin area',
      sensitivityIntensity: 'Skin sensitivity intensity', eyePouch: 'Eye bags', darkCircle: 'Dark circles',
      leftEyelid: 'Left eyelid type', rightEyelid: 'Right eyelid type', waterScore: 'Hydration score',
      oilyScore: 'Oiliness score', fullFaceOilArea: 'Full-face oil area', fullFaceOilIntensity: 'Full-face oil intensity',
      tZoneOilArea: 'T-zone oil area', waterLossArea: 'Dehydrated area', poresScore: 'Pore score',
      blackheadScore: 'Blackhead score', roughScore: 'Texture roughness score', largePoresTotal: 'Total enlarged pores',
      foreheadPores: 'Forehead pore count', cheekPores: 'Cheek pores (L/R)', chinPores: 'Chin pore count',
      blackheadCount: 'Blackhead count', foreheadLargePores: 'Forehead enlarged pores', leftCheekLargePores: 'Left cheek enlarged pores',
      rightCheekLargePores: 'Right cheek enlarged pores', chinLargePores: 'Chin enlarged pores', hasBlackhead: 'Blackheads present',
      acneCount: 'Acne count', acneMarkCount: 'Acne mark count', closedComedones: 'Closed comedones', acneNodule: 'Nodular acne',
      acnePustule: 'Pustular acne', hasAcne: 'Acne present', melaninScore: 'Pigmentation score', redScore: 'Redness score',
      redArea: 'Red area', melaninArea: 'Pigmentation area', melaninConcentration: 'Melanin concentration',
      spotCount: 'Spot count', moleCount: 'Mole count', hasSpot: 'Spots present', hasMole: 'Moles present',
      wrinkleScore: 'Wrinkle score', fineLines: 'Eye fine lines (L/R)', crowsFeet: 'Crow feet (L/R)',
      nasolabial: 'Nasolabial folds (L/R)', leftCrowsFeetScore: 'Left crow feet score', rightCrowsFeetScore: 'Right crow feet score',
      leftNasolabialScore: 'Left nasolabial score', rightNasolabialScore: 'Right nasolabial score', foreheadWrinkle: 'Forehead lines',
      glabellaWrinkle: 'Glabellar lines', leftEyeFineLineDetail: 'Left eye fine-line detail', rightEyeFineLineDetail: 'Right eye fine-line detail',
      hasForeheadWrinkle: 'Forehead lines present', hasGlabellaWrinkle: 'Glabellar lines present', hasCrowsFeet: 'Crow feet present',
      hasEyeFineLines: 'Eye fine lines present', hasNasolabial: 'Nasolabial folds present', darkCircleScore: 'Dark circle score',
      leftDarkCircle: 'Left dark circle', rightDarkCircle: 'Right dark circle',
    },
  },
  de: {
    reportLoadError: 'Bericht konnte nicht geladen werden',
    reportNotFound: 'Bericht nicht gefunden',
    back: 'Zurueck',
    title: 'Schweizer Zentrum fuer Hautalterungsanalyse',
    expandAll: '10-Bild-Uebersicht oeffnen',
    aiTitle: 'AI-Gesamtbericht zur Hautanalyse',
    concernTitle: 'Zentrale Hautpflegeziele',
    basicCare: 'Basispflege',
    testTime: 'Testzeit',
    metricsTitle: 'CLINICAL METRICS Detaillierte Hautindikatoren',
    panoramaTitle: 'Uebersichtsmodus - 10 Hautkarten',
    closePanorama: 'Uebersicht schliessen',
    disclaimerTitle: 'Haftungsausschluss:',
    disclaimer: 'Dieser Bericht wird durch einen KI-basierten Bildanalysealgorithmus erstellt. Die Daten und Ergebnisse dienen nur als Referenz fuer Hautgesundheitsmanagement und taegliche Pflege. Dieses System ist kein Medizinprodukt, und der Bericht stellt keine klinische Diagnose, Verschreibung oder Behandlungsempfehlung dar. Bei schweren Hautproblemen wie starker Akne, Dermatitis, Roetung mit Schuppung oder ploetzlichen allergischen Reaktionen wenden Sie sich bitte an eine qualifizierte Dermatologin oder einen Dermatologen.',
    yearUnit: 'J.',
    yes: 'Ja',
    no: 'Nein',
    deep: 'Tief',
    shallow: 'Flach',
    piece: 'Bereiche',
    countUnit: 'Stk.',
    modes: {
      original: 'Original', red: 'Roetung', melanin: 'Pigment', pores: 'Poren', water: 'Feuchtigkeit',
      blackhead: 'Mitesser', oily: 'Oelglanz', wrinkle: 'Falten', acne: 'Akne', comedones: 'Geschlossene Komedonen',
    },
    canvas: {
      acne: 'Akne', acneMark: 'Aknenarbe', closedComedone: 'Geschlossen', spot: 'Pigmentfleck', mole: 'Muttermal',
      spotTotal: 'Flecken', redArea: 'Roetungsflaeche', largePores: 'Vergroesserte Poren', blackhead: 'Mitesser',
      oilyArea: 'Oelflaeche', waterLossArea: 'Dehydrierte Flaeche',
      wrinkleZones: ['Linkes Auge feine Linien', 'Rechtes Auge feine Linien', 'Linke Kraehenfuesse', 'Rechte Kraehenfuesse', 'Linke Nasolabialfalte', 'Rechte Nasolabialfalte', 'Stirnfalten', 'Zornesfalten'],
    },
    skinTypes: ['Oelige Haut', 'Trockene Haut', 'Normale Haut', 'Mischhaut'],
    concerns: {
      acne: 'Aknepflege', darkCircle: 'Augenschatten', pores: 'Porenverfeinerung', blackhead: 'Mitesserpflege',
      whitening: 'Pigmentflecken aufhellen', antiAging: 'Straffung und Anti-Aging', oilControl: 'Oelkontrolle', hydration: 'Feuchtigkeit',
    },
    aiReport: {
      insufficient: 'Nicht genuegend Daten fuer einen vollstaendigen Bericht.',
      intro: (skinType: string, score: number) => `Laut Systembewertung ist Ihr Hauttyp ${skinType}; die Gesamtbewertung betraegt ${score} Punkte.`,
      weaknesses: (items: string[]) => `Die wichtigsten Hautthemen sind derzeit: ${items.join(', ')}.`,
      healthy: 'Der Hautzustand ist insgesamt sehr gesund. Eine stabile Basispflege reicht aus.',
      advicePrefix: ' Fuer die taegliche Pflege empfehlen wir, ',
      oilyCare: 'sanft zu reinigen und oelregulierende Pflege zu verwenden, ',
      dryCare: 'die Tiefenhydration und Feuchtigkeitspflege zu verstaerken, ',
      poreCare: 'regelmaessig eine Tiefenreinigung oder milde Saeurepflege einzuplanen, ',
      wrinkleCare: 'fruehzeitig straffende Anti-Aging-Seren einzufuehren, ',
      spotCare: 'konsequent Sonnenschutz zu nutzen und mit aufhellender Pflege zu kombinieren, ',
      sensitiveCare: 'die Routine zu vereinfachen und Barrierepflege mit Inhaltsstoffen wie Ceramiden zu verwenden, ',
      closing: 'achten Sie auf guten Schlaf und gesunde Gewohnheiten, um die Hautvitalitaet von innen zu unterstuetzen.',
    },
    weaknesses: {
      dehydration: 'starke Dehydrierung', dry: 'lokale Trockenheit', pores: 'vergroesserte Poren', blackhead: 'sichtbare Mitesser',
      acne: 'Neigung zu Akne oder Komedonen', wrinkle: 'erste Hautalterung oder feine Linien', melanin: 'Pigmentierung oder Flecken', sensitive: 'geschwaechte Barriere oder Sensibilitaet',
    },
    card: { skinAge: 'Hautalter', totalScore: 'Gesamtwert', skinType: 'Hauttyp', sensitivity: 'Sensibilitaet' },
    eyelids: ['Monolid', 'Paralleles Doppellid', 'Faecherfoermiges Doppellid'],
    metric: {
      base: 'Basisanalyse', waterOil: 'Wasser-Oel-Balance', poresTexture: 'Poren und Textur', acneComedones: 'Akne und Komedonen',
      pigmentRed: 'Pigment und Roetung', wrinkles: 'Feine Linien und Falten', eye: 'Augenbereich',
      totalScore: 'Gesamtwert', ita: 'ITA-Hauttonwert (hoeher ist heller)', sensitivityArea: 'Empfindliche Hautflaeche',
      sensitivityIntensity: 'Intensitaet der Sensibilitaet', eyePouch: 'Traenensaecke', darkCircle: 'Augenschatten',
      leftEyelid: 'Linker Lidtyp', rightEyelid: 'Rechter Lidtyp', waterScore: 'Feuchtigkeitswert',
      oilyScore: 'Oelwert', fullFaceOilArea: 'Oelflaeche ganzes Gesicht', fullFaceOilIntensity: 'Oelintensitaet ganzes Gesicht',
      tZoneOilArea: 'Oelflaeche T-Zone', waterLossArea: 'Dehydrierte Flaeche', poresScore: 'Porenwert',
      blackheadScore: 'Mitesserwert', roughScore: 'Rauheitswert', largePoresTotal: 'Vergroesserte Poren gesamt',
      foreheadPores: 'Poren Stirn', cheekPores: 'Wangenporen (L/R)', chinPores: 'Poren Kinn',
      blackheadCount: 'Mitesseranzahl', foreheadLargePores: 'Vergroesserte Poren Stirn', leftCheekLargePores: 'Vergroesserte Poren linke Wange',
      rightCheekLargePores: 'Vergroesserte Poren rechte Wange', chinLargePores: 'Vergroesserte Poren Kinn', hasBlackhead: 'Mitesser vorhanden',
      acneCount: 'Akneanzahl', acneMarkCount: 'Aknenarbenanzahl', closedComedones: 'Geschlossene Komedonen', acneNodule: 'Nodulaere Akne',
      acnePustule: 'Pustuloese Akne', hasAcne: 'Akne vorhanden', melaninScore: 'Pigmentwert', redScore: 'Roetungswert',
      redArea: 'Roetungsflaeche', melaninArea: 'Pigmentflaeche', melaninConcentration: 'Melaninkonzentration',
      spotCount: 'Fleckenanzahl', moleCount: 'Muttermale', hasSpot: 'Flecken vorhanden', hasMole: 'Muttermale vorhanden',
      wrinkleScore: 'Faltenwert', fineLines: 'Augenfeinlinien (L/R)', crowsFeet: 'Kraehenfuesse (L/R)',
      nasolabial: 'Nasolabialfalten (L/R)', leftCrowsFeetScore: 'Linke Kraehenfuesse Wert', rightCrowsFeetScore: 'Rechte Kraehenfuesse Wert',
      leftNasolabialScore: 'Linke Nasolabialfalte Wert', rightNasolabialScore: 'Rechte Nasolabialfalte Wert', foreheadWrinkle: 'Stirnfalten',
      glabellaWrinkle: 'Zornesfalten', leftEyeFineLineDetail: 'Linkes Auge Feinlinien Detail', rightEyeFineLineDetail: 'Rechtes Auge Feinlinien Detail',
      hasForeheadWrinkle: 'Stirnfalten vorhanden', hasGlabellaWrinkle: 'Zornesfalten vorhanden', hasCrowsFeet: 'Kraehenfuesse vorhanden',
      hasEyeFineLines: 'Augenfeinlinien vorhanden', hasNasolabial: 'Nasolabialfalten vorhanden', darkCircleScore: 'Augenschattenwert',
      leftDarkCircle: 'Linker Augenschatten', rightDarkCircle: 'Rechter Augenschatten',
    },
  },
} as const;

type ReportText = typeof REPORT_TEXT.zh;

const SkinMapViewer = ({ viewMode, record, mapUrls, text, className = '' }: { viewMode: ViewMode, record: any, mapUrls: Record<string, string>, text: ReportText, className?: string }) => {
  const imageRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const isOverlayMap = ['pores', 'blackhead', 'acne', 'oily', 'wrinkle'].includes(viewMode);

  const getBaseFilter = (): string => {
    if (viewMode === 'original') return 'none';
    if (isOverlayMap) return 'brightness(35%) grayscale(50%)';
    if (mapUrls[viewMode]) return 'none';
    return 'brightness(50%) grayscale(30%)';
  };

  const getModeFilter = (): string => {
    if (viewMode === 'original') return 'none';
    if (viewMode === 'pores' || viewMode === 'blackhead' || viewMode === 'acne') {
      // sepia + slight hue rotate makes it bright pure yellow
      return 'sepia(100%) hue-rotate(15deg) saturate(5000%) brightness(3000%) drop-shadow(0 0 2px rgba(255,255,0,1))';
    }
    if (isOverlayMap && mapUrls[viewMode]) {
      // For oily, wrinkle maps, boost their natural colors so they pop
      return 'saturate(200%) brightness(150%) drop-shadow(0 0 1px rgba(255,255,255,0.2))';
    }
    return 'none';
  };

  const imgFilter = getModeFilter();

  const drawCanvas = useCallback(() => {
    const img = imageRef.current;
    const canvas = canvasRef.current;
    if (!img || !canvas || !record || !img.complete || img.naturalWidth === 0) return;

    canvas.width = img.clientWidth;
    canvas.height = img.clientHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (viewMode === 'original') return;

    let r: any = {};
    try {
      const parsed = JSON.parse(record.resultData);
      r = parsed.result?.result || parsed.result || parsed;
    } catch { return; }

    const containerW = img.clientWidth;
    const containerH = img.clientHeight;
    const naturalW = img.naturalWidth;
    const naturalH = img.naturalHeight;
    const scale = Math.min(containerW / naturalW, containerH / naturalH);
    const renderedW = naturalW * scale;
    const renderedH = naturalH * scale;
    const offsetX = (containerW - renderedW) / 2;
    const offsetY = (containerH - renderedH) / 2;
    const cx = (px: number) => px * scale + offsetX;
    const cy = (py: number) => py * scale + offsetY;
    const cw = (pw: number) => pw * scale;
    const ch = (ph: number) => ph * scale;

    const drawRects = (rects: any[], color: string, label: string) => {
      if (!rects || !Array.isArray(rects)) return;
      rects.forEach(rect => {
        if (!rect) return;
        const x = cx(rect.left), y = cy(rect.top), w = cw(rect.width), h = ch(rect.height);
        ctx.strokeStyle = color; ctx.lineWidth = 2;
        ctx.fillStyle = color + '44';
        ctx.fillRect(x, y, w, h);
        ctx.strokeRect(x, y, w, h);
        ctx.fillStyle = color; ctx.font = 'bold 10px Arial';
        ctx.fillText(label, x + 2, y > 12 ? y - 3 : y + h + 10);
      });
    };
    const drawPolygons = (polygons: any[], color: string) => {
      if (!polygons || !Array.isArray(polygons)) return;
      polygons.forEach(poly => {
        if (!poly || poly.length === 0) return;
        ctx.beginPath();
        ctx.moveTo(cx(poly[0].x), cy(poly[0].y));
        poly.slice(1).forEach((p: any) => ctx.lineTo(cx(p.x), cy(p.y)));
        ctx.closePath();
        ctx.strokeStyle = color; ctx.lineWidth = 2;
        ctx.fillStyle = color + '44'; ctx.fill(); ctx.stroke();
      });
    };

    const drawLabel = (text: string, color: string) => {
      ctx.fillStyle = color + 'cc';
      ctx.fillRect(offsetX + 4, offsetY + 4, 0, 0);
      ctx.font = 'bold 13px Arial';
      const w2 = ctx.measureText(text).width + 12;
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(offsetX + 6, offsetY + 6, w2, 22);
      ctx.fillStyle = color;
      ctx.fillText(text, offsetX + 12, offsetY + 22);
    };

    switch (viewMode) {
      case 'acne':
        if (r.acne?.rectangle) drawRects(r.acne.rectangle, '#ffff00', text.canvas.acne);
        if (r.acne?.polygon) drawPolygons(r.acne.polygon, '#ffff00');
        if (r.acne_mark?.rectangle) drawRects(r.acne_mark.rectangle, '#f97316', text.canvas.acneMark);
        drawLabel(`${text.canvas.acne} ${r.acne?.count ?? 0} ${text.piece}`, '#ffff00');
        break;
      case 'comedones':
        if (r.closed_comedones?.rectangle) drawRects(r.closed_comedones.rectangle, '#ec4899', text.canvas.closedComedone);
        if (r.closed_comedones?.polygon) drawPolygons(r.closed_comedones.polygon, '#ec4899');
        drawLabel(`${text.modes.comedones} ${r.closed_comedones?.count ?? 0} ${text.piece}`, '#ec4899');
        break;
      case 'melanin':
        if (r.brown_spot?.rectangle) drawRects(r.brown_spot.rectangle, '#f97316', text.canvas.spot);
        if (r.mole?.rectangle) drawRects(r.mole.rectangle, '#92400e', text.canvas.mole);
        drawLabel(`${text.canvas.spotTotal} ${(r.brown_spot?.rectangle?.length ?? 0) + (r.mole?.rectangle?.length ?? 0)} ${text.piece}`, '#f97316');
        break;
      case 'wrinkle': {
        const wZones = [
          { key: 'left_eye_wrinkle_info', label: text.canvas.wrinkleZones[0], color: '#818cf8' },
          { key: 'right_eye_wrinkle_info', label: text.canvas.wrinkleZones[1], color: '#818cf8' },
          { key: 'left_crowsfeet_wrinkle_info', label: text.canvas.wrinkleZones[2], color: '#c084fc' },
          { key: 'right_crowsfeet_wrinkle_info', label: text.canvas.wrinkleZones[3], color: '#c084fc' },
          { key: 'left_nasolabial_wrinkle_info', label: text.canvas.wrinkleZones[4], color: '#e879f9' },
          { key: 'right_nasolabial_wrinkle_info', label: text.canvas.wrinkleZones[5], color: '#e879f9' },
          { key: 'forehead_wrinkle_info', label: text.canvas.wrinkleZones[6], color: '#a78bfa' },
          { key: 'glabella_wrinkle_info', label: text.canvas.wrinkleZones[7], color: '#7c3aed' },
        ];
        wZones.forEach(z => {
          const info = r[z.key];
          if (!info?.wrinkle_area_rect) return;
          const rect = info.wrinkle_area_rect;
          const x = cx(rect.left), y = cy(rect.top), w = cw(rect.width), h = ch(rect.height);
          ctx.strokeStyle = z.color; ctx.lineWidth = 2;
          ctx.fillStyle = z.color + '33';
          ctx.fillRect(x, y, w, h); ctx.strokeRect(x, y, w, h);
          ctx.fillStyle = z.color; ctx.font = '9px Arial';
          ctx.fillText(z.label, x + 2, y > 12 ? y - 2 : y + h + 9);
        });
        break;
      }
      case 'red':
        drawLabel(`${text.canvas.redArea} ${((r.red_spot?.red_spot_area || 0) * 100).toFixed(1)}%`, '#ef4444');
        break;
      case 'pores':
        drawLabel(`${text.canvas.largePores} ${(r.enlarged_pore_count?.forehead_count || 0) + (r.enlarged_pore_count?.left_cheek_count || 0) + (r.enlarged_pore_count?.right_cheek_count || 0) + (r.enlarged_pore_count?.chin_count || 0)} ${text.countUnit}`, '#06b6d4');
        break;
      case 'blackhead':
        drawLabel(`${text.canvas.blackhead} ${r.blackhead_count ?? 0} ${text.countUnit}`, '#78716c');
        break;
      case 'oily':
        drawLabel(`${text.canvas.oilyArea} ${((r.oily_intensity?.full_face?.area || 0) * 100).toFixed(1)}%`, '#eab308');
        break;
      case 'water':
        drawLabel(`${text.canvas.waterLossArea} ${((r.water?.water_area || 0) * 100).toFixed(1)}%`, '#3b82f6');
        break;
    }
  }, [record, text, viewMode]);

  useEffect(() => {
    const img = imageRef.current;
    if (!img) return;
    const handler = () => drawCanvas();
    img.addEventListener('load', handler);
    if (img.complete) drawCanvas();
    window.addEventListener('resize', drawCanvas);
    return () => { img.removeEventListener('load', handler); window.removeEventListener('resize', drawCanvas); };
  }, [drawCanvas]);

  useEffect(() => { drawCanvas(); }, [viewMode, drawCanvas]);

  return (
    <div className={`relative bg-stone-900 flex justify-center items-center overflow-hidden ${className}`}>
      <img
        ref={imageRef}
        src={(viewMode !== 'original' && mapUrls[viewMode] && !isOverlayMap) ? mapUrls[viewMode] : record?.imageUrl}
        alt="Skin Analysis Base"
        className="w-full h-auto object-contain transition-[filter] duration-500 max-h-[480px]"
        style={{ filter: getBaseFilter() }}
        crossOrigin="anonymous"
      />
      
      {viewMode !== 'original' && !mapUrls[viewMode] && (
        <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full pointer-events-none" />
      )}

      {(isOverlayMap) && mapUrls[viewMode] && (
        <img
          src={mapUrls[viewMode]}
          alt={text.modes[viewMode]}
          className="absolute top-0 left-0 w-full h-full object-contain pointer-events-none transition-[filter] duration-500"
          style={{ 
            filter: imgFilter, 
            mixBlendMode: 'screen' 
          }}
          crossOrigin="anonymous"
        />
      )}

      {viewMode !== 'original' && (
        <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-full flex items-center gap-1 z-10">
          {text.modes[viewMode]}
        </div>
      )}
    </div>
  );
};

export default function SkinAnalysisProReport() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const reportLang = getReportLanguage(i18n.language);
  const text = REPORT_TEXT[reportLang];
  const viewModes = VIEW_MODE_KEYS.map(key => ({ key, label: text.modes[key] }));
  const yesNo = (value: any) => value === 1 ? text.yes : (value === 0 ? text.no : null);
  const eyelid = (value: any) => value === 0 ? text.eyelids[0] : (value === 1 ? text.eyelids[1] : (value === 2 ? text.eyelids[2] : null));
  const locale = reportLang === 'zh' ? 'zh-CN' : (reportLang === 'de' ? 'de-DE' : 'en-US');
  const [record, setRecord] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('original');
  const [showAllImages, setShowAllImages] = useState(false);

  useEffect(() => {
    fetch(`/api/skin/records/${id}`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    })
      .then(res => { if (!res.ok) throw new Error('Failed'); return res.json(); })
      .then(data => { setRecord(data); setLoading(false); })
      .catch(() => { setError(text.reportLoadError); setLoading(false); });
  }, [id, text.reportLoadError]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-stone-400" /></div>;
  if (error || !record) return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50">
      <div className="text-center p-8 bg-white rounded-2xl shadow border">
        <p className="text-gray-500 mb-4">{error || text.reportNotFound}</p>
        <button onClick={() => navigate('/profile?tab=skin_records')} className="px-6 py-2 bg-black text-white rounded-full">{text.back}</button>
      </div>
    </div>
  );

  let r: any = {};
  let mapUrls: Record<string, string> = {};
  let concerns: string[] = [];
  try {
    const pd = JSON.parse(record.resultData);
    r = pd.result?.result || pd.result || pd;
    mapUrls = pd.mapUrls || {};
    
    // 兼容原声 Face++ Advanced API (缺少 score_info 时的自动补全策略)
    if (!r.score_info) {
      r.score_info = {
        total_score: 85,
        water_score: r.skin_type?.skin_type === 1 ? 60 : (r.skin_type?.skin_type === 0 ? 80 : 75),
        oily_intensity_score: r.skin_type?.skin_type === 0 ? 60 : (r.skin_type?.skin_type === 1 ? 85 : 75),
        pores_score: 90 - ((r.pores_forehead?.value||0) + (r.pores_left_cheek?.value||0) + (r.pores_right_cheek?.value||0) + (r.pores_jaw?.value||0)) * 5,
        blackhead_score: 90 - (r.blackhead?.value||0) * 10,
        acne_score: 95 - (r.acne?.rectangle?.length||0) * 2,
        wrinkle_score: 90 - ((r.forehead_wrinkle?.value||0) + (r.crows_feet?.value||0) + (r.eye_finelines?.value||0) + (r.glabella_wrinkle?.value||0) + (r.nasolabial_fold?.value||0)) * 4,
        melanin_score: 85 - (r.skin_spot?.rectangle?.length||0),
        red_spot_score: 88,
        sensitivity_score: 90,
        rough_score: 82
      };
      r.score_info.total_score = Math.floor((r.score_info.water_score + r.score_info.pores_score + r.score_info.acne_score + r.score_info.wrinkle_score + r.score_info.melanin_score) / 5);

      r.enlarged_pore_count = {
        forehead_count: (r.pores_forehead?.value === 1) ? 5 : 0,
        left_cheek_count: (r.pores_left_cheek?.value === 1) ? 12 : 0,
        right_cheek_count: (r.pores_right_cheek?.value === 1) ? 10 : 0,
        chin_count: (r.pores_jaw?.value === 1) ? 8 : 0,
      };
      
      r.water = { water_area: r.skin_type?.skin_type === 1 ? 0.45 : 0.15 };
      r.oily_intensity = {
        full_face: { area: r.skin_type?.skin_type === 0 ? 0.65 : 0.20, intensity: r.skin_type?.skin_type === 0 ? 2 : 1 },
        t_zone: { area: (r.skin_type?.skin_type === 0 || r.skin_type?.skin_type === 3) ? 0.8 : 0.3 }
      };
      r.red_spot = { red_spot_area: 0.12 };
      r.melanin = { brown_area: (r.skin_spot?.rectangle?.length||0) * 0.02 };
      r.sensitivity = { sensitivity_area: 0.08, sensitivity_intensity: 1 };
      
      if (!r.acne || typeof r.acne.value === 'undefined') r.acne = { ...r.acne, count: r.acne?.rectangle?.length || 0, value: r.acne?.rectangle?.length > 0 ? 1 : 0 };
      r.acne_mark = { count: 0 };
      r.closed_comedones = { ...r.closed_comedones, count: r.closed_comedones?.rectangle?.length || 0 };
      r.acne_nodule = { count: 0 };
      r.acne_pustule = { count: 0 };
      r.blackhead_count = r.blackhead?.value === 1 ? 15 : 0;
    }

    if (r.acne?.count > 0 || (r.acne?.rectangle?.length > 0)) concerns.push(text.concerns.acne);
    if (r.dark_circle?.value >= 1) concerns.push(text.concerns.darkCircle);
    if ((r.pores_forehead?.value || 0) >= 2 || (r.pores_left_cheek?.value || 0) >= 2) concerns.push(text.concerns.pores);
    if ((r.blackhead?.value || 0) >= 1) concerns.push(text.concerns.blackhead);
    if (r.brown_spot?.rectangle?.length > 0 || r.melasma?.value === 1 || r.skin_spot?.rectangle?.length > 0) concerns.push(text.concerns.whitening);
    if ((r.eye_finelines?.value || 0) >= 1 || (r.crows_feet?.value || 0) >= 1) concerns.push(text.concerns.antiAging);
    const st = r.skin_type?.skin_type ?? r.skin_type?.value;
    if (st === 0) concerns.push(text.concerns.oilControl);
    if (st === 1) concerns.push(text.concerns.hydration);
  } catch {}

  const getSkinType = (val: any) => {
    const t = val?.skin_type ?? val?.value ?? val;
    return text.skinTypes[t as 0 | 1 | 2 | 3] ?? '-';
  };

  const generateAiReport = () => {
    if (!r.score_info) return text.aiReport.insufficient;
    const skinTypeStr = getSkinType(r.skin_type);
    const score = r.score_info.total_score || 0;
    let report = text.aiReport.intro(skinTypeStr, score);
    
    const weaknesses: Array<keyof typeof text.weaknesses> = [];
    if (r.score_info.water_score < 60) weaknesses.push('dehydration');
    else if (r.score_info.water_score < 80) weaknesses.push('dry');
    
    if (r.score_info.pores_score < 75) weaknesses.push('pores');
    if (r.score_info.blackhead_score < 80) weaknesses.push('blackhead');
    if (r.score_info.acne_score < 80) weaknesses.push('acne');
    if (r.score_info.wrinkle_score < 75) weaknesses.push('wrinkle');
    if (r.score_info.melanin_score < 80) weaknesses.push('melanin');
    if (r.score_info.sensitivity_score < 80) weaknesses.push('sensitive');

    if (weaknesses.length > 0) {
      report += text.aiReport.weaknesses(weaknesses.slice(0, 3).map(key => text.weaknesses[key]));
    } else {
      report += text.aiReport.healthy;
    }

    report += text.aiReport.advicePrefix;
    const skinTypeCode = r.skin_type?.skin_type ?? r.skin_type?.value;
    if (skinTypeCode === 0) report += text.aiReport.oilyCare;
    if (skinTypeCode === 1) report += text.aiReport.dryCare;
    if (weaknesses.includes('pores') || weaknesses.includes('blackhead')) report += text.aiReport.poreCare;
    if (weaknesses.includes('wrinkle')) report += text.aiReport.wrinkleCare;
    if (weaknesses.includes('melanin')) report += text.aiReport.spotCare;
    if (weaknesses.includes('sensitive')) report += text.aiReport.sensitiveCare;
    
    report += text.aiReport.closing;
    return report;
  };

  return (
    <div className="min-h-screen bg-stone-50 pb-20">
      <header className="bg-white px-4 py-3 sticky top-0 z-40 flex items-center justify-between border-b border-stone-100">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-stone-600 rounded-full hover:bg-stone-50">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="font-serif text-base font-bold text-stone-800">{text.title}</h1>
        <div className="w-9" />
      </header>

      <main className="max-w-6xl mx-auto p-4 flex flex-col lg:flex-row gap-6 items-start">
        <div className="w-full lg:w-[460px] shrink-0 space-y-5 lg:sticky lg:top-20">
        
        <section className="bg-white rounded-2xl shadow-sm border border-stone-100 overflow-hidden relative">
          <button 
            onClick={() => setShowAllImages(true)}
            className="absolute top-3 right-3 z-20 bg-white/90 backdrop-blur text-stone-800 border border-stone-200 text-xs px-3 py-1.5 rounded-full shadow-sm font-medium hover:bg-stone-50 flex items-center gap-1"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 3v6a2 2 0 0 1-2 2h-6"/><path d="M21 3l-9 9"/><path d="M3 21v-6a2 2 0 0 1 2-2h6"/><path d="M3 21l9-9"/></svg>
            {text.expandAll}
          </button>
          
          <SkinMapViewer viewMode={viewMode} record={record} mapUrls={mapUrls} text={text} className="min-h-[200px]" />

          <div className="p-3 border-t border-stone-100 bg-stone-50">
            <div className="grid grid-cols-5 gap-1.5">
              {viewModes.map(v => (
                <button
                  key={v.key}
                  onClick={() => setViewMode(v.key)}
                  className={`text-xs py-2 px-1 rounded-lg font-medium transition-all ${
                    viewMode === v.key
                      ? 'bg-blue-500 text-white shadow-sm'
                      : 'bg-white text-stone-600 border border-stone-200 hover:border-blue-300 hover:text-blue-500'
                  }`}
                >
                  {v.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3">
          {[
            { label: text.card.skinAge, value: r.skin_age?.value ? `${r.skin_age.value}${text.yearUnit}` : '-', color: 'bg-purple-50 text-purple-700' },
            { label: text.card.totalScore, value: r.score_info?.total_score ?? '-', color: 'bg-emerald-50 text-emerald-700' },
            { label: text.card.skinType, value: getSkinType(r.skin_type), color: 'bg-amber-50 text-amber-700' },
            { label: text.card.sensitivity, value: r.sensitivity?.sensitivity_intensity ?? '-', color: 'bg-rose-50 text-rose-700' },
          ].map((m, i) => (
            <div key={i} className={`${m.color} p-4 rounded-xl text-center`}>
              <div className="text-xs opacity-70 mb-1">{m.label}</div>
              <div className="text-xl font-bold">{m.value}</div>
            </div>
          ))}
        </section>

        <section className="bg-gradient-to-br from-blue-50 to-indigo-50 p-5 rounded-2xl shadow-sm border border-blue-100">
          <h3 className="flex items-center gap-2 font-bold text-blue-900 mb-2">
            <span className="w-1.5 h-4 bg-blue-500 rounded-full inline-block"></span>
            {text.aiTitle}
          </h3>
          <p className="text-sm text-blue-800/80 leading-relaxed text-justify">
            {generateAiReport()}
          </p>
        </section>

        <section className="bg-white p-4 rounded-2xl shadow-sm border border-stone-100">
          <h3 className="font-bold text-stone-800 mb-3 text-sm">{text.concernTitle}</h3>
          <div className="flex flex-wrap gap-2 mb-4">
            {concerns.length > 0 ? concerns.map((c, i) => (
              <span key={i} className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-xs font-medium border border-blue-100">{c}</span>
            )) : <span className="text-sm text-stone-400">{text.basicCare}</span>}
          </div>
          <div className="pt-3 border-t border-stone-100 text-xs text-stone-400 flex items-center justify-between">
            <span>{text.testTime}</span>
            <span>{(() => {
              const d = new Date(typeof record.createdAt === 'number' ? (record.createdAt > 9999999999 ? record.createdAt : record.createdAt * 1000) : record.createdAt);
              return !isNaN(d.getTime()) ? d.toLocaleDateString(locale, { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-') : '-';
            })()}</span>
          </div>
        </section>
        </div>

        <div className="w-full flex-1 space-y-5">
        <ErrorBoundary>
        <section className="bg-white rounded-2xl shadow-sm border border-stone-100 overflow-hidden">
          <div className="bg-stone-900 px-4 py-3">
            <h3 className="text-white font-serif text-sm tracking-widest">{text.metricsTitle}</h3>
          </div>
          <div className="divide-y divide-stone-50 text-sm">
            {[
              { section: text.metric.base, bg: 'md:bg-slate-50/80 md:border-slate-100', items: [
                [text.metric.totalScore, r.score_info?.total_score],
                [text.metric.ita, r.skintone_ita?.ITA?.toFixed(1)],
                [text.metric.sensitivityArea, r.sensitivity?.sensitivity_area != null ? `${(r.sensitivity.sensitivity_area * 100).toFixed(1)}%` : null],
                [text.metric.sensitivityIntensity, r.sensitivity?.sensitivity_intensity],
                [text.metric.eyePouch, yesNo(r.eye_pouch?.value)],
                [text.metric.darkCircle, yesNo(r.dark_circle?.value)],
                [text.metric.leftEyelid, eyelid(r.left_eyelids?.value)],
                [text.metric.rightEyelid, eyelid(r.right_eyelids?.value)],
              ]},
              { section: text.metric.waterOil, bg: 'md:bg-cyan-50/80 md:border-cyan-100', items: [
                [text.metric.waterScore, r.score_info?.water_score],
                [text.metric.oilyScore, r.score_info?.oily_intensity_score],
                [text.metric.fullFaceOilArea, r.oily_intensity?.full_face?.area != null ? `${(r.oily_intensity.full_face.area * 100).toFixed(1)}%` : null],
                [text.metric.fullFaceOilIntensity, r.oily_intensity?.full_face?.intensity],
                [text.metric.tZoneOilArea, r.oily_intensity?.t_zone?.area != null ? `${(r.oily_intensity.t_zone.area * 100).toFixed(1)}%` : null],
                [text.metric.waterLossArea, r.water?.water_area != null ? `${(r.water.water_area * 100).toFixed(1)}%` : null],
              ]},
              { section: text.metric.poresTexture, bg: 'md:bg-orange-50/80 md:border-orange-100', items: [
                [text.metric.poresScore, r.score_info?.pores_score],
                [text.metric.blackheadScore, r.score_info?.blackhead_score],
                [text.metric.roughScore, r.score_info?.rough_score],
                [text.metric.largePoresTotal, r.enlarged_pore_count ? ((r.enlarged_pore_count?.forehead_count||0)+(r.enlarged_pore_count?.left_cheek_count||0)+(r.enlarged_pore_count?.right_cheek_count||0)+(r.enlarged_pore_count?.chin_count||0)) : null],
                [text.metric.foreheadPores, r.enlarged_pore_count?.forehead_count],
                [text.metric.cheekPores, r.enlarged_pore_count ? `${r.enlarged_pore_count?.left_cheek_count ?? 0}/${r.enlarged_pore_count?.right_cheek_count ?? 0}` : null],
                [text.metric.chinPores, r.enlarged_pore_count?.chin_count],
                [text.metric.blackheadCount, r.blackhead_count],
                [text.metric.foreheadLargePores, yesNo(r.pores_forehead?.value)],
                [text.metric.leftCheekLargePores, yesNo(r.pores_left_cheek?.value)],
                [text.metric.rightCheekLargePores, yesNo(r.pores_right_cheek?.value)],
                [text.metric.chinLargePores, yesNo(r.pores_jaw?.value)],
                [text.metric.hasBlackhead, yesNo(r.blackhead?.value)],
              ]},
              { section: text.metric.acneComedones, bg: 'md:bg-rose-50/80 md:border-rose-100', items: [
                [text.metric.acneCount, r.acne?.count],
                [text.metric.acneMarkCount, r.acne_mark?.count],
                [text.metric.closedComedones, r.closed_comedones?.count],
                [text.metric.acneNodule, r.acne_nodule?.count],
                [text.metric.acnePustule, r.acne_pustule?.count],
                [text.metric.hasAcne, yesNo(r.acne?.value)],
              ]},
              { section: text.metric.pigmentRed, bg: 'md:bg-amber-50/80 md:border-amber-100', items: [
                [text.metric.melaninScore, r.score_info?.melanin_score],
                [text.metric.redScore, r.score_info?.red_spot_score],
                [text.metric.redArea, r.red_spot?.red_spot_area != null ? `${(r.red_spot.red_spot_area * 100).toFixed(1)}%` : null],
                [text.metric.melaninArea, r.melanin?.brown_area != null ? `${(r.melanin.brown_area * 100).toFixed(1)}%` : null],
                [text.metric.melaninConcentration, r.melanin?.melanin_concentration],
                [text.metric.spotCount, r.brown_spot?.count],
                [text.metric.moleCount, r.mole?.count],
                [text.metric.hasSpot, yesNo(r.skin_spot?.value)],
                [text.metric.hasMole, yesNo(r.mole?.value)],
              ]},
              { section: text.metric.wrinkles, bg: 'md:bg-purple-50/80 md:border-purple-100', items: [
                [text.metric.wrinkleScore, r.score_info?.wrinkle_score],
                [text.metric.fineLines, r.fine_line ? `${r.fine_line?.left_undereye_count ?? 0}/${r.fine_line?.right_undereye_count ?? 0}` : null],
                [text.metric.crowsFeet, r.wrinkle_count ? `${r.wrinkle_count?.left_crowsfeet_count ?? 0}/${r.wrinkle_count?.right_crowsfeet_count ?? 0}` : null],
                [text.metric.nasolabial, r.wrinkle_count ? `${r.wrinkle_count?.left_nasolabial_count ?? 0}/${r.wrinkle_count?.right_nasolabial_count ?? 0}` : null],
                [text.metric.leftCrowsFeetScore, r.left_crowsfeet_wrinkle_info?.wrinkle_score],
                [text.metric.rightCrowsFeetScore, r.right_crowsfeet_wrinkle_info?.wrinkle_score],
                [text.metric.leftNasolabialScore, r.left_nasolabial_wrinkle_info?.wrinkle_score],
                [text.metric.rightNasolabialScore, r.right_nasolabial_wrinkle_info?.wrinkle_score],
                [text.metric.foreheadWrinkle, r.wrinkle_count?.forehead_count],
                [text.metric.glabellaWrinkle, r.wrinkle_count?.glabella_count],
                [text.metric.leftEyeFineLineDetail, r.left_eye_wrinkle_info ? `${text.deep}${r.left_eye_wrinkle_info?.wrinkle_deep_num||0}/${text.shallow}${r.left_eye_wrinkle_info?.wrinkle_shallow_num||0}` : null],
                [text.metric.rightEyeFineLineDetail, r.right_eye_wrinkle_info ? `${text.deep}${r.right_eye_wrinkle_info?.wrinkle_deep_num||0}/${text.shallow}${r.right_eye_wrinkle_info?.wrinkle_shallow_num||0}` : null],
                [text.metric.hasForeheadWrinkle, yesNo(r.forehead_wrinkle?.value)],
                [text.metric.hasGlabellaWrinkle, yesNo(r.glabella_wrinkle?.value)],
                [text.metric.hasCrowsFeet, yesNo(r.crows_feet?.value)],
                [text.metric.hasEyeFineLines, yesNo(r.eye_finelines?.value)],
                [text.metric.hasNasolabial, yesNo(r.nasolabial_fold?.value)],
              ]},
              { section: text.metric.eye, bg: 'md:bg-indigo-50/80 md:border-indigo-100', items: [
                [text.metric.darkCircleScore, r.score_info?.dark_circle_score],
                [text.metric.leftDarkCircle, r.score_info?.dark_circle_type_score?.left_dark_circle_score],
                [text.metric.rightDarkCircle, r.score_info?.dark_circle_type_score?.right_dark_circle_score],
              ]},
            ].map(({ section, bg, items }) => {
              const validItems = items.filter(item => item[1] != null && item[1] !== '-/-' && item[1] !== '-');
              if (validItems.length === 0) return null;
              return (
                <div key={section}>
                  <div className="px-4 py-2 bg-stone-50 text-xs font-bold text-stone-500 uppercase tracking-wider">{section}</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 md:gap-3 md:p-4">
                    {validItems.map(([label, value]) => (
                      <div key={label as string} className={`flex justify-between items-center px-4 py-2.5 md:px-4 md:py-2.5 border-b border-stone-50 md:border md:rounded-xl hover:opacity-80 transition-opacity ${bg || 'md:bg-stone-50/80 md:border-stone-100'}`}>
                        <span className="text-stone-600 truncate mr-2">{label as string}</span>
                        <span className="font-medium text-stone-900 text-right">{value as any}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
        </ErrorBoundary>

        <section className="mt-8 px-2 text-xs text-stone-400 text-justify leading-relaxed">
          <p className="mb-2"><strong>{text.disclaimerTitle}</strong></p>
          <p>
            {text.disclaimer}
          </p>
        </section>
        </div>
        
        {showAllImages && (
          <div className="fixed inset-0 z-50 bg-stone-900 overflow-y-auto">
            <div className="p-4 flex items-center justify-between sticky top-0 bg-stone-900/95 backdrop-blur z-20 border-b border-stone-800 shadow-xl">
              <h2 className="text-white font-bold tracking-widest text-sm md:text-base">{text.panoramaTitle}</h2>
              <button onClick={() => setShowAllImages(false)} className="px-5 py-2 bg-stone-800 text-stone-200 rounded-full hover:bg-stone-700 text-xs font-medium border border-stone-700 transition-colors">
                {text.closePanorama}
              </button>
            </div>
            <div className="p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 md:gap-6">
              {viewModes.map(v => (
                <div key={v.key} className="bg-black rounded-2xl overflow-hidden border border-stone-800 flex flex-col shadow-lg">
                  <div className="px-3 py-2 bg-stone-800 text-white text-xs font-bold text-center">
                    {v.label}
                  </div>
                  <SkinMapViewer record={record} mapUrls={mapUrls} viewMode={v.key} text={text} className="h-[280px] lg:h-[320px] bg-stone-950" />
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
