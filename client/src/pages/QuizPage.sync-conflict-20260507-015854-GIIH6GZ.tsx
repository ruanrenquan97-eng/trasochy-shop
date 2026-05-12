import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Sparkles, RefreshCcw, Plus, Trash2 } from 'lucide-react';
import api from '../utils/api';

const QUESTIONS = [
  {
    id: 'skin_type',
    question: '您的肤质属于哪一种？',
    options: [
      { label: '干性皮肤', value: 'dry', desc: '经常感到紧绷，容易脱皮' },
      { label: '油性皮肤', value: 'oily', desc: '全脸容易出油，毛孔粗大' },
      { label: '混合性皮肤', value: 'combination', desc: 'T区出油，U区偏干' },
      { label: '敏感性皮肤', value: 'sensitive', desc: '容易泛红、发痒、刺痛' },
    ]
  },
  {
    id: 'primary_concern',
    question: '您目前最主要的护肤诉求是什么？',
    options: [
      { label: '抗老紧致', value: 'anti-aging', desc: '淡化细纹，提升面部轮廓' },
      { label: '美白淡斑', value: 'brightening', desc: '改善暗沉，均匀肤色' },
      { label: '祛痘控油', value: 'acne', desc: '抑制痘痘，平衡水油' },
      { label: '补水保湿', value: 'hydrating', desc: '深层补水，强韧屏障' },
    ]
  },
  {
    id: 'age_group',
    question: '您的年龄段是？',
    options: [
      { label: '20岁以下', value: 'under-20', desc: '基础保湿防晒为主' },
      { label: '20 - 30岁', value: '20-30', desc: '初抗老，维持肌肤稳定' },
      { label: '30 - 40岁', value: '30-40', desc: '深度抗老，淡化干纹细纹' },
      { label: '40岁以上', value: 'over-40', desc: '全面提拉紧致，密集修护' },
    ]
  }
];

export default function QuizPage() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [guardianLetter, setGuardianLetter] = useState<string>('');
  const [dynamicQuestions, setDynamicQuestions] = useState<any[]>([]);
  const [fetchingQuestion, setFetchingQuestion] = useState(false);

  const allQuestions = [...QUESTIONS, ...dynamicQuestions];

  // 假设已经获取了全局设置或在后台开启了功能
  const [settings, setSettings] = useState<any>({});
  
  useEffect(() => {
    api.get('/settings').then(res => setSettings(res as any));
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
      const newQuestion = await api.post('/ai/generate-question', { history });
      setDynamicQuestions(prev => [...prev, newQuestion]);
      // currentStep will naturally point to the new question since length increased
    } catch (err) {
      console.error(err);
      alert('抱歉，AI 追问失败，请直接生成报告。');
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
        answers: { ...finalAnswers, customDetails: customDetailsList } 
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

  if (settings.feature_ai_quiz !== '1') {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-serif text-stone-800 mb-2">服务升级中</h2>
          <p className="text-stone-500">AI测肤功能暂未开放，敬请期待。</p>
          <button onClick={() => navigate('/')} className="mt-6 px-6 py-2 bg-stone-900 text-white rounded-full">返回首页</button>
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
        <h2 className="text-2xl font-serif text-stone-800 mb-2">TRASOCHY AI 正在为您分析</h2>
        <p className="text-stone-500 text-sm">匹配全球顶尖院线护肤方案...</p>
      </div>
    );
  }

  if (results.length > 0) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-serif text-stone-900 mb-4">为您定制的护肤方案</h1>
          {guardianLetter ? (
            <div className="bg-rose-50/50 p-8 rounded-3xl border border-rose-100 mb-12 text-left max-w-3xl mx-auto relative">
              <div className="absolute top-4 left-4 text-rose-200">
                <Sparkles className="w-8 h-8 opacity-50" />
              </div>
              <p className="text-stone-700 leading-relaxed font-serif text-lg indent-8 whitespace-pre-wrap relative z-10">
                {guardianLetter}
              </p>
              <div className="text-right mt-6 text-rose-400 font-serif text-sm">
                — TRASOCHY AI 护肤顾问
              </div>
            </div>
          ) : (
            <p className="text-stone-500 max-w-2xl mx-auto">
              基于您的肤质与核心诉求，我们的 AI 为您甄选了以下院线级护肤组合。持续使用 28 天，见证肌肤新生。
            </p>
          )}
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {results.map((product, idx) => (
            <div key={product.id} className="bg-white p-6 rounded-2xl shadow-sm border border-rose-50 hover:shadow-xl transition-shadow cursor-pointer relative overflow-hidden group" onClick={() => navigate(`/product/${product.slug}`)}>
              {idx === 0 && (
                <div className="absolute top-0 left-0 bg-rose-500 text-white text-[10px] px-3 py-1 font-bold tracking-wider rounded-br-xl z-10">
                  TOP 匹配
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

        <div className="mt-16 text-center">
          <button onClick={resetQuiz} className="inline-flex items-center gap-2 text-stone-500 hover:text-stone-900 transition-colors">
            <RefreshCcw size={16} /> 重新测试
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
            <span>{isDispatchStep ? '分析中转站' : `问题 ${currentStep + 1} / ${Math.max(10, allQuestions.length)}`}</span>
            <span>{isDispatchStep && allQuestions.length >= 10 ? '100%' : `${Math.round(((currentStep + 1) / 10) * 100)}%`}</span>
          </div>
          <div className="h-1 bg-stone-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-stone-900 transition-all duration-500 ease-out"
              style={{ width: isDispatchStep && allQuestions.length >= 10 ? '100%' : `${((currentStep + 1) / 10) * 100}%` }}
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
                <h3 className="text-xl font-serif text-stone-800">AI 正在思考追问...</h3>
              </div>
            ) : (
              <>
                <h2 className="text-3xl md:text-4xl font-serif text-stone-900 mb-6">
                  {allQuestions.length < 10 ? '是否需要更精准的方案？' : '问卷已全部完成'}
                </h2>
                <p className="text-stone-500 mb-12 max-w-lg mx-auto">
                  {allQuestions.length < 10 
                    ? `当前已完成 ${allQuestions.length} 道题目。您可以选择直接生成专属护肤方案，或者让 AI 护肤顾问对您的肌肤情况进行深入追问。`
                    : `您已经完成了 10 道题目的深度测肤，AI 顾问已经完全掌握了您的肌肤档案！`
                  }
                </p>

                <div className="flex flex-col gap-4 w-full max-w-md">
                  {allQuestions.length < 10 && (
                    <button
                      onClick={fetchNextQuestion}
                      className="w-full py-4 bg-white border-2 border-stone-900 text-stone-900 rounded-full font-medium hover:bg-stone-50 transition-colors flex items-center justify-center gap-2"
                    >
                      <Sparkles size={18} /> 让 AI 动态追问 (还剩 {10 - allQuestions.length} 题)
                    </button>
                  )}
                  <button
                    onClick={() => submitQuiz(answers)}
                    className="w-full py-4 bg-stone-900 text-white rounded-full font-medium hover:bg-stone-800 transition-colors tracking-widest shadow-lg"
                  >
                    直接生成专属报告
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
