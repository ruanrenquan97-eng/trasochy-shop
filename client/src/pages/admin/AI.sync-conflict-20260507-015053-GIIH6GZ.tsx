import { useEffect, useState } from 'react';
import { Save, AlertTriangle, CheckCircle2, Wand2, RefreshCcw, BarChart3, Clock, MousePointerClick, Download, FileText } from 'lucide-react';
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
  ai_quiz_prompt: 'AI 护肤方案守护信生成提示词',
  ai_chat_prompt: 'AI 客服系统提示词 (System Prompt)',
  ai_knowledge_base: 'AI 客服额外知识库 (将被注入到对话上下文中)',
};

type TabType = 'api' | 'prompts' | 'knowledge' | 'operations';

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

  useEffect(() => {
    api.get('/admin/settings').then(data => {
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

  if (loading) return <div className="p-8 text-center text-gray-500">加载中...</div>;

  const tabs: { key: TabType; label: string }[] = [
    { key: 'api', label: 'API 管理' },
    { key: 'prompts', label: 'AI 提示词管理和优化' },
    { key: 'knowledge', label: 'AI 客服与知识库' }
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
            <button
              onClick={() => handleSave(['ai_api_key'])}
              disabled={saving}
              className="flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm disabled:opacity-50"
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
        <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
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
                rows={12}
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
    </div>
  );
}
