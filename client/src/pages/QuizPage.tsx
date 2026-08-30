import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Sparkles, RefreshCcw, LogIn, ShoppingCart, Check, Gift, ClipboardList } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { useTranslation } from "react-i18next";
import { useAuthStore } from '../contexts/authStore';

type QuizOption = { label: string; value: string; desc: string };
type QuizQuestion = { id: string; question: string; options: QuizOption[] };

const QUIZ_COPY = {
  zh: {
    serviceTitle: '服务升级中',
    serviceBody: 'AI测肤功能暂未开放，敬请期待。',
    backHome: '返回首页',
    hubTitle: '选择您的测肤方式',
    hubBody: '我们提供深度问卷分析与 DermiVue 图像测肤技术，为您科学定制日常护肤方案。',
    photoTitle: 'DermiVue 智能AI皮肤测试',
    photoBody: '拍摄或上传您的面部照片，利用计算机视觉辅助分析毛孔、纹理与水油平衡等日常肌肤状态。',
    photoCtaLogin: '请先登录',
    photoCtaStart: '立即拍摄',
    questionnaireTitle: 'AI 深度问卷测肤',
    questionnaireBody: '通过一系列专业护肤问题，结合您的年龄、肤质与核心诉求，由 AI 顾问为您匹配适合的组合。',
    questionnaireCta: '开始问卷',
    loadingTitle: 'TRASOCHY AI 正在为您分析',
    loadingBody: '匹配专属日常护肤方案...',
    resultTitle: '为您定制的护肤方案',
    resultSignature: '— TRASOCHY AI 护肤顾问',
    resultBody: '基于您的肤质与核心诉求，我们的 AI 为您甄选了以下护肤组合，助力呵护肌肤健康状态。',
    topMatch: 'TOP 匹配',
    retest: '重新测试',
    dispatch: '分析中转站',
    questionProgress: (current: number, total: number) => `问题 ${current} / ${total}`,
    aiThinking: 'AI 正在思考追问...',
    needMore: '是否需要更精准的方案？',
    complete: '问卷已全部完成',
    partialText: (count: number) => `当前已完成 ${count} 道题目。您可以选择直接生成专属护肤方案，或者让 AI 护肤顾问对您的肌肤情况进行深入追问。`,
    completeText: '您已经完成了 10 道题目的深度测肤，AI 顾问已经完全掌握了您的肌肤档案！',
    askMore: (left: number) => `让 AI 动态追问 (还剩 ${left} 题)`,
    generateReport: '直接生成专属报告',
    questionFail: '抱歉，AI 追问失败，请直接生成报告。',
    questions: [
      {
        id: 'skin_type',
        question: '您的肤质属于哪一种？',
        options: [
          { label: '干性皮肤', value: 'dry', desc: '经常感到紧绷，容易脱皮' },
          { label: '油性皮肤', value: 'oily', desc: '全脸容易出油，毛孔粗大' },
          { label: '混合性皮肤', value: 'combination', desc: 'T区出油，U区偏干' },
          { label: '敏感性皮肤', value: 'sensitive', desc: '容易泛红、发痒、刺痛' },
        ],
      },
      {
        id: 'primary_concern',
        question: '您目前最主要的护肤诉求是什么？',
        options: [
          { label: '抗老紧致', value: 'anti-aging', desc: '淡化细纹，提升面部轮廓' },
          { label: '美白淡斑', value: 'brightening', desc: '改善暗沉，均匀肤色' },
          { label: '祛痘控油', value: 'acne', desc: '抑制痘痘，平衡水油' },
          { label: '补水保湿', value: 'hydrating', desc: '深层补水，强韧屏障' },
        ],
      },
      {
        id: 'age_group',
        question: '您的年龄段是？',
        options: [
          { label: '20岁以下', value: 'under-20', desc: '基础保湿防晒为主' },
          { label: '20 - 30岁', value: '20-30', desc: '初抗老，维持肌肤稳定' },
          { label: '30 - 40岁', value: '30-40', desc: '深度抗老，淡化干纹细纹' },
          { label: '40岁以上', value: 'over-40', desc: '全面提拉紧致，密集修护' },
        ],
      },
    ] as QuizQuestion[],
  },
  en: {
    serviceTitle: 'Service update in progress',
    serviceBody: 'The AI skin analysis feature is not available yet. Please stay tuned.',
    backHome: 'Back to home',
    hubTitle: 'Choose your skin analysis method',
    hubBody: 'Choose between a guided AI questionnaire and DermiVue image-based skin analysis for a tailored professional skincare plan.',
    photoTitle: 'DermiVue AI Skin Analysis',
    photoBody: 'Take or upload a facial photo. Advanced computer vision analyzes pores, fine lines, pigmentation, and deeper skin signals in moments.',
    photoCtaLogin: 'Please sign in first',
    photoCtaStart: 'Start photo analysis',
    questionnaireTitle: 'AI Deep Questionnaire',
    questionnaireBody: 'Answer professional skincare questions about your age, skin type, and concerns so the AI consultant can match the best routine.',
    questionnaireCta: 'Start questionnaire',
    loadingTitle: 'TRASOCHY AI is analyzing your skin',
    loadingBody: 'Matching professional skincare solutions...',
    resultTitle: 'Your personalized skincare plan',
    resultSignature: '— TRASOCHY AI Skincare Consultant',
    resultBody: 'Based on your skin type and core concerns, our AI has selected the following professional skincare combinations. Use consistently for 28 days and watch your skin renew.',
    topMatch: 'TOP MATCH',
    retest: 'Retake quiz',
    dispatch: 'Analysis checkpoint',
    questionProgress: (current: number, total: number) => `Question ${current} / ${total}`,
    aiThinking: 'AI is preparing a follow-up question...',
    needMore: 'Would you like a more precise plan?',
    complete: 'Questionnaire completed',
    partialText: (count: number) => `You have completed ${count} questions. You can generate your personalized plan now, or let the AI consultant ask a deeper follow-up question.`,
    completeText: 'You have completed 10 deep skin questions. The AI consultant has enough detail to create your skin profile.',
    askMore: (left: number) => `Let AI ask a follow-up (${left} left)`,
    generateReport: 'Generate personalized report',
    questionFail: 'Sorry, the AI follow-up failed. Please generate the report directly.',
    questions: [
      {
        id: 'skin_type',
        question: 'What is your skin type?',
        options: [
          { label: 'Dry skin', value: 'dry', desc: 'Often feels tight and may flake' },
          { label: 'Oily skin', value: 'oily', desc: 'Prone to shine and enlarged pores' },
          { label: 'Combination skin', value: 'combination', desc: 'Oily T-zone with drier cheeks' },
          { label: 'Sensitive skin', value: 'sensitive', desc: 'Prone to redness, itching, or stinging' },
        ],
      },
      {
        id: 'primary_concern',
        question: 'What is your main skincare concern right now?',
        options: [
          { label: 'Firming and anti-aging', value: 'anti-aging', desc: 'Reduce fine lines and refine facial contours' },
          { label: 'Brightening and spots', value: 'brightening', desc: 'Improve dullness and even out skin tone' },
          { label: 'Acne and oil control', value: 'acne', desc: 'Reduce breakouts and balance oil and moisture' },
          { label: 'Hydration', value: 'hydrating', desc: 'Deep hydration and stronger barrier support' },
        ],
      },
      {
        id: 'age_group',
        question: 'What is your age range?',
        options: [
          { label: 'Under 20', value: 'under-20', desc: 'Focus on hydration and sun protection' },
          { label: '20 - 30', value: '20-30', desc: 'Early anti-aging and skin stability' },
          { label: '30 - 40', value: '30-40', desc: 'Deeper anti-aging and fine-line care' },
          { label: 'Over 40', value: 'over-40', desc: 'Firming, lifting, and intensive repair' },
        ],
      },
    ] as QuizQuestion[],
  },
  de: {
    serviceTitle: 'Service wird aktualisiert',
    serviceBody: 'Die AI-Hautanalyse ist noch nicht verfugbar. Bitte schauen Sie bald wieder vorbei.',
    backHome: 'Zur Startseite',
    hubTitle: 'Wahlen Sie Ihre Hautanalyse',
    hubBody: 'Wahlen Sie zwischen einem gefuhrten AI-Fragebogen und der DermiVue Bildanalyse fur einen personalisierten professionellen Pflegeplan.',
    photoTitle: 'DermiVue AI-Hautanalyse',
    photoBody: 'Nehmen Sie ein Gesichtsfoto auf oder laden Sie es hoch. Moderne Computer-Vision analysiert Poren, feine Linien, Pigmentierung und weitere Hautsignale.',
    photoCtaLogin: 'Bitte zuerst anmelden',
    photoCtaStart: 'Fotoanalyse starten',
    questionnaireTitle: 'AI-Tiefenfragebogen',
    questionnaireBody: 'Beantworten Sie professionelle Fragen zu Alter, Hauttyp und Anliegen, damit der AI-Berater die passende Routine auswahlen kann.',
    questionnaireCta: 'Fragebogen starten',
    loadingTitle: 'TRASOCHY AI analysiert Ihre Haut',
    loadingBody: 'Professionelle Hautpflegelosungen werden abgeglichen...',
    resultTitle: 'Ihr personalisierter Hautpflegeplan',
    resultSignature: '— TRASOCHY AI Hautpflegeberater',
    resultBody: 'Basierend auf Ihrem Hauttyp und Ihren wichtigsten Anliegen hat unsere AI die folgenden professionellen Pflegekombinationen ausgewahlt. Nutzen Sie sie konsequent 28 Tage lang.',
    topMatch: 'TOP-TREFFER',
    retest: 'Erneut testen',
    dispatch: 'Analyse-Zwischenstation',
    questionProgress: (current: number, total: number) => `Frage ${current} / ${total}`,
    aiThinking: 'AI bereitet eine Folgefrage vor...',
    needMore: 'Mochten Sie einen praziseren Plan?',
    complete: 'Fragebogen abgeschlossen',
    partialText: (count: number) => `Sie haben ${count} Fragen beantwortet. Sie konnen jetzt Ihren personlichen Plan erstellen oder die AI eine vertiefende Folgefrage stellen lassen.`,
    completeText: 'Sie haben 10 tiefe Hautfragen beantwortet. Der AI-Berater hat genug Details fur Ihr Hautprofil.',
    askMore: (left: number) => `AI-Folgefrage stellen (${left} ubrig)`,
    generateReport: 'Personlichen Bericht erstellen',
    questionFail: 'Die AI-Folgefrage konnte nicht erstellt werden. Bitte erstellen Sie den Bericht direkt.',
    questions: [
      {
        id: 'skin_type',
        question: 'Welcher Hauttyp trifft auf Sie zu?',
        options: [
          { label: 'Trockene Haut', value: 'dry', desc: 'Fuhlt sich oft gespannt an und schuppt leicht' },
          { label: 'Olige Haut', value: 'oily', desc: 'Neigt zu Glanz und vergrosserten Poren' },
          { label: 'Mischhaut', value: 'combination', desc: 'Olige T-Zone, trockenere Wangen' },
          { label: 'Empfindliche Haut', value: 'sensitive', desc: 'Neigt zu Rotungen, Juckreiz oder Brennen' },
        ],
      },
      {
        id: 'primary_concern',
        question: 'Was ist derzeit Ihr wichtigstes Hautpflegeanliegen?',
        options: [
          { label: 'Straffung und Anti-Aging', value: 'anti-aging', desc: 'Feine Linien mildern und Konturen verbessern' },
          { label: 'Aufhellung und Pigmentflecken', value: 'brightening', desc: 'Fahlen Teint verbessern und Hautton ausgleichen' },
          { label: 'Akne und Oligkeit', value: 'acne', desc: 'Unreinheiten reduzieren und die Haut balancieren' },
          { label: 'Feuchtigkeit', value: 'hydrating', desc: 'Tiefe Feuchtigkeit und starke Hautbarriere' },
        ],
      },
      {
        id: 'age_group',
        question: 'In welcher Altersgruppe sind Sie?',
        options: [
          { label: 'Unter 20', value: 'under-20', desc: 'Feuchtigkeit und Sonnenschutz im Fokus' },
          { label: '20 - 30', value: '20-30', desc: 'Fruhe Anti-Aging-Pflege und Hautstabilitat' },
          { label: '30 - 40', value: '30-40', desc: 'Intensivere Anti-Aging- und Linienpflege' },
          { label: 'Uber 40', value: 'over-40', desc: 'Straffung, Lifting und intensive Reparatur' },
        ],
      },
    ] as QuizQuestion[],
  },
};

