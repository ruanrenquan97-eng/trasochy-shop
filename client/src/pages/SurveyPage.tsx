import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Gift, Copy, CheckCheck, ChevronRight, Send, Sparkles, ClipboardList, FlaskConical } from 'lucide-react';
import api from '../utils/api';
import { useAuthStore } from '../contexts/authStore';
import toast from 'react-hot-toast';

type SurveyQuestion = {
  id: string;
  text: string;
  type: 'single' | 'likert' | 'text';
  options?: string[];
  required: boolean;
};

type SurveySection = {
  title: string;
  intro?: string;
  questions: SurveyQuestion[];
};

const LIKERT_LABELS = ['非常不同意', '不同意', '有点不同意', '既不同意也不反对', '有点同意', '同意', '非常同意'];

// 非AI组 默认21题
const NON_AI_SECTIONS: SurveySection[] = [
  {
    title: 'A. 筛选与实验确认',
    intro: '若年龄不在18–28岁范围内，或不符合研究筛选条件，请按照网站提示结束流程。',
    questions: [
      { id: 'q1', type: 'single', required: true, text: '1. 您的年龄是？', options: ['18–20岁', '21–24岁', '25–28岁', '29岁或以上'] },
      { id: 'q2', type: 'single', required: true, text: '2. 您目前居住在哪个国家或地区？', options: ['中国', '瑞士', '其他'] },
      { id: 'q3', type: 'single', required: true, text: '3. 您是否有网上购物经验？', options: ['是', '否'] },
      { id: 'q4', type: 'single', required: true, text: '4. 在刚才的购物过程中，平台是否向您提供了基于人工智能（AI）的个性化产品推荐？', options: ['是', '否', '不确定'] },
    ],
  },
  {
    title: 'B. 决策疲劳',
    intro: '遇到评分题时，请选择一个数字（1=非常不同意 ~ 7=非常同意）：',
    questions: [
      { id: 'q5', type: 'likert', required: true, text: '5. 作出最终产品选择时，我感到精神疲惫。' },
      { id: 'q6', type: 'likert', required: true, text: '6. 选择产品需要我投入很多脑力。' },
      { id: 'q7', type: 'likert', required: true, text: '7. 我被需要处理的信息量压得喘不过气。' },
      { id: 'q8', type: 'likert', required: true, text: '8. 我很难作出最终决定。' },
    ],
  },
  {
    title: 'C. 认知负荷',
    questions: [
      { id: 'q9', type: 'likert', required: true, text: '9. 完成这项购物任务需要我投入大量注意力。' },
      { id: 'q10', type: 'likert', required: true, text: '10. 我需要同时考虑很多不同的信息。' },
      { id: 'q11', type: 'likert', required: true, text: '11. 整个产品选择过程对我来说很复杂。' },
    ],
  },
  {
    title: 'D. 对平台的信任',
    questions: [
      { id: 'q12', type: 'likert', required: true, text: '12. 我信任该平台提供的产品信息。' },
      { id: 'q13', type: 'likert', required: true, text: '13. 我认为该平台是可靠的。' },
      { id: 'q14', type: 'likert', required: true, text: '14. 平台提供的信息与我的购物需求相关。' },
    ],
  },
  {
    title: 'E. 购买意愿',
    questions: [
      { id: 'q15', type: 'likert', required: true, text: '15. 我会考虑购买我最终选择的产品。' },
      { id: 'q16', type: 'likert', required: true, text: '16. 如果这是真实的购物情境，我购买该产品的可能性较高。' },
      { id: 'q17', type: 'likert', required: true, text: '17. 这次购物体验提高了我的购买意愿。' },
    ],
  },
  {
    title: 'F. 选择信心',
    questions: [
      { id: 'q18', type: 'likert', required: true, text: '18. 我对自己最终作出的产品选择有信心。' },
    ],
  },
  {
    title: 'G. 使用背景与反馈',
    questions: [
      { id: 'q19', type: 'single', required: true, text: '19. 在参加本研究以前，您使用ChatGPT或其他AI助手的频率是？', options: ['从未使用', '偶尔使用', '经常使用', '每天使用'] },
      { id: 'q20', type: 'single', required: true, text: '20. 您在刚才的购物过程中是否遇到技术问题？', options: ['没有', '页面加载缓慢', '产品信息无法正常显示', '其他'] },
      { id: 'q21', type: 'text', required: false, text: '21. 在购物过程中，哪一部分最帮助或阻碍您作出最终选择？为什么？' },
    ],
  },
];

