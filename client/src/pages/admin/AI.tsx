import { 
  Save, AlertTriangle, CheckCircle2, Wand2, RefreshCcw, BarChart3, Clock, 
  MousePointerClick, Download, FileText, Camera, Upload, Loader2, Flame, 
  ShoppingBag, Eye, Sparkles 
} from 'lucide-react';
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

type TabType = 'api' | 'prompts' | 'knowledge' | 'operations' | 'megvii-skin' | 'dreamina';

export default function AdminAI() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('api');
  const [reportLoading, setReportLoading] = useState(false);
  const [reportData, setReportData] = useState<string | null>(null);
  const [stats, setStats] = useState<any[]>([]);
  const [productStats, setProductStats] = useState<any[]>([]);
  const [dwellSummary, setDwellSummary] = useState<any>(null);
  const [recentDwellLogs, setRecentDwellLogs] = useState<any[]>([]);
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

  // Dreamina State Variables
  const [dreaminaStatus, setDreaminaStatus] = useState<{ loggedIn: boolean; credit?: number; hasCliPermission?: boolean } | null>(null);
  const [dreaminaStatusLoading, setDreaminaStatusLoading] = useState(false);
  const [dreaminaLoginQr, setDreaminaLoginQr] = useState<string | null>(null);
  const [dreaminaVerificationUri, setDreaminaVerificationUri] = useState<string | null>(null);
  const [dreaminaUserCode, setDreaminaUserCode] = useState<string | null>(null);
  const [dreaminaLoginLoading, setDreaminaLoginLoading] = useState(false);
  const [dreaminaPrompt, setDreaminaPrompt] = useState('');
  const [dreaminaRatio, setDreaminaRatio] = useState('1:1');
  const [dreaminaModel, setDreaminaModel] = useState('4.5');
  const [dreaminaResolution, setDreaminaResolution] = useState('2k');
  const [dreaminaTasks, setDreaminaTasks] = useState<any[]>([]);
  const [dreaminaTasksLoading, setDreaminaTasksLoading] = useState(false);
  const [dreaminaGenerating, setDreaminaGenerating] = useState(false);
  const dreaminaPollIntervalRef = useRef<any>(null);

  const fetchDreaminaStatus = async () => {
    setDreaminaStatusLoading(true);
    try {
      const res: any = await api.get('/ai/dreamina/status');
      setDreaminaStatus(res);
    } catch (e) {
      console.error(e);
    }
    setDreaminaStatusLoading(false);
  };

  const fetchDreaminaTasks = async () => {
    setDreaminaTasksLoading(true);
    try {
      const res: any = await api.get('/ai/dreamina/tasks');
      setDreaminaTasks(res || []);
    } catch (e) {
      console.error(e);
    }
    setDreaminaTasksLoading(false);
  };

  const handleDreaminaLogin = async () => {
    setDreaminaLoginLoading(true);
    setDreaminaLoginQr(null);
    setDreaminaVerificationUri(null);
    setDreaminaUserCode(null);
    try {
      const res: any = await api.post('/ai/dreamina/login', {});
      if (res.verificationUri && res.userCode) {
        setDreaminaVerificationUri(res.verificationUri);
        setDreaminaUserCode(res.userCode);
        toast.success('登录授权链接与验证激活码已就绪');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || '启动登录失败');
    }
    setDreaminaLoginLoading(false);
  };

  const handleDreaminaGenerate = async () => {
    if (!dreaminaPrompt.trim()) {
      toast.error('请输入生成提示词');
      return;
    }
    setDreaminaGenerating(true);
    try {
      const res: any = await api.post('/ai/dreamina/generate', {
        prompt: dreaminaPrompt,
        ratio: dreaminaRatio,
        model: dreaminaModel,
        resolutionType: dreaminaResolution
      });
      toast.success(res.message || '生成任务提交成功！正在排队渲染');
      setDreaminaPrompt('');
      fetchDreaminaTasks();
    } catch (err: any) {
      toast.error(err.response?.data?.error || '生成失败');
    }
    setDreaminaGenerating(false);
  };

  const handleDreaminaLogout = async () => {
    if (!window.confirm('确定要退出当前即梦账号并切换其他账号登录吗？')) {
      return;
    }
    try {
      await api.post('/ai/dreamina/logout', {});
      toast.success('已成功清除本地登录态，请进行新账号授权。');
      setDreaminaStatus(null);
      setDreaminaUserCode(null);
      setDreaminaVerificationUri(null);
      fetchDreaminaStatus();
    } catch (err: any) {
      toast.error(err.response?.data?.error || '退出登录失败');
    }
  };

  useEffect(() => {
    if (activeTab === 'dreamina') {
      fetchDreaminaStatus();
      fetchDreaminaTasks();
      
      dreaminaPollIntervalRef.current = setInterval(() => {
        api.get('/ai/dreamina/tasks').then((res: any) => {
          setDreaminaTasks(res || []);
        }).catch(console.error);
        api.get('/ai/dreamina/status').then((res: any) => {
          setDreaminaStatus(res);
        }).catch(console.error);
      }, 10000);
    } else {
      if (dreaminaPollIntervalRef.current) {
        clearInterval(dreaminaPollIntervalRef.current);
        dreaminaPollIntervalRef.current = null;
      }
    }

    return () => {
      if (dreaminaPollIntervalRef.current) {
        clearInterval(dreaminaPollIntervalRef.current);
      }
    };
  }, [activeTab]);

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

  const fetchTrackingStats = () => {
    setStatsLoading(true);
    api.get('/tracking/stats').then((res: any) => {
      setStats(res?.stats || []);
      setProductStats(res?.productStats || []);
      setDwellSummary(res?.summary || null);
      setRecentDwellLogs(res?.recentLogs || []);
      setStatsLoading(false);
    }).catch(() => {
      setStatsLoading(false);
    });
  };

  useEffect(() => {
    if (activeTab === 'operations') {
      fetchTrackingStats();
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
      fetchTrackingStats();
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
    { key: 'megvii-skin', label: 'AI 皮肤分析' },
    { key: 'dreamina', label: '即梦 AI 绘图' }
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
        <div className="space-y-6 mb-6">
          {/* 头部标题与操作 */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <Wand2 className="text-purple-600" size={22} /> AI 智能运营总监 · 客户商品停留与行为洞察
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  精准记录客户进入每个商品详情页面的停留时间、浏览频次与流失风险，由 AI 运营总监提供深度数据洞察与策略报告。
                </p>
              </div>
              <button
                type="button"
                onClick={fetchTrackingStats}
                disabled={statsLoading}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition active:scale-95 shrink-0"
              >
                <RefreshCcw size={14} className={statsLoading ? 'animate-spin text-purple-600' : 'text-gray-500'} />
                {statsLoading ? '正在刷新...' : '刷新停留数据'}
              </button>
            </div>

            {/* 4 大核心指标卡片 */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
              <div className="bg-purple-50/50 border border-purple-100/80 rounded-xl p-4 flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                  <Clock size={20} />
                </div>
                <div>
                  <p className="text-[11px] text-purple-600 font-semibold uppercase tracking-wider">商品累计总停留时长</p>
                  <p className="text-xl font-bold font-mono text-gray-900 mt-0.5">
                    {dwellSummary?.totalProductDwellSeconds >= 60 
                      ? `${(dwellSummary.totalProductDwellSeconds / 60).toFixed(1)} 分钟` 
                      : `${dwellSummary?.totalProductDwellSeconds || 0} 秒`}
                  </p>
                </div>
              </div>

              <div className="bg-blue-50/50 border border-blue-100/80 rounded-xl p-4 flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                  <TrendingUp size={20} />
                </div>
                <div>
                  <p className="text-[11px] text-blue-600 font-semibold uppercase tracking-wider">商品平均单次停留</p>
                  <p className="text-xl font-bold font-mono text-gray-900 mt-0.5">
                    {dwellSummary?.avgProductDwellSeconds || 0} <span className="text-xs font-normal text-gray-500">秒 / 次</span>
                  </p>
                </div>
              </div>

              <div className="bg-amber-50/50 border border-amber-100/80 rounded-xl p-4 flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                  <Flame size={20} />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] text-amber-700 font-semibold uppercase tracking-wider">客户最关注商品 (停留最长)</p>
                  <p className="text-sm font-bold text-gray-900 mt-0.5 truncate" title={dwellSummary?.topDwellProduct?.name || '暂无数据'}>
                    {dwellSummary?.topDwellProduct?.name || '暂无数据'}
                  </p>
                  {dwellSummary?.topDwellProduct && (
                    <p className="text-[10px] text-amber-600 font-mono">累计 {dwellSummary.topDwellProduct.total_dwell_seconds} 秒 (均 {dwellSummary.topDwellProduct.avg_dwell_seconds}s)</p>
                  )}
                </div>
              </div>

              <div className="bg-emerald-50/50 border border-emerald-100/80 rounded-xl p-4 flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                  <Eye size={20} />
                </div>
                <div>
                  <p className="text-[11px] text-emerald-700 font-semibold uppercase tracking-wider">商品总浏览热度</p>
                  <p className="text-xl font-bold font-mono text-gray-900 mt-0.5">
                    {dwellSummary?.totalProductViews || 0} <span className="text-xs font-normal text-gray-500">人次</span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 重点模块 1：客户商品页面停留时间排行 */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ShoppingBag size={18} className="text-purple-600" />
                <h3 className="font-bold text-gray-800 text-sm">🛍️ 客户进入各商品页面的停留时长排行榜</h3>
              </div>
              <span className="text-xs text-gray-400">数据随用户进入商品详情页自动无感上报</span>
            </div>

            {statsLoading ? (
              <div className="p-8 text-center text-gray-400 text-sm">正在加载停留时长数据...</div>
            ) : productStats.length === 0 ? (
              <div className="p-10 text-center text-gray-400 text-xs bg-gray-50 rounded-xl border border-dashed">
                暂无商品停留记录，当用户在商城浏览商品详情页时，将在此自动实时呈现
              </div>
            ) : (
              <div className="overflow-x-auto border border-gray-100 rounded-xl">
                <table className="w-full text-left text-xs text-gray-600">
                  <thead className="bg-gray-50/80 border-b border-gray-100 text-gray-400">
                    <tr>
                      <th className="py-3 px-4 w-12 text-center">排名</th>
                      <th className="py-3 px-4">商品名称 / 分类</th>
                      <th className="py-3 px-4">售价</th>
                      <th className="py-3 px-4 text-right">累计总停留时长</th>
                      <th className="py-3 px-4 text-right">平均每次停留</th>
                      <th className="py-3 px-4 text-right">浏览人次 / 独立访客</th>
                      <th className="py-3 px-4 text-center">客户关注度评级</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {productStats.map((p: any, idx: number) => {
                      const isHigh = p.avg_dwell_seconds >= 60 || p.total_dwell_seconds >= 120;
                      const isMedium = p.avg_dwell_seconds >= 20;
                      return (
                        <tr key={p.product_id || idx} className="hover:bg-gray-50/70 transition-colors">
                          <td className="py-3 px-4 text-center font-mono font-bold text-gray-400">
                            {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              {p.product_image ? (
                                <img src={p.product_image} alt={p.product_name} className="w-8 h-8 rounded object-cover border" />
                              ) : (
                                <div className="w-8 h-8 rounded bg-gray-100 text-gray-400 flex items-center justify-center text-xs">◆</div>
                              )}
                              <div>
                                <p className="font-semibold text-gray-800 line-clamp-1">{p.product_name}</p>
                                <p className="text-[10px] text-gray-400 font-mono">/products/{p.product_slug}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-gray-700">
                            ¥{p.product_price}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-purple-700">
                            {p.total_dwell_seconds >= 60 
                              ? `${(p.total_dwell_seconds / 60).toFixed(1)} 分钟` 
                              : `${p.total_dwell_seconds} 秒`}
                          </td>
                          <td className="py-3 px-4 text-right font-mono">
                            <span className={`px-2 py-0.5 rounded font-semibold ${
                              isHigh ? 'bg-rose-50 text-rose-700' : isMedium ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-600'
                            }`}>
                              {p.avg_dwell_seconds} 秒
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-gray-600">
                            <b>{p.view_count}</b> 次 / {p.unique_visitors} 人
                          </td>
                          <td className="py-3 px-4 text-center">
                            {isHigh ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-100 text-rose-800 rounded-full font-bold text-[10px]">
                                <Flame size={12} className="text-rose-600" /> 深度兴趣
                              </span>
                            ) : isMedium ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full font-medium text-[10px]">
                                ⚡ 正常浏览
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-stone-100 text-stone-600 rounded-full text-[10px]">
                                ❄️ 快速跳出
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* 重点模块 2：实时客户进店与商品停留流水 */}
          {recentDwellLogs.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Clock size={16} className="text-gray-600" />
                  <h3 className="font-bold text-gray-800 text-sm">⏱️ 实时客户进店与商品停留记录流水 (最新 50 条)</h3>
                </div>
                <span className="text-xs text-gray-400 font-mono">共记录 {recentDwellLogs.length} 条</span>
              </div>

              <div className="max-h-60 overflow-y-auto border border-gray-100 rounded-xl divide-y divide-gray-100 text-xs">
                {recentDwellLogs.map((log: any) => (
                  <div key={log.id} className="p-3 flex items-center justify-between hover:bg-gray-50/50">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-gray-400 select-all">#{log.session_id.slice(0, 8)}</span>
                      <span className="text-gray-700 font-medium">{log.user_name || '访客 (Guest)'}</span>
                      {log.product_name ? (
                        <span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded border border-purple-100 font-medium">
                          🛍️ {log.product_name}
                        </span>
                      ) : (
                        <span className="text-gray-400 font-mono">{log.path}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-mono font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded">
                        停留 {log.dwell_time} 秒
                      </span>
                      <span className="text-gray-400">{new Date(log.created_at).toLocaleTimeString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 重点模块 3：AI 智能运营报告生成 */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                  <Sparkles size={16} className="text-purple-600" /> AI 首席电商运营总监策略生成
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  点击让大模型针对上述商品停留时长、跳出率及转化数据进行多维商业分析，并输出实操推广方案。
                </p>
              </div>
              <button
                onClick={generateReport}
                disabled={reportLoading}
                className="flex items-center gap-2 px-5 py-2.5 bg-stone-900 text-white font-medium rounded-xl hover:bg-stone-800 transition disabled:opacity-50 shadow-sm shrink-0 text-xs"
              >
                {reportLoading ? <RefreshCcw size={15} className="animate-spin text-purple-400" /> : <Wand2 size={15} className="text-purple-400" />}
                {reportLoading ? 'AI 正在深度分析商品停留时长并生成报告...' : '一键生成最新《商品运营与推广策略报告》'}
              </button>
            </div>

            {/* 报告在线展示 */}
            {reportData && (
              <div className="border border-purple-100 rounded-xl overflow-hidden bg-purple-50/20 mb-6">
                <div className="bg-purple-100/60 px-5 py-3 border-b border-purple-100 font-bold text-xs text-purple-900 flex items-center justify-between">
                  <span>📊 AI 运营总监最新策略报告</span>
                  <span className="font-normal text-purple-600">已自动归档存储</span>
                </div>
                <div className="p-6">
                  <div className="prose prose-purple max-w-none text-xs leading-relaxed text-gray-800">
                    <ReactMarkdown>{reportData}</ReactMarkdown>
                  </div>
                </div>
              </div>
            )}

            {/* 历史报告归档 */}
            {reportsList.length > 0 && (
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-200 flex items-center justify-between text-xs">
                  <span className="font-semibold text-gray-700 flex items-center gap-1.5">
                    <FileText size={14} className="text-gray-500" /> 历史运营报告归档 ({reportsList.length} 份)
                  </span>
                  <span className="text-gray-400">系统支持定时每周生成与手动即时生成</span>
                </div>
                <div className="divide-y divide-gray-100 max-h-56 overflow-y-auto text-xs">
                  {reportsList.map((r, i) => (
                    <div key={i} className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 transition">
                      <div className="flex items-center gap-2.5">
                        <FileText size={14} className="text-purple-600" />
                        <div>
                          <div className="font-medium text-gray-800">{r.filename}</div>
                          <div className="text-[10px] text-gray-400">
                            {new Date(r.createdAt).toLocaleString()} · {(r.size / 1024).toFixed(1)} KB
                          </div>
                        </div>
                      </div>
                      <a
                        href={r.url}
                        download={r.filename}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-purple-700 hover:text-purple-900 flex items-center gap-1 font-semibold bg-purple-50 hover:bg-purple-100 px-2.5 py-1 rounded transition"
                      >
                        <Download size={12} /> 下载 Markdown
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
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

      {activeTab === 'dreamina' && (
        <div className="space-y-6">
          {/* Header */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center">
                <Wand2 size={20} />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-800">抖音即梦 (Dreamina) AI 绘图整合</h2>
                <p className="text-sm text-gray-500">在后台一键调用火山引擎即梦大模型生成高端护肤图、产品主图、海报及研究所插图。</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Account Login Status & Workbench */}
            <div className="lg:col-span-1 space-y-6">
              {/* Login card */}
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-1.5">
                  <Clock size={16} className="text-purple-600" />
                  即梦登录状态管理
                </h3>

                {dreaminaStatusLoading ? (
                  <div className="text-center py-6 text-sm text-gray-400">正在检查登录态...</div>
                ) : dreaminaStatus?.loggedIn ? (
                  <div className="space-y-4">
                    {dreaminaStatus.hasCliPermission === false ? (
                      <div className="bg-amber-50 text-amber-900 p-4 rounded-xl border border-amber-200/80 flex items-start gap-3 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
                        <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={20} />
                        <div>
                          <div className="font-semibold text-sm">已登录，但无 CLI 绘图权限</div>
                          <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                            您当前授权的抖音/即梦账号尚未开通官方 CLI/API 开发者白名单权限，暂时无法在工作台直接生成图像。
                          </p>
                          <div className="mt-2.5">
                            <a 
                              href="https://jimeng.jianying.com/" 
                              target="_blank" 
                              rel="noreferrer" 
                              className="inline-flex items-center gap-1 text-[11px] bg-amber-600 hover:bg-amber-700 text-white font-medium px-2.5 py-1 rounded transition-colors"
                            >
                              前往即梦官网申请 ↗
                            </a>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-green-50 text-green-800 p-4 rounded-xl border border-green-100 flex items-center gap-3">
                        <CheckCircle2 className="text-green-500 shrink-0" size={20} />
                        <div>
                          <div className="font-semibold text-sm">即梦已成功登录</div>
                          <div className="text-xs text-green-600 mt-0.5">本地会话仍然有效，可以直接生成</div>
                        </div>
                      </div>
                    )}

                    <div className="bg-gray-50 p-4 rounded-xl border flex justify-between items-center">
                      <div>
                        <div className="text-xs text-gray-400">剩余即梦积分</div>
                        <div className="text-lg font-bold text-gray-800 font-mono mt-0.5">{dreaminaStatus.credit}</div>
                      </div>
                      <button
                        onClick={fetchDreaminaStatus}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                      >
                        <RefreshCcw size={12} /> 刷新
                      </button>
                    </div>

                    <div className="flex gap-2.5">
                      <button
                        onClick={handleDreaminaLogout}
                        className="flex-1 bg-white hover:bg-red-50 text-red-600 hover:text-red-700 py-2.5 rounded-lg border border-red-200 text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm transition active:scale-95"
                      >
                        退出并切换账号
                      </button>
                      <button
                        onClick={handleDreaminaLogin}
                        disabled={dreaminaLoginLoading}
                        className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm transition active:scale-95 disabled:opacity-50"
                      >
                        {dreaminaLoginLoading ? '启动中...' : '重新授权绑定'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4 space-y-4">
                    <div className="bg-amber-50 text-amber-800 p-4 rounded-xl border border-amber-100 text-xs text-left flex items-start gap-2.5">
                      <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={16} />
                      <div>
                        <span className="font-semibold font-sans">当前未登录即梦账号</span>
                        <p className="mt-1 text-gray-600 leading-normal">
                          生成图像需要先登录账号。因抖音安全限制，请在<strong>电脑端浏览器</strong>中一键启动网页授权。
                        </p>
                      </div>
                    </div>

                    {dreaminaUserCode ? (
                      <div className="space-y-4 text-left">
                        {/* Step 1 */}
                        <div className="bg-purple-50/50 p-4 rounded-xl border border-purple-100/80 transition-all duration-300">
                          <div className="flex items-start gap-3">
                            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-purple-600 text-white font-mono text-xs font-bold shrink-0 mt-0.5 shadow-sm">1</span>
                            <div className="flex-1 min-w-0">
                              <span className="font-semibold text-gray-800 text-xs">打开即梦官方网页</span>
                              <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">
                                请在您的<strong>电脑浏览器</strong>中打开以下官方授权直达链接：
                              </p>
                              <a 
                                href={dreaminaVerificationUri || 'https://jimeng.jianying.com/ai-tool/cli-auth'} 
                                target="_blank" 
                                rel="noreferrer" 
                                className="mt-2 inline-flex items-center gap-1 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-lg transition-all shadow-sm hover:shadow active:scale-95"
                              >
                                👉 立即打开即梦官方授权页面 ↗
                              </a>
                            </div>
                          </div>
                        </div>

                        {/* Step 2 */}
                        <div className="bg-purple-50/50 p-4 rounded-xl border border-purple-100/80 transition-all duration-300">
                          <div className="flex items-start gap-3">
                            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-purple-600 text-white font-mono text-xs font-bold shrink-0 mt-0.5 shadow-sm">2</span>
                            <div className="flex-1 min-w-0">
                              <span className="font-semibold text-gray-800 text-xs">复制并填入激活码</span>
                              <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">
                                在官方网页的输入框中填入下方的专属激活码：
                              </p>
                              
                              <div className="mt-2.5 flex items-center gap-2">
                                <div className="flex-1 flex items-center justify-center bg-white p-2 rounded-lg border font-mono text-base font-bold text-purple-700 select-all shadow-inner tracking-widest text-center">
                                  {dreaminaUserCode}
                                </div>
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(dreaminaUserCode || '');
                                    toast.success('激活码已成功复制！');
                                  }}
                                  className="px-3 py-2 bg-white border hover:bg-gray-50 text-gray-600 rounded-lg text-xs font-semibold flex items-center gap-1 shadow-sm active:scale-95 transition-all"
                                  title="点击复制激活码"
                                >
                                  复制
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Step 3 */}
                        <div className="bg-purple-50/50 p-4 rounded-xl border border-purple-100/80 transition-all duration-300">
                          <div className="flex items-start gap-3">
                            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-purple-600 text-white font-mono text-xs font-bold shrink-0 mt-0.5 shadow-sm">3</span>
                            <div className="flex-1 min-w-0">
                              <span className="font-semibold text-gray-800 text-xs">手机扫码完成授权</span>
                              <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">
                                在官方网页上输入激活码并提交后，使用手机<strong>抖音 App 扫一扫</strong>页面上由官方安全生成的登录二维码，点击“确认授权”即可。
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Loading / Status Polling */}
                        <div className="pt-2 border-t text-center">
                          <div className="inline-flex items-center gap-2 text-[11px] text-gray-400 font-medium">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
                            </span>
                            正在等待您在网页端授权...
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={handleDreaminaLogin}
                            disabled={dreaminaLoginLoading}
                            className="flex-1 text-xs text-gray-500 hover:text-gray-700 font-semibold py-2 bg-gray-50 hover:bg-gray-100 rounded-lg border transition active:scale-95"
                          >
                            刷新激活码
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={handleDreaminaLogin}
                        disabled={dreaminaLoginLoading}
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2.5 rounded-lg text-sm font-semibold transition flex items-center justify-center gap-1.5 shadow-sm"
                      >
                        {dreaminaLoginLoading ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
                        一键启动授权激活
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Creator workbench */}
              {dreaminaStatus?.loggedIn && (
                <div className="bg-white rounded-xl shadow-sm border p-6">
                  <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-1.5">
                    <Wand2 size={16} className="text-purple-600" />
                    AI 绘图工作台
                  </h3>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5">画面描述 (Prompt)</label>
                      <textarea
                        value={dreaminaPrompt}
                        onChange={(e) => setDreaminaPrompt(e.target.value)}
                        placeholder="例如：高端奢华抗衰老护肤品套装，干净的大理石背景，水珠环绕，微光效果，极简风，产品主图，4k分辨率"
                        className="w-full px-3 py-2 border rounded-lg text-sm"
                        rows={4}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">画幅比例 (Ratio)</label>
                        <select
                          value={dreaminaRatio}
                          onChange={(e) => setDreaminaRatio(e.target.value)}
                          className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
                        >
                          <option value="1:1">1:1 正方形</option>
                          <option value="16:9">16:9 横屏海报</option>
                          <option value="9:16">9:16 竖屏海报</option>
                          <option value="3:4">3:4 人物/产品</option>
                          <option value="4:3">4:3 文章插图</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">渲染分辨率</label>
                        <select
                          value={dreaminaResolution}
                          onChange={(e) => setDreaminaResolution(e.target.value)}
                          className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
                        >
                          <option value="2k">2k (高清产品图)</option>
                          <option value="4k">4k (超清海报级)</option>
                          <option value="1k">1k (快速渲染草图)</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5">即梦大模型版本</label>
                      <select
                        value={dreaminaModel}
                        onChange={(e) => setDreaminaModel(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
                      >
                        <option value="5.0">即梦 5.0 (最新卓越视觉)</option>
                        <option value="4.5">即梦 4.5 (高精细细节)</option>
                        <option value="3.1">即梦 3.1 (极速极简渲染)</option>
                      </select>
                    </div>

                    <button
                      onClick={handleDreaminaGenerate}
                      disabled={dreaminaGenerating || !dreaminaPrompt.trim()}
                      className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2.5 rounded-lg text-sm font-semibold transition flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {dreaminaGenerating ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          提交排队中...
                        </>
                      ) : (
                        <>
                          <Wand2 size={16} />
                          立即开始生成图像
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Historical Tasks list */}
            <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Clock className="text-gray-600" size={18} />
                  <span className="font-semibold text-gray-800 text-sm">即梦 AI 绘图创作历史记录</span>
                </div>
                <button 
                  onClick={fetchDreaminaTasks} 
                  className="text-blue-500 hover:text-blue-700 text-xs flex items-center gap-1"
                >
                  <RefreshCcw size={12} /> 刷新任务
                </button>
              </div>

              {dreaminaTasksLoading ? (
                <div className="text-center py-12 text-gray-400 text-sm">正在加载绘图历史...</div>
              ) : dreaminaTasks.length === 0 ? (
                <div className="text-center py-12 text-gray-400 text-sm bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  暂无任何 AI 绘图任务，快在左侧工作台提交您的第一笔创作吧！
                </div>
              ) : (
                <div className="space-y-4 max-h-[750px] overflow-y-auto pr-2 custom-scrollbar">
                  {dreaminaTasks.map((task) => (
                    <div key={task.id} className="border border-gray-100 rounded-xl p-4 shadow-sm hover:shadow transition-shadow bg-gray-50/30">
                      <div className="flex flex-col sm:flex-row justify-between gap-2.5 border-b pb-3 mb-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="text-xs font-mono font-bold text-gray-400 select-all">#{task.submit_id.slice(0, 12)}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold border ${
                              task.status === 'success' ? 'bg-green-50 text-green-700 border-green-100' :
                              task.status === 'fail' ? 'bg-red-50 text-red-700 border-red-100' :
                              'bg-blue-50 text-blue-700 border-blue-100 animate-pulse'
                            }`}>
                              {task.status === 'success' ? '生成成功' :
                               task.status === 'fail' ? '渲染失败' : '正在渲染中...'}
                            </span>
                          </div>
                          <p className="text-xs text-gray-400">操作人: {task.user_name || '系统运营'} · 提交时间: {new Date(task.created_at).toLocaleString()}</p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="bg-white p-3 rounded-lg border">
                          <div className="text-[10px] text-gray-400 font-bold mb-1 uppercase tracking-wider">画面提示词 Prompt</div>
                          <p className="text-sm text-gray-700 leading-relaxed break-words">{task.prompt}</p>
                        </div>

                        {task.status === 'success' && task.result_urls?.length > 0 && (
                          <div>
                            <div className="text-[10px] text-gray-400 font-bold mb-2 uppercase tracking-wider">渲染生成大图</div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                              {task.result_urls.map((url: string, index: number) => (
                                <div key={index} className="relative rounded-lg overflow-hidden group border bg-white aspect-square shadow-sm flex items-center justify-center animate-in zoom-in-95 duration-200">
                                  <img 
                                    src={url} 
                                    alt={`Generated asset ${index}`} 
                                    className="max-w-full max-h-full object-contain"
                                    onError={(e) => { (e.target as HTMLImageElement).src = '/images/default-product.png'; }}
                                  />
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                    <a
                                      href={url}
                                      download={`dreamina_${task.submit_id}_${index}.jpg`}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="p-1.5 bg-white text-gray-800 rounded-full hover:bg-gray-100 shadow"
                                      title="在新标签页中打开大图"
                                    >
                                      <Download size={14} />
                                    </a>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {task.status === 'fail' && (
                          <div className="bg-red-50 text-red-800 p-3.5 rounded-lg border border-red-100 text-xs flex items-start gap-2">
                            <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={16} />
                            <div>
                              <div className="font-semibold">即梦渲染错误说明</div>
                              <p className="mt-1 text-red-600 leading-normal">{task.fail_reason}</p>
                            </div>
                          </div>
                        )}

                        {task.status === 'querying' && (
                          <div className="bg-blue-50/50 text-blue-800 p-3.5 rounded-lg border border-blue-100 text-xs flex items-center gap-2">
                            <Loader2 className="text-blue-500 shrink-0 animate-spin" size={16} />
                            <div>
                              即梦云端服务器正在高速计算渲染此画面，预计需耗时 10-30 秒，系统每隔 10 秒会自动拉取下载。
                            </div>
                          </div>
                        )}
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