function getQuizLanguage(language?: string): 'zh' | 'en' | 'de' {
  const base = (language || 'zh').split('-')[0].toLowerCase();
  return base === 'en' || base === 'de' ? base : 'zh';
}



export default function QuizPage() {
  const { i18n } = useTranslation();
  const { user } = useAuthStore();
  const language = getQuizLanguage(i18n.resolvedLanguage || i18n.language);
  const copy = QUIZ_COPY[language];
  const navigate = useNavigate();
  const [quizMode, setQuizMode] = useState<'hub' | 'questionnaire'>('hub');
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [guardianLetter, setGuardianLetter] = useState<string>('');
  const [dynamicQuestions, setDynamicQuestions] = useState<any[]>([]);
  const [fetchingQuestion, setFetchingQuestion] = useState(false);
  const [addingToCart, setAddingToCart] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);
  // DermiVue 图像测肤结果（融合进 AI 问卷分析）
  const [skinResult, setSkinResult] = useState<any>(null);

  // 全局设置
  const [settings, setSettings] = useState<any>({});
  const [settingsLoading, setSettingsLoading] = useState(true);

  // 解析后台配置的固定题目，若无则使用内置兜底题目
  let customQuestions: QuizQuestion[] | null = null;
  const rawCustomQ = settings[`quiz_questions_${language}`];
  if (rawCustomQ) {
    try {
      const parsed = typeof rawCustomQ === 'string' ? JSON.parse(rawCustomQ) : rawCustomQ;
      if (Array.isArray(parsed) && parsed.length > 0) customQuestions = parsed;
    } catch (e) {}
  }
  const QUESTIONS = customQuestions || copy.questions;
  const allQuestions = [...QUESTIONS, ...dynamicQuestions];
  const maxDynamic = settings.quiz_max_dynamic_questions !== undefined ? Number(settings.quiz_max_dynamic_questions) : 7;
  const maxAllowedTotal = QUESTIONS.length + maxDynamic;

  
  useEffect(() => {
    // 读取 DermiVue 图像测肤结果（sessionStorage）
    const raw = sessionStorage.getItem('skin_analysis_result');
    if (raw) {
      try { setSkinResult(JSON.parse(raw)); } catch (e) {}
    }
    api.get('/settings').then(res => {
      setSettings(res as any);
      // 未开启图像测肤，直接进入问卷
      if ((res as any).feature_skin_analysis !== '1') {
        setQuizMode('questionnaire');
      } else {
        // 带着图像结果进入（step=questionnaire）则直接进入问卷
        const step = new URLSearchParams(window.location.search).get('step');
        if (step === 'questionnaire' && sessionStorage.getItem('skin_analysis_result')) {
          setQuizMode('questionnaire');
        }
      }
      setSettingsLoading(false);
    });
  }, []);

  const handleSelect = (questionId: string, value: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
    if (currentStep < allQuestions.length) {
      setTimeout(() => setCurrentStep(curr => curr + 1), 300);
    }
  };

  const fetchNextQuestion = async () => {
    setFetchingQuestion(true);
    try {
      const history = allQuestions.map(q => {
        const ansValue = answers[q.id];
        const ansLabel = q.options.find((o: any) => o.value === ansValue)?.label || ansValue;
        return { question: q.question, answer: ansLabel };
      });
      const newQuestion = await api.post('/ai/generate-question', { history, language });
      setDynamicQuestions(prev => [...prev, newQuestion]);
      // currentStep will naturally point to the new question since length increased
    } catch (err) {
      console.error(err);
      alert(copy.questionFail);
    }
    setFetchingQuestion(false);
  };

  const submitQuiz = async (finalAnswers: Record<string, string>) => {
    setLoading(true);
    try {
      const customDetailsList = dynamicQuestions.map(q => {
        const ansValue = finalAnswers[q.id];
        const ansLabel = q.options.find((o: any) => o.value === ansValue)?.label || ansValue;
        return `Q: ${q.question} A: ${ansLabel}`;
      });

      const res: any = await api.post('/ai/analyze', { 
        answers: { ...finalAnswers, customDetails: customDetailsList },
        language,
        skinAnalysis: skinResult,
      });
      setResults(res.products || []);
      setGuardianLetter(res.guardian_letter || '');
      setLoading(false);

    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const resetQuiz = () => {
    setCurrentStep(0);
    setAnswers({});
    setResults([]);
    setGuardianLetter('');
    setDynamicQuestions([]);
  };

  if (settingsLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center bg-[#faf9f8]">
        <div className="relative w-24 h-24 mb-8">
          <div className="absolute inset-0 border-4 border-rose-100 rounded-full animate-ping"></div>
          <div className="absolute inset-2 bg-rose-500 rounded-full flex items-center justify-center animate-pulse">
            <Sparkles className="text-white w-8 h-8" />
          </div>
        </div>
      </div>
    );
  }

  if (settings.feature_ai_quiz !== '1') {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-serif text-stone-800 mb-2">{copy.serviceTitle}</h2>
          <p className="text-stone-500">{copy.serviceBody}</p>
          <button onClick={() => navigate('/')} className="mt-6 px-6 py-2 bg-stone-900 text-white rounded-full">{copy.backHome}</button>
        </div>
      </div>
    );
  }

  // 测肤流程引导页（先 DermiVue 图像测肤，再 AI 深度问卷）
  if (quizMode === 'hub' && settings.feature_skin_analysis === '1') {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center bg-[#faf9f8] px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-serif text-stone-900 mb-4">您的专属测肤之旅</h1>
          <p className="text-stone-500 max-w-lg mx-auto">
            两步完成精准测肤：先用 DermiVue 图像技术客观检测肌肤，再完成 AI 深度问卷，获取融合定制的专属日常护肤方案。
          </p>
        </div>

        <div className="max-w-md w-full space-y-4">
          {/* 第一步：DermiVue 图像测肤 */}
          <div className={`rounded-3xl p-6 border-2 transition-all ${skinResult ? 'border-emerald-300 bg-emerald-50/40' : 'border-stone-200 bg-white'}`}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-stone-900 text-white flex items-center justify-center text-sm font-bold shrink-0">1</div>
              <h2 className="text-xl font-serif text-stone-900">{copy.photoTitle}</h2>
            </div>
            <p className="text-stone-500 text-sm mb-5">{copy.photoBody}</p>
            {skinResult ? (
              <button onClick={() => navigate('/skin-analysis')} className="w-full py-3 rounded-full border-2 border-stone-900 text-stone-900 font-medium hover:bg-stone-50 transition-colors">
                已完成 ✓ 重新拍摄
              </button>
            ) : (
              <button onClick={() => navigate('/skin-analysis')} className="w-full py-3 rounded-full bg-stone-900 text-white font-medium hover:bg-stone-800 transition-colors">
                开始图像测肤
              </button>
            )}
          </div>

          {/* 第二步：AI 深度问卷 */}
          <div className={`rounded-3xl p-6 border-2 transition-all ${skinResult ? 'border-stone-200 bg-white' : 'border-stone-200 bg-white opacity-60'}`}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-stone-900 text-white flex items-center justify-center text-sm font-bold shrink-0">2</div>
              <h2 className="text-xl font-serif text-stone-900">{copy.questionnaireTitle}</h2>
            </div>
            <p className="text-stone-500 text-sm mb-5">{copy.questionnaireBody}</p>
            {skinResult ? (
              <button onClick={() => setQuizMode('questionnaire')} className="w-full py-3 rounded-full bg-stone-900 text-white font-medium hover:bg-stone-800 transition-colors">
                开始问卷测肤
              </button>
            ) : (
              <div className="w-full py-3 rounded-full bg-stone-100 text-stone-400 font-medium text-center">
                请先完成第一步图像测肤
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center bg-[#faf9f8]">
        <div className="relative w-24 h-24 mb-8">
          <div className="absolute inset-0 border-4 border-rose-100 rounded-full animate-ping"></div>
          <div className="absolute inset-2 bg-rose-500 rounded-full flex items-center justify-center animate-pulse">
            <Sparkles className="text-white w-8 h-8" />
          </div>
        </div>
        <h2 className="text-2xl font-serif text-stone-800 mb-2">{copy.loadingTitle}</h2>
        <p className="text-stone-500 text-sm">{copy.loadingBody}</p>
      </div>
    );
  }

  if (results.length > 0) {
    // 强制登录控制
    if (settings.quiz_require_login_for_result === '1' && !user) {
      return (
        <div className="max-w-md mx-auto px-4 py-20 text-center">
          <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <Sparkles className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-serif text-stone-900 mb-3">您的专属护肤方案已就绪</h2>
          <p className="text-stone-500 text-sm mb-8 leading-relaxed">
            AI 护肤顾问已完成对您肤质与诉求的深度解析。请登录或注册账号后查看量身定制的护肤方案与专属守护信。
          </p>
          <button
            onClick={() => navigate('/login')}
            className="w-full py-3.5 bg-stone-900 text-white rounded-full font-medium hover:bg-stone-800 transition-colors flex items-center justify-center gap-2 shadow-lg"
          >
            <LogIn size={16} /> 登录以查看我的方案
          </button>
        </div>
      );
    }

    return (
      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-serif text-stone-900 mb-4">{copy.resultTitle}</h1>
          {guardianLetter ? (
            <div className="bg-rose-50/50 p-8 rounded-3xl border border-rose-100 mb-12 text-left max-w-3xl mx-auto relative">
              <div className="absolute top-4 left-4 text-rose-200">
                <Sparkles className="w-8 h-8 opacity-50" />
              </div>
              <p className="text-stone-700 leading-relaxed font-serif text-lg indent-8 whitespace-pre-wrap relative z-10">
                {guardianLetter}
              </p>
              <div className="text-right mt-6 text-rose-400 font-serif text-sm">
                {copy.resultSignature}
              </div>
            </div>
          ) : (
            <p className="text-stone-500 max-w-2xl mx-auto">
              {copy.resultBody}
            </p>
          )}
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {results.map((product, idx) => (
            <div key={product.id} className="bg-white p-6 rounded-2xl shadow-sm border border-rose-50 hover:shadow-xl transition-shadow cursor-pointer relative overflow-hidden group" onClick={() => navigate(`/products/${product.slug}`)}>
              {idx === 0 && (
                <div className="absolute top-0 left-0 bg-rose-500 text-white text-[10px] px-3 py-1 font-bold tracking-wider rounded-br-xl z-10">
                  {copy.topMatch}
                </div>
              )}
              <div className="aspect-square rounded-xl overflow-hidden mb-6 bg-stone-50">
                <img src={product.main_image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
              </div>
              <h3 className="font-serif text-lg text-stone-900 mb-2">{product.name}</h3>
              <p className="text-stone-500 text-xs line-clamp-2 mb-4">{product.description}</p>
              <div className="flex items-center justify-between mt-auto">
                <span className="text-rose-600 font-medium">¥{product.base_price.toFixed(2)}</span>
                <span className="w-8 h-8 rounded-full bg-stone-900 text-white flex items-center justify-center group-hover:bg-rose-500 transition-colors">
                  <ChevronRight size={16} />
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* 一键加购与前往问卷调查领券 */}
        <div className="mt-12 max-w-lg mx-auto space-y-4">
          <button
            type="button"
            disabled={addingToCart}
            onClick={async () => {
              if (!user) {
                toast.error('请先登录后再加购');
                navigate('/login?redirect=/quiz');
                return;
              }
              if (!results || results.length === 0) return;
              setAddingToCart(true);
              try {
                for (const p of results) {
                  await api.post('/cart', { productId: p.id, quantity: 1 });
                }
                setAddedToCart(true);
                toast.success('已将 AI 推荐方案全部加入购物车！');
              } catch (e: any) {
                toast.error('加购失败: ' + (e?.message || '未知错误'));
              } finally {
                setAddingToCart(false);
              }
            }}
            className={`w-full py-3.5 px-6 rounded-xl font-medium text-xs tracking-wider transition-all flex items-center justify-center gap-2 shadow-sm ${
              addedToCart 
                ? 'bg-emerald-600 text-white'
                : 'bg-stone-900 hover:bg-stone-800 text-white'
            }`}
          >
            {addedToCart ? (
              <>
                <Check size={16} /> 已全部加入购物车
              </>
            ) : (
              <>
                <ShoppingCart size={16} /> {addingToCart ? '正在加入购物车...' : '一键将 AI 推荐方案加入购物车'}
              </>
            )}
          </button>

          <button
            onClick={() => navigate('/survey')}
            className="w-full py-4 bg-gradient-to-r from-rose-500 to-rose-600 text-white rounded-xl font-bold text-xs hover:from-rose-600 hover:to-rose-700 transition-all flex items-center justify-center gap-2 tracking-widest shadow-lg"
          >
            <Gift size={16} /> 完成调研问卷，领取专属代金券 <ChevronRight size={16} />
          </button>
        </div>

        {/* AI 测肤与推荐合规免责声明 */}
        <div className="mt-8 bg-stone-50 border border-stone-200/80 rounded-2xl p-4 text-[11px] text-stone-500 leading-relaxed text-left max-w-lg mx-auto space-y-1">
          <p className="font-semibold text-stone-700">⚠️【AI 测肤与推荐免责声明】</p>
          <p>
            本功能提供的肤质分析、状态评估与产品推荐仅基于用户输入或图像特征生成的<b>日常个人护理建议</b>，不属于医疗诊断行为，不构成任何医疗诊断结论、处方或疾病治疗方案。若您的皮肤存在红肿、破损、过敏或病理症状，请务必咨询专业皮肤科医师或前往正规医疗机构就诊。
          </p>
        </div>

        <div className="mt-6 text-center">
          <button onClick={resetQuiz} className="inline-flex items-center gap-2 text-stone-400 hover:text-stone-700 text-xs transition-colors">
            <RefreshCcw size={14} /> {copy.retest}
          </button>
        </div>
      </div>
    );
  }

  const isDispatchStep = currentStep === allQuestions.length;
  const question = isDispatchStep ? null : allQuestions[currentStep];

  return (
    <div className="min-h-[80vh] bg-[#faf9f8] flex flex-col pt-12">
      <div className="max-w-2xl mx-auto w-full px-4 flex-1 flex flex-col">
        {/* Progress */}
        <div className="mb-12">
          <div className="flex justify-between text-xs text-stone-400 mb-2">
            <span>{isDispatchStep ? copy.dispatch : copy.questionProgress(currentStep + 1, Math.max(maxAllowedTotal, allQuestions.length))}</span>
            <span>{isDispatchStep && allQuestions.length >= maxAllowedTotal ? '100%' : `${Math.round(((currentStep + 1) / Math.max(1, maxAllowedTotal)) * 100)}%`}</span>
          </div>
          <div className="h-1 bg-stone-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-stone-900 transition-all duration-500 ease-out"
              style={{ width: isDispatchStep && allQuestions.length >= maxAllowedTotal ? '100%' : `${((currentStep + 1) / Math.max(1, maxAllowedTotal)) * 100}%` }}
            />
          </div>
        </div>

        {/* Question */}
        {isDispatchStep ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            {fetchingQuestion ? (
              <div className="py-12">
                <div className="relative w-16 h-16 mx-auto mb-6">
                  <div className="absolute inset-0 border-4 border-stone-100 rounded-full animate-ping"></div>
                  <div className="absolute inset-2 bg-stone-900 rounded-full flex items-center justify-center animate-pulse">
                    <Sparkles className="text-white w-5 h-5" />
                  </div>
                </div>
                <h3 className="text-xl font-serif text-stone-800">{copy.aiThinking}</h3>
              </div>
            ) : (
              <>
                <h2 className="text-3xl md:text-4xl font-serif text-stone-900 mb-6">
                  {allQuestions.length < maxAllowedTotal && maxDynamic > 0 ? copy.needMore : copy.complete}
                </h2>
                <p className="text-stone-500 mb-12 max-w-lg mx-auto">
                  {allQuestions.length < maxAllowedTotal && maxDynamic > 0
                    ? copy.partialText(allQuestions.length)
                    : copy.completeText
                  }
                </p>

                <div className="flex flex-col gap-4 w-full max-w-md">
                  {allQuestions.length < maxAllowedTotal && maxDynamic > 0 && (
                    <button
                      onClick={fetchNextQuestion}
                      className="w-full py-4 bg-white border-2 border-stone-900 text-stone-900 rounded-full font-medium hover:bg-stone-50 transition-colors flex items-center justify-center gap-2"
                    >
                      <Sparkles size={18} /> {copy.askMore(maxAllowedTotal - allQuestions.length)}
                    </button>
                  )}
                  <button
                    onClick={() => submitQuiz(answers)}
                    className="w-full py-4 bg-stone-900 text-white rounded-full font-medium hover:bg-stone-800 transition-colors tracking-widest shadow-lg"
                  >
                    {copy.generateReport}
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="flex-1">
          <h2 className="text-3xl md:text-4xl font-serif text-stone-900 mb-10 text-center">
            {question?.question}
          </h2>

          <div className="space-y-4">
            {question?.options.map((opt: any) => {
              const isSelected = answers[question.id] === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => handleSelect(question.id, opt.value)}
                  className={`w-full p-6 text-left rounded-2xl border-2 transition-all duration-300 flex items-center justify-between group
                    ${isSelected ? 'border-stone-900 bg-white shadow-md' : 'border-stone-200 bg-white/50 hover:border-stone-300 hover:bg-white'}
                  `}
                >
                  <div>
                    <h3 className={`text-lg font-medium mb-1 ${isSelected ? 'text-stone-900' : 'text-stone-700'}`}>
                      {opt.label}
                    </h3>
                    <p className={`text-sm ${isSelected ? 'text-stone-600' : 'text-stone-400'}`}>
                      {opt.desc}
                    </p>
                  </div>
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors
                    ${isSelected ? 'border-stone-900 bg-stone-900' : 'border-stone-300 group-hover:border-stone-400'}
                  `}>
                    {isSelected && <div className="w-2 h-2 bg-white rounded-full" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
        )}
      </div>
    </div>
  );
}
