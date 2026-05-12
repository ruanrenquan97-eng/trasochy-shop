import { useEffect, useState, useRef } from 'react';
import { Save, AlertTriangle, CheckCircle2, Wand2, RefreshCcw, BarChart3, Clock, MousePointerClick, Download, FileText, Camera, Upload, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import api from '../../utils/api';
import toast from 'react-hot-toast';

interface Setting {
  key: string;
  value: string;
  description: string;
}

const SETTING_LABELS: Record<string, string> = {
  ai_api_key: 'DashScope API Key (留空将使用服务器环境变量)',
  megvii_api_key: '基础版 API Key (Face++)',
  megvii_api_secret: '基础版 API Secret (Face++)',
  megvii_api_url: '基础版 API 接口地址',
  megvii_pro_api_key: '专业版 API Key',
  megvii_pro_api_secret: '专业版 API Secret',
  megvii_pro_api_url: '专业版 API 接口地址',
  ai_quiz_prompt: 'AI 护肤方案守护信生成提示词',
  ai_chat_prompt: 'AI 客服系统提示词 (System Prompt)',
  ai_knowledge_base: 'AI 客服额外知识库 (将被注入到对话上下文中)',
};

type TabType = 'api' | 'prompts' | 'knowledge' | 'operations' | 'megvii-skin';

export default function AdminAI() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('api');
  const [reportLoading, setReportLoading] = useState(false);
  const [reportData, setReportData] = useState<string | null>(null);
  const [stats, setStats] = useState<any[]>([]);
  const [statsLoading, setStatsLoading] = useState(false);
  const [reportsList, setReportsList] = useState<any[]>([]);
  const [chatLogs, setChatLogs] = useState<any[]>([]);
  const [chatLogsLoading, setChatLogsLoading] = useState(false);
  const [expandedLogId, setExpandedLogId] = useState<number | null>(null);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());

  // Megvii Skin Analysis State
  const [megviiImage, setMegviiImage] = useState<File | null>(null);
  const [megviiPreview, setMegviiPreview] = useState<string | null>(null);
  const [megviiResult, setMegviiResult] = useState<any>(null);
  const [megviiAnalyzing, setMegviiAnalyzing] = useState(false);
  const megviiFileInputRef = useRef<HTMLInputElement>(null);
  
  const [proImage, setProImage] = useState<File | null>(null);
  const [proPreview, setProPreview] = useState<string | null>(null);
  const [proResult, setProResult] = useState<any>(null);
  const [proAnalyzing, setProAnalyzing] = useState(false);
  const proFileInputRef = useRef<HTMLInputElement>(null);
  const [skinRecords, setSkinRecords] = useState<any[]>([]);
  const [skinRecordsLoading, setSkinRecordsLoading] = useState(false);
  const [expandedRecordId, setExpandedRecordId] = useState<number | null>(null);

  useEffect(() => {
    api.get('/admin/settings').then((data: any) => {
      const map: Record<string, string> = {};
      (data.settings as Setting[]).forEach((s: Setting) => {
        map[s.key] = s.value;
      });
      setSettings(map);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (activeTab === 'operations') {
      setStatsLoading(true);
      api.get('/tracking/stats').then((res: any) => {
        setStats(res.stats || []);
        setStatsLoading(false);
      }).catch(() => {
        setStatsLoading(false);
      });
      fetchReportsList();
    }
  }, [activeTab]);

  const fetchReportsList = () => {
    api.get('/ai/reports').then((res: any) => {
      setReportsList(res.reports || []);
    }).catch(console.error);
  };

  useEffect(() => {
    if (activeTab === 'knowledge') {
      fetchChatLogs();
    } else if (activeTab === 'megvii-skin') {
      fetchSkinRecords();
    }
  }, [activeTab, currentDate]);

  const fetchChatLogs = () => {
    setChatLogsLoading(true);
    const dateStr = currentDate.toISOString().split('T')[0];
    api.get(`/ai/chat-logs?date=${dateStr}`).then((data: any) => {
      setChatLogs(data || []);
      setChatLogsLoading(false);
    }).catch(() => {
      setChatLogsLoading(false);
    });
  };

  const fetchSkinRecords = () => {
    setSkinRecordsLoading(true);
    api.get('/ai/skin-records').then((res: any) => {
      setSkinRecords(res);
      setSkinRecordsLoading(false);
    }).catch(err => {
      console.error(err);
      setSkinRecordsLoading(false);
    });
  };

  const handleUpdateChatLog = async (id: number, newAnswer: string) => {
    try {
      await api.put(`/ai/chat-logs/${id}`, { answer: newAnswer });
      toast.success('回复已更新，并在下次AI对话时生效');
      fetchChatLogs();
    } catch {
      toast.error('更新失败');
    }
  };

  const handleChange = (key: string, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async (keys: string[]) => {
    setSaving(true);
    try {
      for (const key of keys) {
        await api.put(`/admin/settings/${key}`, { value: settings[key] ?? '' });
      }
      toast.success('保存成功！');
    } catch {
      toast.error('保存失败');
    }
    setSaving(false);
  };

  const generateReport = async () => {
    setReportLoading(true);
    try {
      const res: any = await api.post('/ai/operations-report', {}, { timeout: 120000 });
      setReportData(res.report);
      toast.success('报告生成并保存成功');
      fetchReportsList();
      // 生成完毕后刷新统计数据（因为老数据已被清理）
      api.get('/tracking/stats').then((r: any) => setStats(r.stats || []));
    } catch (err: any) {
      toast.error(err.response?.data?.error || '生成失败');
    }
    setReportLoading(false);
  };

  const handleMegviiFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setMegviiImage(file);
      setMegviiPreview(URL.createObjectURL(file));
      setMegviiResult(null);
    }
  };

  const handleAnalyzeMegvii = async () => {
    if (!megviiImage) return;
    setMegviiAnalyzing(true);
    try {
      const formData = new FormData();
      formData.append('image', megviiImage);
      
      const res = await api.post('/skin/analyze/megvii', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      }) as any;
      setMegviiResult(res);
    } catch (err: any) {
      toast.error(err.message || '分析失败');
    }
    setMegviiAnalyzing(false);
    fetchSkinRecords(); // 刷新记录
  };

  const handleProFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setProImage(file);
      setProPreview(URL.createObjectURL(file));
      setProResult(null);
    }
  };

  const handleAnalyzePro = async () => {
    if (!proImage) return;
    setProAnalyzing(true);
    try {
      const formData = new FormData();
      formData.append('image', proImage);
      
      const res = await api.post('/skin/analyze/megvii-pro', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      }) as any;
      setProResult(res);
    } catch (err: any) {
      toast.error(err.message || '专业版分析失败');
    }
    setProAnalyzing(false);
    fetchSkinRecords(); // 刷新记录
  };

  if (loading) return <div className="p-8 text-center text-gray-500">加载中...</div>;

  const tabs: { key: TabType; label: string }[] = [
    { key: 'api', label: 'API 管理' },
    { key: 'prompts', label: 'AI 提示词管理和优化' },
    { key: 'knowledge', label: 'AI 客服与知识库' },
    { key: 'megvii-skin', label: 'AI 皮肤分析' }
  ];

  if (settings['feature_ai_operations'] === '1') {
    tabs.push({ key: 'operations', label: 'AI 智能运营总监' });
  }

  return (
    <div className="max-w-5xl mx-auto p-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">AI大脑管理系统</h1>

      {/* Tab切换 */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.key ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'api' && (
        <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">大模型 API 配置</h2>
          <p className="text-sm text-gray-500 mb-6">配置阿里云 DashScope (通义千问) 等大模型的 API Key。如果留空，系统将尝试读取服务器的 `DASHSCOPE_API_KEY` 环境变量。</p>
          
          <div className="space-y-4 max-w-2xl">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {SETTING_LABELS['ai_api_key']}
              </label>
              <input
                type="password"
                value={settings['ai_api_key'] || ''}
                onChange={e => handleChange('ai_api_key', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm"
                placeholder="sk-..."
              />
            </div>

            <div className="pt-4 border-t">
              <h3 className="text-sm font-semibold text-gray-800 mb-3">基础版测肤 API (Face++)</h3>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {SETTING_LABELS['megvii_api_url']}
                </label>
                <input
                  type="text"
                  value={settings['megvii_api_url'] || ''}
                  onChange={e => handleChange('megvii_api_url', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm font-mono text-gray-600"
                  placeholder="默认: https://api-cn.faceplusplus.com/facepp/v1/skinanalyze"
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {SETTING_LABELS['megvii_api_key']}
                  </label>
                  <input
                    type="password"
                    value={settings['megvii_api_key'] || ''}
                    onChange={e => handleChange('megvii_api_key', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                    placeholder="API Key"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {SETTING_LABELS['megvii_api_secret']}
                  </label>
                  <input
                    type="password"
                    value={settings['megvii_api_secret'] || ''}
                    onChange={e => handleChange('megvii_api_secret', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                    placeholder="API Secret"
                  />
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-800">启用基础版照片测肤</div>
                  <div className="text-sm text-gray-500 mt-1">开启后前端将允许用户使用该接口进行基础皮肤分析</div>
                </div>
                <button
                  onClick={() => handleChange('feature_skin_analysis', settings['feature_skin_analysis'] === '1' ? '0' : '1')}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings['feature_skin_analysis'] === '1' ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings['feature_skin_analysis'] === '1' ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>

            <div className="pt-4 border-t">
              <h3 className="text-sm font-semibold text-gray-800 mb-3">专业版测肤 API (Face++ Pro 或 FaceStyle)</h3>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {SETTING_LABELS['megvii_pro_api_url']}
                </label>
                <input
                  type="text"
                  value={settings['megvii_pro_api_url'] || ''}
                  onChange={e => handleChange('megvii_pro_api_url', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm font-mono text-gray-600"
                  placeholder="默认: https://api-cn.faceplusplus.com/facepp/v1/skinanalyze_advanced"
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {SETTING_LABELS['megvii_pro_api_key']}
                  </label>
                  <input
                    type="password"
                    value={settings['megvii_pro_api_key'] || ''}
                    onChange={e => handleChange('megvii_pro_api_key', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                    placeholder="Pro API Key"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {SETTING_LABELS['megvii_pro_api_secret']}
                  </label>
                  <input
                    type="password"
                    value={settings['megvii_pro_api_secret'] || ''}
                    onChange={e => handleChange('megvii_pro_api_secret', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                    placeholder="Pro API Secret"
                  />
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-800">启用专业版照片测肤</div>
                  <div className="text-sm text-gray-500 mt-1">开启后前端将允许用户使用专业版接口进行测肤 (返回维度更全)</div>
                </div>
                <button
                  onClick={() => handleChange('feature_skin_analysis_pro', settings['feature_skin_analysis_pro'] === '1' ? '0' : '1')}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings['feature_skin_analysis_pro'] === '1' ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings['feature_skin_analysis_pro'] === '1' ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>

            <button
              onClick={() => handleSave(['ai_api_key', 'megvii_api_url', 'megvii_api_key', 'megvii_api_secret', 'feature_skin_analysis', 'megvii_pro_api_url', 'megvii_pro_api_key', 'megvii_pro_api_secret', 'feature_skin_analysis_pro'])}
              disabled={saving}
              className="mt-6 flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm disabled:opacity-50"
            >
              <Save size={14} /> 保存 API 配置
            </button>
          </div>
        </div>
      )}

      {activeTab === 'prompts' && (
        <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">AI 提示词管理和优化</h2>
          <p className="text-sm text-gray-500 mb-6">调整 AI 在不同场景下的表现和人设。你可以在这里深度定制 AI 护肤顾问的回复风格。</p>
          
          <div className="space-y-8 max-w-3xl">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {SETTING_LABELS['ai_quiz_prompt']}
              </label>
              <p className="text-xs text-gray-500 mb-2">用于测肤问卷结果页生成“护肤守护信”。支持变量 (将由系统自动替换)：{`{userAge}`}, {`{userSkin}`}, {`{userConcern}`}, {`{productNames}`}</p>
              <textarea
                value={settings['ai_quiz_prompt'] || ''}
                onChange={e => handleChange('ai_quiz_prompt', e.target.value)}
                rows={8}
                className="w-full px-3 py-2 border rounded-lg text-sm font-mono"
                placeholder={`你是一位名为 TRASOCHY AI 的资深院线级护肤专家。
现在有一位用户完成了测肤问卷：
- 年龄段：{userAge}
- 肤质：{userSkin}
- 核心诉求：{userConcern}

系统已经为TA匹配了以下 3 款产品：{productNames}。
...`}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {SETTING_LABELS['ai_chat_prompt']}
              </label>
              <p className="text-xs text-gray-500 mb-2">用于悬浮 AI 客服对话的系统提示词，定义客服的人设、语气和工作原则。</p>
              <textarea
                value={settings['ai_chat_prompt'] || ''}
                onChange={e => handleChange('ai_chat_prompt', e.target.value)}
                rows={8}
                className="w-full px-3 py-2 border rounded-lg text-sm font-mono"
                placeholder="你是 TRASOCHY 护肤商城的高级 AI 智能客服助手。你的任务是耐心、专业、温柔地解答客户的护肤疑问..."
              />
            </div>

            <button
              onClick={() => handleSave(['ai_quiz_prompt', 'ai_chat_prompt'])}
              disabled={saving}
              className="flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm disabled:opacity-50"
            >
              <Save size={14} /> 保存提示词配置
            </button>
          </div>
        </div>
      )}

      {activeTab === 'knowledge' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">AI 客服与知识库</h2>
            <p className="text-sm text-gray-500 mb-6">在此输入额外的品牌知识、常见问题解答、售后政策等。这些内容将作为额外知识补充给 AI 客服，提升回答的准确率。</p>
            
            <div className="space-y-4 max-w-3xl">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {SETTING_LABELS['ai_knowledge_base']}
                </label>
                <textarea
                  value={settings['ai_knowledge_base'] || ''}
                  onChange={e => handleChange('ai_knowledge_base', e.target.value)}
                  rows={8}
                  className="w-full px-3 py-2 border rounded-lg text-sm font-mono"
                  placeholder="例如：\n【退换货政策】支持7天无理由退换货，破损包赔...\n【品牌故事】TRASOCHY创立于2020年...\n【常见问题】精华液应该在乳液前使用..."
                />
              </div>
              <button
                onClick={() => handleSave(['ai_knowledge_base'])}
                disabled={saving}
                className="flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm disabled:opacity-50"
              >
                <Save size={14} /> 保存知识库
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
              <h2 className="text-lg font-semibold text-gray-800">客户提问记录 (人工修正)</h2>
              <div className="flex items-center gap-3 bg-gray-50 px-3 py-1.5 rounded-lg border">
                <button 
                  onClick={() => {
                    const d = new Date(currentDate);
                    d.setDate(d.getDate() - 1);
                    setCurrentDate(d);
                  }} 
                  className="text-sm font-medium text-blue-600 hover:text-blue-800 transition"
                >
                  &laquo; 前一天
                </button>
                <span className="text-sm font-medium text-gray-700 w-24 text-center">
                  {currentDate.toISOString().split('T')[0]}
                </span>
                <button 
                  onClick={() => {
                    const d = new Date(currentDate);
                    d.setDate(d.getDate() + 1);
                    if (d <= new Date()) setCurrentDate(d);
                  }} 
                  disabled={currentDate.toDateString() === new Date().toDateString()} 
                  className="text-sm font-medium text-blue-600 hover:text-blue-800 disabled:text-gray-400 transition"
                >
                  后一天 &raquo;
                </button>
              </div>
            </div>
            <p className="text-sm text-gray-500 mb-6">这里展示了客户向 AI 助手提出的真实问题及回答。当您修改并自动保存了 AI 的回答后，这组问答将作为标准示例喂给 AI，从而修正未来类似问题的回答。</p>
            
            {chatLogsLoading ? (
              <div className="text-center text-sm text-gray-500 py-8">加载中...</div>
            ) : chatLogs.length === 0 ? (
              <div className="text-center text-sm text-gray-400 py-8">暂无提问记录</div>
            ) : (
              <div className="overflow-x-auto border rounded-xl">
                <table className="w-full text-left text-sm text-gray-600 table-fixed">
                  <thead className="bg-gray-50 border-b text-xs text-gray-500">
                    <tr>
                      <th className="px-3 py-2 font-medium w-[25%]">客户提问</th>
                      <th className="px-3 py-2 font-medium w-[55%]">AI 客服回复 (点击修改)</th>
                      <th className="px-3 py-2 font-medium text-right w-[20%]">状态 / 时间</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {chatLogs.map(log => (
                      <tr key={log.id} className={`hover:bg-gray-50 transition-colors ${log.is_modified ? 'bg-amber-50/30' : ''}`}>
                        <td className="px-3 py-2 align-middle overflow-hidden">
                          <p className="text-gray-800 font-medium truncate" title={log.question}>{log.question}</p>
                        </td>
                        <td className="px-3 py-2 align-middle">
                          {expandedLogId === log.id ? (
                            <textarea
                              autoFocus
                              defaultValue={log.answer}
                              onBlur={(e) => {
                                if (e.target.value !== log.answer) {
                                  handleUpdateChatLog(log.id, e.target.value);
                                }
                                setExpandedLogId(null);
                              }}
                              rows={4}
                              className="w-full px-3 py-2 border border-blue-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-400 shadow-sm"
                              placeholder="修改此处的内容，失去焦点后自动保存..."
                            />
                          ) : (
                            <div 
                              onClick={() => setExpandedLogId(log.id)}
                              className="w-full px-3 py-2 border border-transparent hover:border-gray-200 hover:bg-white rounded-lg text-sm text-gray-600 truncate cursor-pointer transition-colors"
                              title="点击展开并修改"
                            >
                              {log.answer}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2 align-middle text-right">
                          <div className="flex flex-col items-end gap-0.5">
                            {log.is_modified === 1 && <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-700">人工已修正</span>}
                            <span className="text-xs text-gray-400">{new Date(log.created_at).toLocaleString()}</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'operations' && (
        <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Wand2 className="text-purple-600" size={20} /> AI 智能运营总监
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            基于全站用户在前端留下的无感行为埋点（如：浏览路径、停留时长、加购等），一键让 AI 分析数据并给出商品调整与营销活动建议。
          </p>

          <div className="mb-8 border rounded-xl overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b flex items-center gap-2">
              <BarChart3 size={18} className="text-gray-600" />
              <span className="font-medium text-gray-700 text-sm">近期采集到的原始行为数据概览 (Top 20)</span>
            </div>
            {statsLoading ? (
              <div className="p-8 text-center text-gray-400 text-sm">加载数据中...</div>
            ) : stats.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">暂无数据，请等待前端采集</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-600">
                  <thead className="bg-white border-b text-xs uppercase text-gray-500">
                    <tr>
                      <th className="px-4 py-3 font-medium">行为类型</th>
                      <th className="px-4 py-3 font-medium">路径 / 商品</th>
                      <th className="px-4 py-3 font-medium text-right">总停留时长</th>
                      <th className="px-4 py-3 font-medium text-right">触发次数</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {stats.map((s, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${s.action_type === 'page_view' ? 'bg-blue-50 text-blue-700' : 'bg-green-50 text-green-700'}`}>
                            {s.action_type === 'page_view' ? <Clock size={12} /> : <MousePointerClick size={12} />}
                            {s.action_type === 'page_view' ? '页面停留' : s.action_type}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-mono text-xs text-gray-400">{s.path}</div>
                          {s.product_name && <div className="text-gray-800 mt-0.5">{s.product_name}</div>}
                        </td>
                        <td className="px-4 py-3 text-right font-mono">{s.total_dwell > 0 ? `${s.total_dwell} s` : '-'}</td>
                        <td className="px-4 py-3 text-right font-mono">{s.action_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <button
            onClick={generateReport}
            disabled={reportLoading}
            className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition disabled:opacity-50 mb-8 shadow-sm"
          >
            {reportLoading ? <RefreshCcw size={18} className="animate-spin" /> : <Wand2 size={18} />}
            {reportLoading ? 'AI 正在深度分析近期数据并生成报告...' : '生成最新《运营推广策略报告》（并清理旧数据）'}
          </button>

          {reportsList.length > 0 && (
            <div className="mb-8 border rounded-xl overflow-hidden">
              <div className="bg-gray-50 px-4 py-3 border-b flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText size={18} className="text-gray-600" />
                  <span className="font-medium text-gray-700 text-sm">历史自动化周报与存档</span>
                </div>
                <span className="text-xs text-gray-400">系统每周一凌晨自动生成</span>
              </div>
              <div className="divide-y">
                {reportsList.map((r, i) => (
                  <div key={i} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                        <FileText size={14} />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-800">{r.filename}</div>
                        <div className="text-xs text-gray-400 mt-0.5">
                          {new Date(r.createdAt).toLocaleString()} · {(r.size / 1024).toFixed(1)} KB
                        </div>
                      </div>
                    </div>
                    <a
                      href={r.url}
                      download={r.filename}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1 font-medium bg-blue-50 px-3 py-1.5 rounded-lg transition"
                    >
                      <Download size={14} /> 下载 (Markdown)
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {reportData && (
            <div className="border border-purple-100 rounded-xl overflow-hidden bg-purple-50/30">
              <div className="bg-purple-100/50 px-6 py-3 border-b border-purple-100 font-medium text-purple-800">
                AI 运营洞察报告
              </div>
              <div className="p-6">
                <div className="prose prose-purple max-w-none text-sm text-gray-700">
                  <ReactMarkdown>{reportData}</ReactMarkdown>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'megvii-skin' && (
        <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Camera className="text-blue-600" size={20} /> AI 皮肤分析模块
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            此处为管理员测试 AI 皮肤分析接口的通道。请确保您的 <code>.env</code> 中已正确配置 <code>MEGVII_API_KEY</code> 和 <code>MEGVII_API_SECRET</code>。
          </p>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 左侧：连通性测试模块（竖排） */}
            <div className="flex flex-col gap-6 lg:col-span-1">
              {/* 基础版测试模块 */}
              <div className="bg-neutral-50 p-6 rounded-2xl border border-neutral-100 h-fit">
              <h3 className="font-medium text-gray-800 mb-4 text-center">基础版连通性测试</h3>
              {!megviiPreview ? (
                <div 
                  onClick={() => megviiFileInputRef.current?.click()}
                  className="border-2 border-dashed border-neutral-300 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer hover:bg-neutral-100 transition-colors bg-white"
                >
                  <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-3">
                    <Upload className="w-6 h-6" />
                  </div>
                  <span className="text-gray-600 font-medium text-sm">点击上传人脸照片</span>
                </div>
              ) : (
                <div className="relative rounded-xl overflow-hidden bg-black flex justify-center mb-4">
                  <img src={megviiPreview} alt="Preview" className="w-full h-auto object-contain max-h-[300px]" />
                  {!megviiAnalyzing && (
                    <button 
                      onClick={() => { setMegviiImage(null); setMegviiPreview(null); setMegviiResult(null); }}
                      className="absolute top-2 right-2 bg-black/50 text-white text-xs px-3 py-1 rounded-full backdrop-blur-sm hover:bg-black/70 transition"
                    >
                      重新上传
                    </button>
                  )}
                </div>
              )}
              
              <input 
                type="file" 
                ref={megviiFileInputRef} 
                onChange={handleMegviiFileChange} 
                accept="image/*" 
                className="hidden" 
              />

              {megviiPreview && !megviiResult && (
                <button 
                  onClick={handleAnalyzeMegvii}
                  disabled={megviiAnalyzing}
                  className="w-full bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-all mt-4"
                >
                  {megviiAnalyzing ? <><Loader2 className="w-4 h-4 animate-spin" /> 分析中...</> : '开始分析测试'}
                </button>
              )}

              {megviiResult && (
                <div className="mt-6 space-y-4 animate-in fade-in">
                  <div className="bg-white p-4 rounded-xl border border-blue-100 shadow-sm">
                    <h4 className="font-medium text-gray-800 mb-2 flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-green-500" /> 分析成功
                    </h4>
                    <div className="text-sm text-gray-600 mb-2">识别到的皮肤诉求:</div>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {megviiResult.concerns?.map((c: string, i: number) => (
                        <span key={i} className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-md text-xs font-medium">{c}</span>
                      ))}
                    </div>
                    
                    <div className="text-sm text-gray-600 mb-2">推荐匹配商品:</div>
                    <div className="space-y-2">
                      {megviiResult.recommendations?.map((p: any) => (
                        <div key={p.id} className="flex items-center gap-2 border p-2 rounded bg-gray-50">
                          <img src={p.mainImage || '/images/default-product.png'} className="w-8 h-8 rounded object-cover" />
                          <span className="text-xs text-gray-800 flex-1 truncate">{p.name}</span>
                          <span className="text-xs font-bold text-red-500">¥{p.basePrice}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-gray-900 rounded-xl p-4 overflow-auto max-h-60">
                    <div className="text-xs text-gray-400 mb-2 font-mono">原始 JSON 返回:</div>
                    <pre className="text-[10px] text-green-400 font-mono whitespace-pre-wrap">
                      {JSON.stringify(megviiResult.result, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>

              {/* 专业版测试模块 */}
              <div className="bg-neutral-50 p-6 rounded-2xl border border-neutral-100 h-fit">
              <h3 className="font-medium text-purple-800 mb-4 text-center">专业版连通性测试</h3>
              {!proPreview ? (
                <div 
                  onClick={() => proFileInputRef.current?.click()}
                  className="border-2 border-dashed border-purple-200 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer hover:bg-purple-50 transition-colors bg-white"
                >
                  <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mb-3">
                    <Upload className="w-6 h-6" />
                  </div>
                  <span className="text-gray-600 font-medium text-sm">点击上传人脸照片</span>
                </div>
              ) : (
                <div className="relative rounded-xl overflow-hidden bg-black flex justify-center mb-4">
                  <img src={proPreview} alt="Preview" className="w-full h-auto object-contain max-h-[300px]" />
                  {!proAnalyzing && (
                    <button 
                      onClick={() => { setProImage(null); setProPreview(null); setProResult(null); }}
                      className="absolute top-2 right-2 bg-black/50 text-white text-xs px-3 py-1 rounded-full backdrop-blur-sm hover:bg-black/70 transition"
                    >
                      重新上传
                    </button>
                  )}
                </div>
              )}
              
              <input 
                type="file" 
                ref={proFileInputRef} 
                onChange={handleProFileChange} 
                accept="image/*" 
                className="hidden" 
              />

              {proPreview && !proResult && (
                <button 
                  onClick={handleAnalyzePro}
                  disabled={proAnalyzing}
                  className="w-full bg-purple-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-all mt-4"
                >
                  {proAnalyzing ? <><Loader2 className="w-4 h-4 animate-spin" /> 分析中...</> : '开始专业版测试'}
                </button>
              )}

              {proResult && (
                <div className="mt-6 space-y-4 animate-in fade-in">
                  <div className="bg-white p-4 rounded-xl border border-purple-100 shadow-sm">
                    <h4 className="font-medium text-gray-800 mb-2 flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-green-500" /> 分析成功
                    </h4>
                    <div className="text-sm text-gray-600 mb-2">识别到的皮肤诉求:</div>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {proResult.concerns?.map((c: string, i: number) => (
                        <span key={i} className="bg-purple-50 text-purple-700 px-2.5 py-1 rounded-md text-xs font-medium">{c}</span>
                      ))}
                    </div>
                    
                    <div className="text-sm text-gray-600 mb-2">推荐匹配商品:</div>
                    <div className="space-y-2">
                      {proResult.recommendations?.map((p: any) => (
                        <div key={p.id} className="flex items-center gap-2 border p-2 rounded bg-gray-50">
                          <img src={p.mainImage || '/images/default-product.png'} className="w-8 h-8 rounded object-cover" />
                          <span className="text-xs text-gray-800 flex-1 truncate">{p.name}</span>
                          <span className="text-xs font-bold text-red-500">¥{p.basePrice}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-gray-900 rounded-xl p-4 overflow-auto max-h-60">
                    <div className="text-xs text-gray-400 mb-2 font-mono">原始 JSON 返回:</div>
                    <pre className="text-[10px] text-green-400 font-mono whitespace-pre-wrap">
                      {JSON.stringify(proResult.result, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
            </div>

            {/* 右侧：用户上传历史 (铺开占2列) */}
            <div className="bg-white p-6 rounded-2xl border border-neutral-100 lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-gray-800">用户皮肤检测历史</h3>
                <button onClick={fetchSkinRecords} className="text-blue-500 hover:text-blue-700 text-sm flex items-center gap-1">
                  <RefreshCcw size={14} /> 刷新
                </button>
              </div>
              
              {skinRecordsLoading ? (
                <div className="text-center py-8 text-gray-400 text-sm">加载中...</div>
              ) : skinRecords.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm bg-gray-50 rounded-xl">暂无用户测肤记录</div>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                  {skinRecords.map((record) => (
                    <div key={record.id} className="border border-gray-100 rounded-xl p-4 shadow-sm hover:shadow transition-shadow">
                      <div className="flex gap-4">
                        <img 
                          src={record.image_url} 
                          alt="User upload" 
                          className="w-16 h-16 rounded-lg object-cover bg-black"
                          onError={(e) => { (e.target as HTMLImageElement).src = '/images/default-avatar.png'; }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-sm text-gray-800 truncate">{record.user_name || '匿名游客'}</span>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded ${record.type === 'pro' ? 'bg-purple-50 text-purple-600 border border-purple-100' : 'bg-blue-50 text-blue-600 border border-blue-100'}`}>
                                  {record.type === 'pro' ? '深度测试' : '普通测试'}
                                </span>
                              </div>
                              <div className="text-xs text-gray-500 truncate">{record.user_email || '未绑定邮箱'}</div>
                            </div>
                            <div className="text-xs text-gray-400 whitespace-nowrap ml-2">
                              {new Date(record.created_at).toLocaleString()}
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between mt-3">
                            <button
                              onClick={() => window.open(`/skin-analysis-pro/report/${record.id}`, '_blank')}
                              className="text-xs text-blue-500 hover:underline"
                            >
                              查看分析报告
                            </button>
                            <button
                              onClick={async () => {
                                if (window.confirm('确定要删除此条测肤记录吗？')) {
                                  try {
                                    await api.delete(`/ai/skin-records/${record.id}`);
                                    toast.success('删除成功');
                                    fetchSkinRecords();
                                  } catch (e: any) {
                                    toast.error(e.response?.data?.error || '删除失败');
                                  }
                                }
                              }}
                              className="text-xs text-rose-500 hover:text-rose-600 transition"
                            >
                              删除记录
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