// AI组 默认26题
const AI_SECTIONS: SurveySection[] = [
  {
    title: 'A. 筛选与实验确认',
    intro: '若年龄不在18–28岁范围内，或不符合研究筛选条件，请按照网站提示结束流程。',
    questions: [
      { id: 'q1', type: 'single', required: true, text: '1. 您的年龄是？', options: ['18–20岁', '21–24岁', '25–28岁', '29岁或以上'] },
      { id: 'q2', type: 'single', required: true, text: '2. 您目前居住在哪个国家或地区？', options: ['中国', '瑞士', '其他'] },
      { id: 'q3', type: 'single', required: true, text: '3. 您是否有网上购物经验？', options: ['是', '否'] },
      { id: 'q4', type: 'single', required: true, text: '4. 在刚才的购物过程中，平台是否向您提供了基于人工智能（AI）的个性化产品推荐？', options: ['是', '否', '不确定'] },
    ],
  },
  {
    title: 'B. 决策疲劳',
    intro: '遇到评分题时，请选择一个数字（1=非常不同意 ~ 7=非常同意）：',
    questions: [
      { id: 'q5', type: 'likert', required: true, text: '5. 作出最终产品选择时，我感到精神疲惫。' },
      { id: 'q6', type: 'likert', required: true, text: '6. 选择产品需要我投入很多脑力。' },
      { id: 'q7', type: 'likert', required: true, text: '7. 我被需要处理的信息量压得喘不过气。' },
      { id: 'q8', type: 'likert', required: true, text: '8. 我很难作出最终决定。' },
    ],
  },
  {
    title: 'C. 认知负荷',
    questions: [
      { id: 'q9', type: 'likert', required: true, text: '9. 完成这项购物任务需要我投入大量注意力。' },
      { id: 'q10', type: 'likert', required: true, text: '10. 我需要同时考虑很多不同的信息。' },
      { id: 'q11', type: 'likert', required: true, text: '11. 整个产品选择过程对我来说很复杂。' },
    ],
  },
  {
    title: 'D. 对平台的信任',
    questions: [
      { id: 'q12', type: 'likert', required: true, text: '12. 我信任该平台提供的产品信息。' },
      { id: 'q13', type: 'likert', required: true, text: '13. 我认为该平台是可靠的。' },
      { id: 'q14', type: 'likert', required: true, text: '14. 平台提供的信息与我的购物需求相关。' },
    ],
  },
  {
    title: 'E. 购买意愿',
    questions: [
      { id: 'q15', type: 'likert', required: true, text: '15. 我会考虑购买我最终选择的产品。' },
      { id: 'q16', type: 'likert', required: true, text: '16. 如果这是真实的购物情境，我购买该产品的可能性较高。' },
      { id: 'q17', type: 'likert', required: true, text: '17. 这次购物体验提高了我的购买意愿。' },
    ],
  },
  {
    title: 'F. 选择信心',
    questions: [
      { id: 'q18', type: 'likert', required: true, text: '18. 我对自己最终作出的产品选择有信心。' },
    ],
  },
  {
    title: 'G. 使用背景与反馈',
    questions: [
      { id: 'q19', type: 'single', required: true, text: '19. 在参加本研究以前，您使用ChatGPT或其他AI助手的频率是？', options: ['从未使用', '偶尔使用', '经常使用', '每天使用'] },
      { id: 'q20', type: 'single', required: true, text: '20. 您在刚才的购物过程中是否遇到技术问题？', options: ['没有', '页面加载缓慢', 'AI测试或推荐无法正常使用', '产品信息无法正常显示', '其他'] },
    ],
  },
  {
    title: 'H. AI 使用体验（仅AI组）',
    questions: [
      { id: 'q21', type: 'likert', required: true, text: '21. AI推荐符合我的个人需求。' },
      { id: 'q22', type: 'likert', required: true, text: '22. AI推荐的产品与我的皮肤状况相关。' },
      { id: 'q23', type: 'likert', required: true, text: '23. 我信任AI提供的推荐。' },
      { id: 'q24', type: 'likert', required: true, text: '24. AI减少了我手动比较产品的工作。' },
      { id: 'q25', type: 'single', required: true, text: '25. 您最终选择的产品是否来自AI推荐结果？', options: ['是', '否', '不确定'] },
    ],
  },
  {
    title: 'I. 开放反馈',
    questions: [
      { id: 'q26', type: 'text', required: false, text: '26. 在购物过程中，哪一部分最帮助或阻碍您作出最终选择？为什么？' },
    ],
  },
];

