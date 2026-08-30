import { useEffect, useState } from 'react';
import { 
  ClipboardList, Save, Plus, Trash2, ChevronDown, ChevronUp, BarChart3, 
  RefreshCw, FileText, Sparkles, Search, FlaskConical, CheckCircle2,
  Download, Clock, MapPin, ShoppingBag, Eye, Globe, User, Loader2
} from 'lucide-react';
import api from '../../utils/api';
import toast from 'react-hot-toast';

export default function AdminSurveyManage() {
  const [activeView, setActiveView] = useState<'questions' | 'responses' | 'analysis'>('questions');
  const [questionGroup, setQuestionGroup] = useState<'traditional_search' | 'ai_assisted'>('traditional_search');
  const [survey, setSurvey] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);

  // 答卷数据
  const [responses, setResponses] = useState<any[]>([]);
  const [questionStats, setQuestionStats] = useState<Record<string, any>>({});
  const [comparison, setComparison] = useState<any>(null);
  const [totalResponses, setTotalResponses] = useState(0);
  const [page, setPage] = useState(1);
  const [pathFilter, setPathFilter] = useState('');
  const [responsesLoading, setResponsesLoading] = useState(false);
  const [selectedResponse, setSelectedResponse] = useState<any>(null);

  // 展开的章节
  const [expandedSections, setExpandedSections] = useState<Record<number, boolean>>({ 0: true, 1: true, 2: true });

  const handleExportAllData = async () => {
    setExporting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/survey/admin/export?format=csv', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        throw new Error('导出失败');
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const dateStr = new Date().toISOString().split('T')[0];
      a.download = `TRASOCHY_学术调研问卷全量数据_${dateStr}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('问卷全量数据（包含完整题目、停留时间、IP城市、访问商品数）已成功导出下载！');
    } catch (err: any) {
      toast.error('导出数据失败: ' + (err?.message || '网络异常'));
    } finally {
      setExporting(false);
    }
  };

  const getQuestionTitle = (qId: string, pathType: string) => {
    const isAi = pathType === 'ai_assisted';
    if (survey?.sections) {
      for (const sec of survey.sections) {
        const found = sec.questions?.find((q: any) => q.id === qId);
        if (found) return found.text;
      }
    }
    const QUESTION_MAP: Record<string, string> = {
      q1: '1. 您的年龄是？',
      q2: '2. 您目前居住在哪个国家或地区？',
      q3: '3. 您是否有网上购物经验？',
      q4: '4. 在刚才的购物过程中，平台是否向您提供了基于人工智能（AI）的个性化产品推荐？',
      q5: '5. 作出最终产品选择时，我感到精神疲惫。(1-7分)',
      q6: '6. 选择产品需要我投入很多脑力。(1-7分)',
      q7: '7. 我被需要处理的信息量压得喘不过气。(1-7分)',
      q8: '8. 我很难作出最终决定。(1-7分)',
      q9: '9. 完成这项购物任务需要我投入大量注意力。(1-7分)',
      q10: '10. 我需要同时考虑很多不同的信息。(1-7分)',
      q11: '11. 整个产品选择过程对我来说很复杂。(1-7分)',
      q12: '12. 我信任该平台提供的产品信息。(1-7分)',
      q13: '13. 我认为该平台是可靠的。(1-7分)',
      q14: '14. 平台提供的信息与我的购物需求相关。(1-7分)',
      q15: '15. 我会考虑购买我最终选择的产品。(1-7分)',
      q16: '16. 如果这是真实的购物情境，我购买该产品的可能性较高。(1-7分)',
      q17: '17. 这次购物体验提高了我的购买意愿。(1-7分)',
      q18: '18. 我对自己最终作出的产品选择有信心。(1-7分)',
      q19: '19. 在参加本研究以前，您使用ChatGPT或其他AI助手的频率是？',
      q20: '20. 您在刚才的购物过程中是否遇到技术问题？',
      q21: isAi ? '21. AI推荐符合我的个人需求。(1-7分)' : '21. 开放题反馈：哪一部分最帮助或阻碍您作出最终选择？为什么？',
      q22: '22. AI推荐的产品与我的皮肤状况相关。(1-7分)',
      q23: '23. 我信任AI提供的推荐。(1-7分)',
      q24: '24. AI减少了我手动比较产品的工作。(1-7分)',
      q25: '25. 您最终选择的产品是否来自AI推荐结果？',
      q26: '26. 开放题反馈：在购物过程中，哪一部分最帮助或阻碍您作出最终选择？为什么？'
    };
    return QUESTION_MAP[qId] || qId;
  };

  const loadQuestions = async (group = questionGroup) => {
    setLoading(true);
    try {
      const res: any = await api.get(`/survey/admin/questions?path_type=${group}`);
      setSurvey(res?.survey || null);
    } catch (e: any) {
      toast.error('加载问卷题库失败: ' + (e?.message || '未知错误'));
    } finally {
      setLoading(false);
    }
  };

  const loadResponses = async (p = 1, pFilter = pathFilter) => {
    setResponsesLoading(true);
    try {
      let url = `/survey/admin/responses?page=${p}&limit=15`;
      if (pFilter) url += `&path_type=${pFilter}`;
      const res: any = await api.get(url);
      setResponses(res?.responses || []);
      setTotalResponses(res?.total || 0);
      setQuestionStats(res?.questionStats || {});
      setComparison(res?.comparison || null);
      setPage(res?.page || 1);
    } catch (e: any) {
      toast.error('加载答卷数据失败: ' + (e?.message || '未知错误'));
    } finally {
      setResponsesLoading(false);
    }
  };

  useEffect(() => {
    loadQuestions(questionGroup);
  }, [questionGroup]);

  useEffect(() => {
    loadResponses(1, '');
  }, []);

  const handleSaveQuestions = async () => {
    if (!survey) return;
    setSaving(true);
    try {
      await api.put('/survey/admin/questions', { survey, path_type: questionGroup });
      toast.success(`【${questionGroup === 'ai_assisted' ? 'AI组' : '非AI组'}】问卷题库已成功保存`);
      loadQuestions(questionGroup);
    } catch (e: any) {
      toast.error('保存失败: ' + (e?.message || '未知错误'));
    } finally {
      setSaving(false);
    }
  };

  const toggleSection = (idx: number) => {
    setExpandedSections(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const updateQuestionText = (sIdx: number, qIdx: number, text: string) => {
    setSurvey((prev: any) => {
      const clone = JSON.parse(JSON.stringify(prev));
      clone.sections[sIdx].questions[qIdx].text = text;
      return clone;
    });
  };

  const updateSectionTitle = (sIdx: number, title: string) => {
    setSurvey((prev: any) => {
      const clone = JSON.parse(JSON.stringify(prev));
      clone.sections[sIdx].title = title;
      return clone;
    });
  };

  const updateSectionIntro = (sIdx: number, intro: string) => {
    setSurvey((prev: any) => {
      const clone = JSON.parse(JSON.stringify(prev));
      clone.sections[sIdx].intro = intro;
      return clone;
    });
  };

  const addQuestion = (sIdx: number, type: 'single' | 'likert' | 'text' = 'likert') => {
    setSurvey((prev: any) => {
      const clone = JSON.parse(JSON.stringify(prev));
      const newId = 'q_' + Date.now();
      const newQ = {
        id: newId,
        text: '新题目描述',
        type,
        required: true,
        ...(type === 'single' ? { options: ['选项A', '选项B'] } : {})
      };
      clone.sections[sIdx].questions.push(newQ);
      return clone;
    });
  };

  const removeQuestion = (sIdx: number, qIdx: number) => {
    setSurvey((prev: any) => {
      const clone = JSON.parse(JSON.stringify(prev));
      clone.sections[sIdx].questions.splice(qIdx, 1);
      return clone;
    });
  };

  const totalQuestions = survey?.sections?.reduce((sum: number, s: any) => sum + (s.questions?.length || 0), 0) || 0;

  // 计算实验维度的综合平均分
  const calculateDimensionAvg = (statsMap: Record<string, any>, qIds: string[]) => {
    if (!statsMap) return '-';
    let sum = 0;
    let count = 0;
    qIds.forEach(id => {
      if (statsMap[id]?.avg) {
        sum += parseFloat(statsMap[id].avg);
        count += 1;
      }
    });
    return count > 0 ? (sum / count).toFixed(2) : '-';
  };

  return (
    <div className="max-w-5xl mx-auto p-8 space-y-6">
      {/* 头部标题 */}
      <div className="flex items-center justify-between flex-wrap gap-4 mb-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
            <ClipboardList className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">学术调研问卷与实验管理</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              瑞士苏黎世大学合作调研 · 当前查看 {questionGroup === 'ai_assisted' ? 'AI组' : '非AI组'} 共 {totalQuestions} 道题目
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveView('questions')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1.5 ${
              activeView === 'questions' ? 'bg-stone-900 text-white border-stone-900' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}
          >
            <FileText size={14} /> 问卷题库设计
          </button>
          <button
            type="button"
            onClick={() => { setActiveView('analysis'); loadResponses(1, ''); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1.5 ${
              activeView === 'analysis' ? 'bg-stone-900 text-white border-stone-900' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}
          >
            <FlaskConical size={14} /> 实验对比分析
          </button>
          <button
            type="button"
            onClick={() => { setActiveView('responses'); loadResponses(1, pathFilter); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1.5 ${
              activeView === 'responses' ? 'bg-stone-900 text-white border-stone-900' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}
          >
            <BarChart3 size={14} /> 答卷回收记录 ({totalResponses})
          </button>
        </div>
      </div>

      {/* ── 视图 1：问卷题库设计 ── */}
      {activeView === 'questions' && (
        <div className="space-y-6">
          {/* 组别切换 Tab */}
          <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-gray-200">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setQuestionGroup('traditional_search')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                  questionGroup === 'traditional_search'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Search size={14} /> 非 AI 组问卷设计 (21题)
              </button>
              <button
                type="button"
                onClick={() => setQuestionGroup('ai_assisted')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                  questionGroup === 'ai_assisted'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Sparkles size={14} /> AI 组问卷设计 (26题)
              </button>
            </div>

            <button
              type="button"
              onClick={handleSaveQuestions}
              disabled={saving}
              className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50"
            >
              <Save size={14} /> {saving ? '正在保存...' : '保存当前组问卷'}
            </button>
          </div>

          {loading ? (
            <div className="py-12 text-center text-gray-400 animate-pulse">正在读取问卷库...</div>
          ) : !survey ? (
            <div className="p-8 text-center bg-gray-50 rounded-xl text-gray-400">暂无问卷库数据</div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border p-6 space-y-6">
              {/* 问卷基础信息 */}
              <div className="border-b border-gray-100 pb-5 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block font-medium">问卷主标题</label>
                    <input
                      type="text"
                      value={survey.title || ''}
                      onChange={e => setSurvey((prev: any) => ({ ...prev, title: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-semibold focus:outline-none focus:border-stone-900"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block font-medium">副标题 / 说明</label>
                    <input
                      type="text"
                      value={survey.subtitle || ''}
                      onChange={e => setSurvey((prev: any) => ({ ...prev, subtitle: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-stone-900"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block font-medium">前言导语 / 任务说明</label>
                  <textarea
                    rows={3}
                    value={survey.description || ''}
                    onChange={e => setSurvey((prev: any) => ({ ...prev, description: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-stone-900"
                  />
                </div>
              </div>

              {/* 章节列表 */}
              <div className="space-y-4">
                {survey.sections?.map((section: any, sIdx: number) => {
                  const isOpen = expandedSections[sIdx] ?? false;
                  return (
                    <div key={section.id || sIdx} className="border border-gray-200 rounded-xl overflow-hidden">
                      {/* 章节标题栏 */}
                      <div className="flex items-center justify-between bg-gray-50 px-4 py-3 border-b border-gray-200">
                        <div className="flex items-center gap-3 flex-1">
                          <button type="button" onClick={() => toggleSection(sIdx)} className="text-gray-400 hover:text-gray-700">
                            {isOpen ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                          </button>
                          <input
                            type="text"
                            value={section.title || ''}
                            onChange={e => updateSectionTitle(sIdx, e.target.value)}
                            className="bg-transparent font-semibold text-sm text-gray-800 focus:outline-none flex-1"
                          />
                        </div>
                        <span className="text-xs text-gray-400 font-mono ml-4">
                          {section.questions?.length || 0} 道题
                        </span>
                      </div>

                      {isOpen && (
                        <div className="p-4 space-y-4 bg-white">
                          {/* 章节导语说明 */}
                          {section.intro !== undefined && (
                            <div>
                              <label className="text-[11px] text-gray-400 mb-1 block">章节引导提示语</label>
                              <textarea
                                rows={2}
                                value={section.intro || ''}
                                onChange={e => updateSectionIntro(sIdx, e.target.value)}
                                className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-gray-600 focus:outline-none focus:border-stone-900"
                              />
                            </div>
                          )}

                          {/* 题目列表 */}
                          <div className="space-y-3">
                            {section.questions?.map((q: any, qIdx: number) => (
                              <div key={q.id || qIdx} className="p-3 bg-gray-50/70 border border-gray-200 rounded-lg flex items-start gap-3">
                                <span className="text-xs font-mono font-bold text-gray-400 mt-1 shrink-0">{q.id}</span>
                                <div className="flex-1 space-y-2">
                                  <input
                                    type="text"
                                    value={q.text}
                                    onChange={e => updateQuestionText(sIdx, qIdx, e.target.value)}
                                    className="w-full bg-white border border-gray-200 rounded px-2.5 py-1.5 text-xs text-gray-800 focus:outline-none focus:border-stone-900"
                                  />
                                  <div className="flex items-center gap-3 text-[11px] text-gray-500">
                                    <span className="bg-white px-2 py-0.5 border rounded">
                                      {q.type === 'likert' ? '📊 7点Likert量表题' : q.type === 'single' ? '🔘 单选选项' : '📝 开放式简答题'}
                                    </span>
                                    {q.options && (
                                      <span className="text-gray-400">选项：{q.options.join(' | ')}</span>
                                    )}
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => removeQuestion(sIdx, qIdx)}
                                  className="text-gray-300 hover:text-red-500 transition-colors p-1"
                                  title="删除题目"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            ))}
                          </div>

                          <div className="flex gap-2 pt-2">
                            <button
                              type="button"
                              onClick={() => addQuestion(sIdx, 'likert')}
                              className="text-xs text-blue-600 hover:text-blue-800 border border-blue-200 hover:bg-blue-50 px-2.5 py-1 rounded flex items-center gap-1"
                            >
                              <Plus size={12} /> 添加 7 点量表题
                            </button>
                            <button
                              type="button"
                              onClick={() => addQuestion(sIdx, 'single')}
                              className="text-xs text-gray-600 hover:text-gray-800 border border-gray-200 hover:bg-gray-50 px-2.5 py-1 rounded flex items-center gap-1"
                            >
                              <Plus size={12} /> 添加单选题
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── 视图 2：实验对比分析 ── */}
      {activeView === 'analysis' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 传统自主选购组 */}
            <div className="bg-white rounded-2xl p-6 border border-emerald-200 shadow-sm space-y-4 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600">
                    <Search size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-stone-900">非 AI 组 (传统自主选购)</h3>
                    <p className="text-[11px] text-gray-400">自主浏览搜索选品，挑选 2~3 款产品加入购物车</p>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full">
                  {comparison?.traditional_count || 0} 份答卷
                </span>
              </div>

              <div className="space-y-3 pt-2">
                <div className="bg-stone-50 rounded-xl p-3.5 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-stone-800">决策疲劳均分 (Choice Fatigue)</p>
                    <p className="text-[10px] text-stone-400">精神疲惫/思考脑力/信息重压/决定困难 (Q5-Q8)</p>
                  </div>
                  <span className="text-base font-bold text-purple-600">
                    {calculateDimensionAvg(comparison?.traditional_stats, ['q5', 'q6', 'q7', 'q8'])} <span className="text-xs font-normal text-stone-400">/7</span>
                  </span>
                </div>

                <div className="bg-stone-50 rounded-xl p-3.5 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-stone-800">认知负荷均分 (Cognitive Load)</p>
                    <p className="text-[10px] text-stone-400">注意投入/多维信息/过程复杂 (Q9-Q11)</p>
                  </div>
                  <span className="text-base font-bold text-indigo-600">
                    {calculateDimensionAvg(comparison?.traditional_stats, ['q9', 'q10', 'q11'])} <span className="text-xs font-normal text-stone-400">/7</span>
                  </span>
                </div>

                <div className="bg-stone-50 rounded-xl p-3.5 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-stone-800">平台信任度均分 (Platform Trust)</p>
                    <p className="text-[10px] text-stone-400">信息信任/平台可靠/需求相关 (Q12-Q14)</p>
                  </div>
                  <span className="text-base font-bold text-blue-600">
                    {calculateDimensionAvg(comparison?.traditional_stats, ['q12', 'q13', 'q14'])} <span className="text-xs font-normal text-stone-400">/7</span>
                  </span>
                </div>

                <div className="bg-stone-50 rounded-xl p-3.5 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-stone-800">购买意愿均分 (Purchase Intent)</p>
                    <p className="text-[10px] text-stone-400">考虑购买/真实情境可能/体验提升 (Q15-Q17)</p>
                  </div>
                  <span className="text-base font-bold text-emerald-600">
                    {calculateDimensionAvg(comparison?.traditional_stats, ['q15', 'q16', 'q17'])} <span className="text-xs font-normal text-stone-400">/7</span>
                  </span>
                </div>

                <div className="bg-stone-50 rounded-xl p-3.5 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-stone-800">选择信心均分 (Choice Confidence)</p>
                    <p className="text-[10px] text-stone-400">对最终选择有信心 (Q18)</p>
                  </div>
                  <span className="text-base font-bold text-amber-600">
                    {calculateDimensionAvg(comparison?.traditional_stats, ['q18'])} <span className="text-xs font-normal text-stone-400">/7</span>
                  </span>
                </div>
              </div>
            </div>

            {/* AI 辅助推荐组 */}
            <div className="bg-white rounded-2xl p-6 border border-rose-200 shadow-sm space-y-4 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center text-rose-600">
                    <Sparkles size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-stone-900">AI 组 (智能辅助推荐)</h3>
                    <p className="text-[11px] text-rose-500">体验了 AI 测肤、智能方案推荐与 AI 客服对话</p>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold bg-rose-100 text-rose-700 px-2.5 py-1 rounded-full">
                  {comparison?.ai_count || 0} 份答卷
                </span>
              </div>

              <div className="space-y-3 pt-2">
                <div className="bg-rose-50/50 rounded-xl p-3.5 flex items-center justify-between border border-rose-100/50">
                  <div>
                    <p className="text-xs font-semibold text-stone-800">决策疲劳均分 (Choice Fatigue)</p>
                    <p className="text-[10px] text-stone-400">精神疲惫/思考脑力/信息重压/决定困难 (Q5-Q8)</p>
                  </div>
                  <span className="text-base font-bold text-purple-600">
                    {calculateDimensionAvg(comparison?.ai_stats, ['q5', 'q6', 'q7', 'q8'])} <span className="text-xs font-normal text-stone-400">/7</span>
                  </span>
                </div>

                <div className="bg-rose-50/50 rounded-xl p-3.5 flex items-center justify-between border border-rose-100/50">
                  <div>
                    <p className="text-xs font-semibold text-stone-800">认知负荷均分 (Cognitive Load)</p>
                    <p className="text-[10px] text-stone-400">注意投入/多维信息/过程复杂 (Q9-Q11)</p>
                  </div>
                  <span className="text-base font-bold text-indigo-600">
                    {calculateDimensionAvg(comparison?.ai_stats, ['q9', 'q10', 'q11'])} <span className="text-xs font-normal text-stone-400">/7</span>
                  </span>
                </div>

                <div className="bg-rose-50/50 rounded-xl p-3.5 flex items-center justify-between border border-rose-100/50">
                  <div>
                    <p className="text-xs font-semibold text-stone-800">平台信任度均分 (Platform Trust)</p>
                    <p className="text-[10px] text-stone-400">信息信任/平台可靠/需求相关 (Q12-Q14)</p>
                  </div>
                  <span className="text-base font-bold text-blue-600">
                    {calculateDimensionAvg(comparison?.ai_stats, ['q12', 'q13', 'q14'])} <span className="text-xs font-normal text-stone-400">/7</span>
                  </span>
                </div>

                <div className="bg-rose-50/50 rounded-xl p-3.5 flex items-center justify-between border border-rose-100/50">
                  <div>
                    <p className="text-xs font-semibold text-stone-800">购买意愿均分 (Purchase Intent)</p>
                    <p className="text-[10px] text-stone-400">考虑购买/真实情境可能/体验提升 (Q15-Q17)</p>
                  </div>
                  <span className="text-base font-bold text-emerald-600">
                    {calculateDimensionAvg(comparison?.ai_stats, ['q15', 'q16', 'q17'])} <span className="text-xs font-normal text-stone-400">/7</span>
                  </span>
                </div>

                <div className="bg-rose-50/50 rounded-xl p-3.5 flex items-center justify-between border border-rose-100/50">
                  <div>
                    <p className="text-xs font-semibold text-stone-800">AI 使用体验均分 (AI Experience)</p>
                    <p className="text-[10px] text-rose-500">需求符合/状况相关/信任推荐/减少比较 (Q21-Q24)</p>
                  </div>
                  <span className="text-base font-bold text-rose-600">
                    {calculateDimensionAvg(comparison?.ai_stats, ['q21', 'q22', 'q23', 'q24'])} <span className="text-xs font-normal text-stone-400">/7</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 视图 3：答卷回收明细 ── */}
      {activeView === 'responses' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <div>
                <h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
                  <BarChart3 className="text-purple-600" size={18} /> 已回收答卷记录 ({totalResponses} 份)
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  记录用户填写的实验问卷、各量表评分、页面平均停留时长、IP所在城市及浏览商品数量
                </p>
              </div>

              <div className="flex items-center gap-2.5 flex-wrap">
                {/* 一键下载所有数据按钮 */}
                <button
                  type="button"
                  onClick={handleExportAllData}
                  disabled={exporting || totalResponses === 0}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-stone-900 hover:bg-stone-800 rounded-lg transition-all shadow-sm active:scale-95 disabled:opacity-50"
                  title="一键下载包含完整题目、停留时间、IP城市、访问商品数的全量数据"
                >
                  {exporting ? <Loader2 size={13} className="animate-spin text-purple-300" /> : <Download size={13} className="text-purple-300" />}
                  {exporting ? '正在导出...' : '一键下载所有数据 (CSV)'}
                </button>

                <select
                  value={pathFilter}
                  onChange={e => {
                    setPathFilter(e.target.value);
                    loadResponses(1, e.target.value);
                  }}
                  className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none bg-gray-50 text-gray-700"
                >
                  <option value="">全部实验组别</option>
                  <option value="traditional_search">非 AI 组 (传统选购·21题)</option>
                  <option value="ai_assisted">AI 组 (智能辅助·26题)</option>
                </select>

                <button
                  type="button"
                  onClick={() => loadResponses(page, pathFilter)}
                  className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900 border px-3 py-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 transition"
                >
                  <RefreshCw size={13} /> 刷新
                </button>
              </div>
            </div>

            {responsesLoading ? (
              <div className="py-12 text-center text-gray-400 text-sm animate-pulse">正在加载答卷与用户行为画像...</div>
            ) : responses.length === 0 ? (
              <div className="py-12 text-center text-gray-400 text-sm bg-gray-50 rounded-xl border border-dashed">暂无匹配的答卷记录</div>
            ) : (
              <div className="overflow-x-auto border border-gray-100 rounded-xl">
                <table className="w-full text-xs text-left">
                  <thead className="bg-gray-50 text-gray-500 border-b border-gray-100">
                    <tr>
                      <th className="py-3 px-3 w-14">编号</th>
                      <th className="py-3 px-3">填写用户</th>
                      <th className="py-3 px-3">实验组别</th>
                      <th className="py-3 px-3 text-right">平均停留时间</th>
                      <th className="py-3 px-3">IP及所在城市</th>
                      <th className="py-3 px-3 text-right">浏览商品数</th>
                      <th className="py-3 px-3 text-right">选购加购</th>
                      <th className="py-3 px-3">提交时间</th>
                      <th className="py-3 px-3 text-right">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {responses.map((r: any) => (
                      <tr key={r.id} className="hover:bg-gray-50/70 transition-colors">
                        <td className="py-3 px-3 font-mono font-bold text-gray-500">#{r.id}</td>
                        <td className="py-3 px-3">
                          <p className="font-semibold text-gray-800">{r.user_name}</p>
                          <p className="text-[10px] text-gray-400 font-mono">{r.user_email || '游客/未绑定'}</p>
                        </td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            r.path_type === 'ai_assisted' 
                              ? 'bg-rose-100 text-rose-700' 
                              : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {r.path_type === 'ai_assisted' ? '🤖 AI 组 (26题)' : '🔍 非AI组 (21题)'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-purple-700">
                          {r.avg_dwell_time > 0 ? `${r.avg_dwell_time} 秒` : '-'}
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1 text-gray-700">
                            <MapPin size={12} className="text-rose-500 shrink-0" />
                            <span className="font-medium line-clamp-1">{r.city || '未知地区'}</span>
                          </div>
                          <p className="text-[10px] text-gray-400 font-mono ml-4">{r.ip || '127.0.0.1'}</p>
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-gray-700">
                          <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-bold">
                            {r.products_visited_count || 0} 款
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right text-gray-600 font-mono">
                          <b>{r.cart_items_count || 0}</b> 件
                        </td>
                        <td className="py-3 px-3 text-gray-400 text-[11px]">
                          {new Date(r.created_at).toLocaleString('zh-CN', { hour12: false })}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedResponse(r)}
                            className="text-purple-600 hover:text-purple-900 font-bold px-2 py-1 bg-purple-50 hover:bg-purple-100 rounded transition"
                          >
                            查看详情 →
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* 分页 */}
                <div className="p-3 bg-gray-50/50 flex items-center justify-between border-t border-gray-100">
                  <span className="text-xs text-gray-400">共 {totalResponses} 份答卷，每页 15 份，当前第 {page} 页</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={page <= 1}
                      onClick={() => loadResponses(page - 1, pathFilter)}
                      className="px-3 py-1 text-xs border rounded-lg bg-white disabled:opacity-40 hover:bg-gray-50 transition"
                    >
                      上一页
                    </button>
                    <button
                      type="button"
                      disabled={page * 15 >= totalResponses}
                      onClick={() => loadResponses(page + 1, pathFilter)}
                      className="px-3 py-1 text-xs border rounded-lg bg-white disabled:opacity-40 hover:bg-gray-50 transition"
                    >
                      下一页
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 答卷详情 Modal (完整呈现用户行为画像与完整题目标题) */}
      {selectedResponse && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border">
            {/* Modal Header */}
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-stone-900 text-white">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-purple-300">
                  <FileText size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold flex items-center gap-2">
                    答卷完整档案 #{selectedResponse.id}
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      selectedResponse.path_type === 'ai_assisted' ? 'bg-rose-500 text-white' : 'bg-emerald-500 text-white'
                    }`}>
                      {selectedResponse.path_type === 'ai_assisted' ? 'AI 组 (26题)' : '非 AI 组 (21题)'}
                    </span>
                  </h3>
                  <p className="text-xs text-gray-300 mt-0.5">
                    用户: {selectedResponse.user_name} ({selectedResponse.user_email || '未绑定邮箱'}) · 提交于 {new Date(selectedResponse.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setSelectedResponse(null)} 
                className="text-gray-400 hover:text-white text-xl font-bold w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center transition"
              >
                ×
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6">
              {/* 4 大画像指标 */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-purple-50/70 border border-purple-100 rounded-xl p-3">
                  <div className="flex items-center gap-1.5 text-purple-600 mb-1">
                    <Clock size={13} />
                    <span className="text-[10px] font-bold uppercase">页面平均停留时长</span>
                  </div>
                  <p className="text-sm font-bold font-mono text-gray-900">
                    {selectedResponse.avg_dwell_time || 0} <span className="text-[10px] font-normal text-gray-500">秒</span>
                  </p>
                  <p className="text-[10px] text-purple-600 font-mono mt-0.5">
                    累计总停留: {selectedResponse.total_dwell_time || 0} 秒
                  </p>
                </div>

                <div className="bg-rose-50/70 border border-rose-100 rounded-xl p-3">
                  <div className="flex items-center gap-1.5 text-rose-600 mb-1">
                    <MapPin size={13} />
                    <span className="text-[10px] font-bold uppercase">IP 所在城市</span>
                  </div>
                  <p className="text-xs font-bold text-gray-900 truncate" title={selectedResponse.city || '未知地区'}>
                    {selectedResponse.city || '未知地区'}
                  </p>
                  <p className="text-[10px] text-gray-400 font-mono mt-0.5 truncate">{selectedResponse.ip || '127.0.0.1'}</p>
                </div>

                <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-3">
                  <div className="flex items-center gap-1.5 text-blue-600 mb-1">
                    <ShoppingBag size={13} />
                    <span className="text-[10px] font-bold uppercase">浏览访问商品数</span>
                  </div>
                  <p className="text-sm font-bold font-mono text-gray-900">
                    {selectedResponse.products_visited_count || 0} <span className="text-[10px] font-normal text-gray-500">款</span>
                  </p>
                  <p className="text-[10px] text-blue-600 mt-0.5 truncate" title={selectedResponse.visited_product_names}>
                    {selectedResponse.visited_product_names ? `已看: ${selectedResponse.visited_product_names}` : '暂无商品浏览'}
                  </p>
                </div>

                <div className="bg-emerald-50/70 border border-emerald-100 rounded-xl p-3">
                  <div className="flex items-center gap-1.5 text-emerald-600 mb-1">
                    <ShoppingBag size={13} />
                    <span className="text-[10px] font-bold uppercase">最终挑选加购数</span>
                  </div>
                  <p className="text-sm font-bold font-mono text-gray-900">
                    {selectedResponse.cart_items_count || 0} <span className="text-[10px] font-normal text-gray-500">件</span>
                  </p>
                  <p className="text-[10px] text-emerald-600 mt-0.5">实验要求 2~3 款</p>
                </div>
              </div>

              {/* 完整题目标题与答案明细 */}
              <div>
                <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <FileText size={14} className="text-purple-600" />
                  答卷完整题目与填写记录（共 {Object.keys(selectedResponse.answers || {}).length} 题）
                </h4>

                <div className="space-y-2.5">
                  {Object.entries(selectedResponse.answers || {}).map(([key, val]) => {
                    const fullQuestionTitle = getQuestionTitle(key, selectedResponse.path_type);
                    const isLikert = typeof val === 'number';
                    const isFeedback = key === 'q26' || key === 'q21' && selectedResponse.path_type === 'traditional_search';

                    return (
                      <div key={key} className="p-3 rounded-xl border border-gray-100 bg-gray-50/60 hover:bg-gray-50 transition-colors">
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-1 flex-1 min-w-0">
                            <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-gray-200 text-gray-700 mb-0.5">
                              {key.toUpperCase()}
                            </span>
                            <p className="text-xs font-medium text-gray-800 leading-relaxed break-words">
                              {fullQuestionTitle}
                            </p>
                          </div>

                          <div className="text-right shrink-0">
                            {isLikert ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-100 text-purple-800 rounded-lg font-bold font-mono text-xs">
                                {val} <span className="text-[10px] font-normal text-purple-600">/ 7 分</span>
                              </span>
                            ) : (
                              <span className="inline-block px-2.5 py-1 bg-stone-900 text-white rounded-lg font-medium text-xs max-w-xs text-left break-words">
                                {String(val)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
              <span className="text-xs text-gray-400">瑞士苏黎世大学合作学术调研档案</span>
              <button 
                type="button" 
                onClick={() => setSelectedResponse(null)} 
                className="px-5 py-2 bg-stone-900 text-white rounded-xl text-xs font-semibold hover:bg-stone-800 transition"
              >
                关闭详情
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