export default function SurveyPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [pathType] = useState<string>(() => {
    return sessionStorage.getItem('experiment_path') || localStorage.getItem('experiment_path') || 'traditional_search';
  });

  const [sections, setSections] = useState<SurveySection[]>(() => {
    return pathType === 'ai_assisted' ? AI_SECTIONS : NON_AI_SECTIONS;
  });

  const [surveyInfo, setSurveyInfo] = useState<{ title: string; subtitle?: string; description?: string }>({
    title: pathType === 'ai_assisted' ? '线上护肤品购物体验研究 · AI组' : '线上护肤品购物体验研究 · 非AI组',
    subtitle: pathType === 'ai_assisted' ? '正式调查问卷 · AI组 (26题)' : '正式调查问卷 · 非AI组 (21题)',
    description: pathType === 'ai_assisted'
      ? '感谢您参与本研究。请只根据您刚刚完成的购物体验作答。问卷没有标准答案，请选择最符合真实感受的选项。预计填写时间约3–5分钟。\n本问卷仅用于学术研究，数据以匿名编号保存。您可以在提交前随时退出。\n购物任务：请在预算不超过人民币300元的情况下，从网站提供的同类护肤产品中，最终只选择一款您最愿意购买的产品。本组可以使用AI测肤和个性化推荐；无需真实付款。'
      : '感谢您参与本研究。请只根据您刚刚完成的购物体验作答。问卷没有标准答案，请选择最符合真实感受的选项。预计填写时间约3–5分钟。\n本问卷仅用于学术研究，数据以匿名编号保存。您可以在提交前随时退出。\n购物任务：请在预算不超过人民币300元的情况下，从网站提供的同类护肤产品中，最终只选择一款您最愿意购买的产品。本组不提供AI测肤或AI个性化推荐；无需真实付款。'
  });
  const [answers, setAnswers] = useState<Record<string, string | number>>({});
  const [otherText, setOtherText] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [coupon, setCoupon] = useState<any>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [cartCount, setCartCount] = useState<number>(0);

  useEffect(() => {
    // 获取购物车商品件数
    api.get('/cart').then((res: any) => {
      setCartCount(res?.count || 0);
    }).catch(() => {});

    // 获取对应组别的问卷定义
    api.get(`/survey/questions?path_type=${pathType}`).then((res: any) => {
      if (res?.survey?.sections && Array.isArray(res.survey.sections)) {
        setSections(res.survey.sections);
        setSurveyInfo({
          title: res.survey.title || (pathType === 'ai_assisted' ? '线上护肤品购物体验研究 · AI组' : '线上护肤品购物体验研究 · 非AI组'),
          subtitle: res.survey.subtitle || (pathType === 'ai_assisted' ? '正式调查问卷 · AI组 (26题)' : '正式调查问卷 · 非AI组 (21题)'),
          description: res.survey.description || ''
        });
      }
    }).catch(() => {});
  }, [pathType]);

  const allQuestions = sections.flatMap((s) => s.questions || []);
  const requiredQuestions = allQuestions.filter((q) => q.required);
  const answeredCount = requiredQuestions.filter((q) => answers[q.id] !== undefined && answers[q.id] !== '').length;

  const setAnswer = (id: string, value: string | number) => {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async () => {
    if (!user) {
      toast.error('完成问卷后系统将为您发放专属代金券，请先登录/注册账号');
      navigate('/login?redirect=/survey');
      return;
    }

    const missing = requiredQuestions.filter((q) => answers[q.id] === undefined || answers[q.id] === '');
    if (missing.length > 0) {
      toast.error(`还有 ${missing.length} 道必答题未作答`);
      document.getElementById(missing[0].id)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    // 格式化 answers（若选择其他，附带自定义文本）
    const finalAnswers: Record<string, any> = { ...answers };
    Object.entries(otherText).forEach(([qId, txt]) => {
      if (txt && finalAnswers[qId] === '其他') {
        finalAnswers[qId] = `其他：${txt}`;
      }
    });

    setSubmitting(true);
    const sessionId = localStorage.getItem('session_id') || '';
    try {
      const res: any = await api.post('/survey/submit', { 
        answers: finalAnswers,
        path_type: pathType,
        cart_items_count: cartCount,
        session_id: sessionId,
        metadata: {
          submitted_at: new Date().toISOString(),
          path: pathType,
          session_id: sessionId,
          user_id: user.id,
          username: user.username || user.name
        }
      });
      setSubmitted(true);

      // 如果接口直接返回了发放的代金券，则直接设置展示
      if (res?.coupon) {
        setCoupon(res.coupon);
      } else {
        // 尝试查询用户的有效代金券
        setCouponLoading(true);
        try {
          const couponRes: any = await api.post('/coupons/receive-quiz', {});
          setCoupon(couponRes.coupon);
        } catch (e) {
          // 静默忽略
        } finally {
          setCouponLoading(false);
        }
      }
    } catch (err: any) {
      toast.error(err.message || '问卷提交失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  // ============ 提交成功视图 ============
  if (submitted) {
    return (
      <div className="min-h-[80vh] bg-[#faf9f8] flex flex-col items-center justify-center px-4 py-16">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <Sparkles className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-serif text-stone-900 mb-3">感谢您的参与</h1>
          <p className="text-stone-500 mb-10">问卷已成功提交，您的反馈对我们的学术研究意义重大。</p>

          {couponLoading && (
            <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-8 flex items-center justify-center gap-2 text-stone-400">
              <div className="w-4 h-4 border-2 border-rose-200 border-t-rose-500 rounded-full animate-spin" />
              <span className="text-sm">正在为您准备专属代金券...</span>
            </div>
          )}

          {coupon && (
            <div className="relative overflow-hidden rounded-2xl shadow-lg border border-rose-100 text-left">
              <div className="bg-gradient-to-br from-rose-500 via-rose-500 to-rose-400 p-6 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -mr-16 -mt-16 pointer-events-none" />
                <div className="flex items-start justify-between relative z-10">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Gift className="w-4 h-4 text-rose-200" />
                      <span className="text-xs font-medium tracking-widest text-rose-100 uppercase">恭喜获得代金券</span>
                    </div>
                    <div className="flex items-baseline gap-1 mb-1">
                      <span className="text-lg text-rose-200">¥</span>
                      <span className="text-5xl font-bold leading-none">
                        {coupon.type === 'fixed' ? coupon.value : `${(coupon.value * 10).toFixed(1)}折`}
                      </span>
                    </div>
                    <p className="text-rose-100 text-xs mt-1">
                      {coupon.minAmount > 0 ? `满¥${coupon.minAmount}可用` : '无门槛可用'}
                      {' · '}有效期至{new Date(coupon.expiresAt).toLocaleDateString('zh-CN')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-rose-200 text-xs mb-2">学术调研奖励</p>
                    <Sparkles className="w-8 h-8 text-rose-200 ml-auto opacity-80" />
                  </div>
                </div>
              </div>
              <div className="flex items-center bg-white border-t-2 border-dashed border-rose-100 px-6 py-4">
                <div className="flex-1">
                  <p className="text-xs text-stone-400 mb-0.5">代金券码</p>
                  <p className="font-mono text-lg font-bold text-stone-800 tracking-widest">{coupon.code}</p>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(coupon.code);
                    setCopied(true);
                    toast.success('券码已复制到剪贴板');
                    setTimeout(() => setCopied(false), 2500);
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 bg-rose-50 text-rose-600 rounded-full text-sm font-medium hover:bg-rose-100 active:scale-95 transition-all"
                >
                  {copied ? <CheckCheck size={14} /> : <Copy size={14} />}
                  {copied ? '已复制' : '复制券码'}
                </button>
              </div>
              <div className="bg-stone-50 px-6 py-4 border-t border-stone-100 flex flex-col gap-2 text-center">
                <button
                  onClick={() => navigate('/cart')}
                  className="w-full py-2.5 px-4 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                >
                  <Gift size={14} className="text-amber-400" /> 前往购物车，直接抵扣本次订单 <ChevronRight size={14} />
                </button>
                <button
                  onClick={() => navigate('/products')}
                  className="text-xs text-rose-500 font-medium hover:text-rose-700 transition-colors inline-flex items-center justify-center gap-1 mt-1"
                >
                  去商城挑选更多商品 <ChevronRight size={12} />
                </button>
                <p className="text-center text-[10px] text-stone-400">已自动绑定到您的账号，结算时自动抵扣</p>
              </div>
            </div>
          )}

          <div className="mt-8 flex justify-center gap-4">
            <button
              onClick={() => navigate('/cart')}
              className="px-6 py-2.5 bg-stone-900 text-white rounded-full text-xs font-medium hover:bg-stone-800 transition-colors"
            >
              查看购物车
            </button>
            <button
              onClick={() => navigate('/')}
              className="px-6 py-2.5 border border-stone-300 text-stone-700 rounded-full text-xs font-medium hover:bg-stone-100 transition-colors"
            >
              返回商城首页
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ============ 问卷表单视图 ============
  return (
    <div className="min-h-[80vh] bg-[#faf9f8] pb-24">
      {/* Header + 进度条 */}
      <div className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-neutral-100">
        <div className="max-w-2xl mx-auto px-4 py-3.5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-rose-500" />
              <h1 className="text-sm md:text-base font-bold text-stone-900">
                {surveyInfo.title}
              </h1>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                pathType === 'ai_assisted' ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-800'
              }`}>
                {pathType === 'ai_assisted' ? 'AI组 · 26题' : '非AI组 · 21题'}
              </span>
            </div>
            <span className="text-xs text-stone-500 font-medium">
              已完成 {answeredCount} / {requiredQuestions.length} 题
            </span>
          </div>

          <div className="h-2 bg-stone-200 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ease-out ${
                pathType === 'ai_assisted' ? 'bg-rose-500' : 'bg-emerald-600'
              }`}
              style={{ width: `${Math.round((answeredCount / (requiredQuestions.length || 1)) * 100)}%` }}
            />
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 mt-6 space-y-6">
        {/* 顶部任务提示条 */}
        <div className="bg-white rounded-2xl border border-stone-200/80 p-5 shadow-sm">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3 mb-3 text-xs">
            <span className="flex items-center gap-1.5 font-bold text-stone-900">
              <FlaskConical size={14} className="text-rose-500" /> 苏黎世大学学术实验调研
            </span>
            <span className="text-stone-500 bg-stone-100 px-2.5 py-0.5 rounded-full text-[11px]">
              当前已加购：<b className="text-stone-900">{cartCount}</b> 件商品
            </span>
          </div>
          <p className="text-xs text-stone-600 leading-relaxed whitespace-pre-line">
            {surveyInfo.description}
          </p>
        </div>

        {/* 题目列表 */}
        {sections.map((section, sIdx) => (
          <div key={section.title || sIdx} className="bg-white rounded-2xl shadow-sm border border-neutral-100 p-6 md:p-8">
            <h3 className="text-base md:text-lg font-bold text-stone-900 mb-2">{section.title}</h3>
            {section.intro && (
              <p className="text-xs text-stone-500 leading-relaxed mb-6 bg-stone-50 rounded-xl p-3.5 border border-stone-100 whitespace-pre-line">
                {section.intro}
              </p>
            )}
            <div className="space-y-8">
              {section.questions.map((q) => (
                <div key={q.id} id={q.id} className="scroll-mt-24">
                  <p className="text-sm font-medium text-stone-900 mb-3">
                    {q.text}
                    {q.required && <span className="text-rose-500 ml-1 font-bold">*</span>}
                  </p>

                  {/* 单选题 */}
                  {q.type === 'single' && (
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-2">
                        {q.options?.map((opt: any, optIdx: number) => {
                          const optText = typeof opt === 'string' ? opt : (opt?.label || String(opt));
                          const selected = answers[q.id] === optText;
                          return (
                            <button
                              key={optIdx}
                              type="button"
                              onClick={() => setAnswer(q.id, optText)}
                              className={`px-4 py-2 rounded-full text-xs md:text-sm border transition-all ${
                                selected
                                  ? 'bg-stone-900 text-white border-stone-900 shadow-sm font-medium'
                                  : 'bg-white text-stone-600 border-stone-200 hover:border-stone-400'
                              }`}
                            >
                              {optText}
                            </button>
                          );
                        })}
                      </div>

                      {answers[q.id] === '其他' && (
                        <input
                          type="text"
                          value={otherText[q.id] || ''}
                          onChange={(e) => setOtherText((prev) => ({ ...prev, [q.id]: e.target.value }))}
                          placeholder="请输入其他具体情况说明..."
                          className="w-full mt-2 px-3 py-2 border border-stone-300 rounded-lg text-xs focus:outline-none focus:border-stone-900"
                        />
                      )}
                    </div>
                  )}

                  {/* 1-7 评分题 */}
                  {q.type === 'likert' && (
                    <div>
                      <div className="flex justify-between text-[11px] text-stone-400 mb-2 px-1">
                        <span>1 = 非常不同意</span>
                        <span>4 = 既不同意也不反对</span>
                        <span>7 = 非常同意</span>
                      </div>
                      <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                        {[1, 2, 3, 4, 5, 6, 7].map((val) => {
                          const selected = answers[q.id] === val;
                          return (
                            <button
                              key={val}
                              type="button"
                              onClick={() => setAnswer(q.id, val)}
                              className={`py-3 rounded-xl border-2 flex flex-col items-center justify-center transition-all ${
                                selected
                                  ? 'border-stone-900 bg-stone-900 text-white shadow-md'
                                  : 'border-stone-200 bg-white text-stone-600 hover:border-stone-400'
                              }`}
                            >
                              <span className="text-sm md:text-base font-bold leading-none">{val}</span>
                              <span className="hidden sm:inline-block text-[8px] mt-1 opacity-70 leading-tight">
                                {LIKERT_LABELS[val - 1]}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* 简答题 */}
                  {q.type === 'text' && (
                    <textarea
                      value={(answers[q.id] as string) || ''}
                      onChange={(e) => setAnswer(q.id, e.target.value)}
                      placeholder="（选填）请输入您的真实想法或体验反馈..."
                      rows={4}
                      className="w-full border border-stone-200 rounded-xl p-4 text-xs md:text-sm text-stone-700 focus:outline-none focus:border-stone-900 focus:ring-1 focus:ring-stone-900 resize-none"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* 提交按钮 */}
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full py-4 bg-stone-900 text-white rounded-full font-medium hover:bg-stone-800 disabled:bg-stone-300 transition-colors flex items-center justify-center gap-2 tracking-widest shadow-lg cursor-pointer"
        >
          {submitting ? (
            <>
              <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              提交问卷中...
            </>
          ) : (
            <>
              <Send size={18} /> 提交问卷并领取专属代金券
            </>
          )}
        </button>
      </div>
    </div>
  );
}
