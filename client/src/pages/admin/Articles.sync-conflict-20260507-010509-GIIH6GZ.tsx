import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, Trash2, Settings, Bot, Search, AlertCircle, RefreshCw } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../../utils/api';

export default function AdminArticles() {
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [langTab, setLangTab] = useState('zh');
  const [editingArticle, setEditingArticle] = useState<any>(null);
  const queryClient = useQueryClient();

  // ---------------- 数据获取 ----------------
  const { data, isLoading } = useQuery({
    queryKey: ['admin-articles', page, keyword],
    queryFn: () => api.get(`/articles/admin/list?page=${page}&limit=20&keyword=${keyword}`),
  });

  const { data: settingsData } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.get('/settings'),
  });

  // ---------------- 突变操作 ----------------
  const saveMutation = useMutation({
    mutationFn: (data: any) => editingArticle ? api.put(`/articles/${editingArticle.id}`, data) : api.post('/articles', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-articles'] });
      setIsModalOpen(false);
      toast.success('保存成功');
    },
    onError: (err: any) => toast.error(err.response?.data?.error || '保存失败'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/articles/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-articles'] });
      toast.success('删除成功');
    },
  });

  const saveSettingsMutation = useMutation({
    mutationFn: (newSettings: any) => api.put('/settings', { settings: newSettings }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      setIsSettingsOpen(false);
      toast.success('设置保存成功');
    },
    onError: (err: any) => toast.error(err.response?.data?.error || '设置保存失败'),
  });

  // AI 辅助撰写
  const generateArticleMutation = useMutation({
    mutationFn: (topic: string) => api.post('/ai/generate-article', { topic }),
    onSuccess: (res: any) => {
      if (res.content) {
        // 去除开头的标题如果有的话
        let finalContent = res.content;
        const titleMatch = res.content.match(/^#\\s+(.+)$/m);
        if (titleMatch && editingArticle && !editingArticle.title) {
           setEditingArticle({ ...editingArticle, title: titleMatch[1].trim(), content: finalContent.replace(/^#\\s+(.+)\\n/, '') });
        } else {
           setEditingArticle({ ...editingArticle, content: (editingArticle?.content || '') + '\n' + finalContent });
        }
        toast.success('AI 生成完毕');
      }
    },
    onError: (err: any) => toast.error(err.response?.data?.error || '生成失败'),
  });

  // AI 辅助翻译
  const translateMutation = useMutation({
    mutationFn: (targetLang: string) => api.post('/ai/translate', {
      texts: {
        title: editingArticle?.title || '',
        content: editingArticle?.content || ''
      },
      targetLang
    }),
    onSuccess: (res: any, targetLang: string) => {
      setEditingArticle({
        ...editingArticle,
        translations: {
          ...editingArticle.translations,
          [targetLang]: {
            ...editingArticle.translations?.[targetLang],
            title: res.translated.title || editingArticle.translations?.[targetLang]?.title || '',
            content: res.translated.content || editingArticle.translations?.[targetLang]?.content || ''
          }
        }
      });
      toast.success('翻译完成');
    },
    onError: (err: any) => toast.error(err.message || '翻译失败'),
  });

  // ---------------- 渲染列表 ----------------
  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">内容管理</h1>
          <p className="text-sm text-stone-500 mt-1">管理护肤研究所及科普文章</p>
        </div>
        <div className="flex gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
            <input
              type="text"
              placeholder="搜索标题..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-900 w-64"
            />
          </div>
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-stone-200 text-stone-700 rounded-lg text-sm hover:bg-stone-50"
          >
            <Settings size={16} /> 全局设置
          </button>
          <button
            onClick={() => {
              setEditingArticle({ title: '', slug: '', coverImage: '', content: '', status: 'draft', keywords: '', translations: { en: { title: '', content: '' }, de: { title: '', content: '' } } });
              setLangTab('zh');
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-stone-900 text-white rounded-lg text-sm hover:bg-stone-800"
          >
            <Plus size={16} /> 新增文章
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-stone-50 border-b border-stone-200 text-stone-600">
            <tr>
              <th className="px-6 py-4 font-medium">标题</th>
              <th className="px-6 py-4 font-medium">状态</th>
              <th className="px-6 py-4 font-medium">生成方式</th>
              <th className="px-6 py-4 font-medium">发布时间</th>
              <th className="px-6 py-4 font-medium text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {isLoading ? (
              <tr><td colSpan={5} className="px-6 py-8 text-center text-stone-500">加载中...</td></tr>
            ) : data?.articles?.length === 0 ? (
              <tr><td colSpan={5} className="px-6 py-8 text-center text-stone-500">暂无文章</td></tr>
            ) : (
              data?.articles?.map((a: any) => (
                <tr key={a.id} className="hover:bg-stone-50/50">
                  <td className="px-6 py-4">
                    <div className="font-medium text-stone-900">{a.title}</div>
                    <div className="text-xs text-stone-500">{a.slug}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={'px-2 py-1 rounded-full text-xs font-medium ' + (a.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-stone-100 text-stone-600')}>
                      {a.status === 'published' ? '已发布' : '草稿'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {a.is_ai_generated ? (
                      <span className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full w-fit">
                        <Bot size={12} /> AI 生成
                      </span>
                    ) : (
                      <span className="text-xs text-stone-500">人工撰写</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-stone-500">
                    {a.published_at ? new Date(a.published_at).toLocaleString() : '-'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => { 
                      const translations = a.translations ? (typeof a.translations === 'string' ? JSON.parse(a.translations) : a.translations) : { en: { title: '', content: '' }, de: { title: '', content: '' } };
                      setEditingArticle({ ...a, translations }); 
                      setLangTab('zh');
                      setIsModalOpen(true); 
                    }} className="p-2 text-stone-400 hover:text-stone-900 transition-colors">
                      <Edit2 size={16} />
                    </button>
                    <button onClick={() => { if (confirm('确定删除该文章吗？')) deleteMutation.mutate(a.id); }} className="p-2 text-stone-400 hover:text-red-600 transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Editor Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-stone-200 flex justify-between items-center shrink-0">
              <h2 className="text-lg font-bold text-stone-800">{editingArticle?.id ? '编辑文章' : '新增文章'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-stone-400 hover:text-stone-600">✕</button>
            </div>
            
            <div className="flex border-b border-stone-200 justify-between items-center pr-4">
              <div className="flex">
                {['zh', 'en', 'de'].map(l => (
                  <button 
                    key={l}
                    onClick={() => setLangTab(l)}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${langTab === l ? 'border-rose-500 text-rose-600' : 'border-transparent text-stone-500 hover:text-stone-700'}`}
                  >
                    {l === 'zh' ? '中文' : l === 'en' ? 'English' : 'Deutsch'}
                  </button>
                ))}
              </div>
              {langTab !== 'zh' && (
                <button
                  onClick={() => {
                    if (!editingArticle?.title && !editingArticle?.content) {
                      toast.error('请先在中文标签下填写标题或正文'); return;
                    }
                    translateMutation.mutate(langTab);
                  }}
                  disabled={translateMutation.isPending}
                  className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium px-3 py-1.5 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
                >
                  {translateMutation.isPending ? <RefreshCw size={14} className="animate-spin" /> : <Bot size={14} />}
                  {translateMutation.isPending ? '翻译中...' : `一键翻译为 ${langTab === 'en' ? '英文' : '德文'}`}
                </button>
              )}
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 bg-stone-50 flex gap-6">
              <div className="flex-1 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">标题</label>
                  <input type="text" 
                         value={langTab === 'zh' ? editingArticle.title : (editingArticle.translations[langTab]?.title || '')} 
                         onChange={e => {
                           if (langTab === 'zh') setEditingArticle({ ...editingArticle, title: e.target.value });
                           else setEditingArticle({ ...editingArticle, translations: { ...editingArticle.translations, [langTab]: { ...editingArticle.translations[langTab], title: e.target.value } } });
                         }} 
                         className="w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-stone-900 focus:border-stone-900" />
                </div>
                {langTab === 'zh' && (
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-stone-700 mb-1">别名 (Slug)</label>
                    <input type="text" value={editingArticle.slug} onChange={e => setEditingArticle({ ...editingArticle, slug: e.target.value })} placeholder="留空自动生成" className="w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-stone-900 focus:border-stone-900 text-sm" />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-stone-700 mb-1">封面图 URL</label>
                    <input type="text" value={editingArticle.coverImage || editingArticle.cover_image || ''} onChange={e => setEditingArticle({ ...editingArticle, coverImage: e.target.value })} className="w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-stone-900 focus:border-stone-900 text-sm" />
                  </div>
                </div>
                )}

                <div className="flex justify-between items-end">
                  <label className="block text-sm font-medium text-stone-700 mb-1">正文 (Markdown 格式)</label>
                  <button 
                    onClick={() => {
                      if(!editingArticle.title && !editingArticle.keywords) {
                        toast.error('请先填写标题或关键词'); return;
                      }
                      generateArticleMutation.mutate(editingArticle.title || editingArticle.keywords);
                    }}
                    disabled={generateArticleMutation.isPending}
                    className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium px-3 py-1.5 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
                  >
                    {generateArticleMutation.isPending ? <RefreshCw size={14} className="animate-spin" /> : <Bot size={14} />}
                    {generateArticleMutation.isPending ? '生成中...' : 'AI 辅助撰写'}
                  </button>
                </div>
                <textarea 
                  value={langTab === 'zh' ? editingArticle.content : (editingArticle.translations[langTab]?.content || '')} 
                  onChange={e => {
                    if (langTab === 'zh') setEditingArticle({ ...editingArticle, content: e.target.value });
                    else setEditingArticle({ ...editingArticle, translations: { ...editingArticle.translations, [langTab]: { ...editingArticle.translations[langTab], content: e.target.value } } });
                  }} 
                  className="w-full px-4 py-3 border rounded-lg focus:ring-1 focus:ring-stone-900 focus:border-stone-900 font-mono text-sm h-96 resize-none"
                  placeholder="# 在此输入 Markdown 内容..."
                />
              </div>

              <div className="w-64 space-y-6 shrink-0 border-l border-stone-200 pl-6">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-2">发布状态</label>
                  <select value={editingArticle.status} onChange={e => setEditingArticle({ ...editingArticle, status: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm bg-white">
                    <option value="draft">草稿</option>
                    <option value="published">发布</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-2">是否 AI 生成</label>
                  <label className="flex items-center gap-2 text-sm text-stone-600 cursor-pointer">
                    <input type="checkbox" checked={editingArticle.isAiGenerated || editingArticle.is_ai_generated} onChange={e => setEditingArticle({ ...editingArticle, isAiGenerated: e.target.checked })} className="rounded text-stone-900 focus:ring-stone-900" />
                    标记为 AI 生成
                  </label>
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-2">标签/关键词</label>
                  <input type="text" value={editingArticle.keywords || ''} onChange={e => setEditingArticle({ ...editingArticle, keywords: e.target.value })} placeholder="用逗号分隔" className="w-full px-3 py-2 border rounded-lg text-sm" />
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-stone-200 flex justify-end gap-3 bg-white shrink-0">
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-stone-600 hover:text-stone-900">取消</button>
              <button onClick={() => saveMutation.mutate(editingArticle)} disabled={saveMutation.isPending} className="px-4 py-2 bg-stone-900 text-white rounded-lg hover:bg-stone-800 disabled:opacity-50">
                {saveMutation.isPending ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {isSettingsOpen && settingsData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-stone-200 flex justify-between items-center">
              <h2 className="text-lg font-bold text-stone-800 flex items-center gap-2"><Settings size={18}/> 全局模块设置</h2>
              <button onClick={() => setIsSettingsOpen(false)} className="text-stone-400 hover:text-stone-600">✕</button>
            </div>
            <form onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const data = {
                feature_articles: fd.get('feature_articles') ? '1' : '0',
                ai_article_auto_enabled: fd.get('ai_article_auto_enabled') ? '1' : '0',
                ai_article_keywords: fd.get('ai_article_keywords'),
                ai_article_frequency: fd.get('ai_article_frequency'),
              };
              saveSettingsMutation.mutate(data);
            }}>
              <div className="p-6 space-y-6">
                <div>
                  <label className="flex items-center gap-3 font-medium text-stone-800">
                    <input type="checkbox" name="feature_articles" defaultChecked={settingsData.feature_articles === '1'} className="w-4 h-4 rounded text-stone-900 focus:ring-stone-900" />
                    开启前台展示 (护肤研究所)
                  </label>
                  <p className="text-xs text-stone-500 mt-1 pl-7">关闭后，前台用户将看不到文章入口和页面。</p>
                </div>
                
                <div className="pt-4 border-t border-stone-100">
                  <label className="flex items-center gap-3 font-medium text-blue-700">
                    <input type="checkbox" name="ai_article_auto_enabled" defaultChecked={settingsData.ai_article_auto_enabled === '1'} className="w-4 h-4 rounded text-blue-600 focus:ring-blue-600" />
                    <Bot size={16}/> 开启 AI 自动定时定量撰写
                  </label>
                  <p className="text-xs text-stone-500 mt-1 pl-7 mb-4">开启后，后台守护进程将根据以下设置自动发文。</p>
                  
                  <div className="space-y-4 pl-7">
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-1">自动发文频率 (天/篇)</label>
                      <select name="ai_article_frequency" defaultValue={settingsData.ai_article_frequency || '1'} className="w-full px-3 py-2 border rounded-lg text-sm bg-white">
                        <option value="1">每天 1 篇</option>
                        <option value="3">每 3 天 1 篇</option>
                        <option value="7">每周 1 篇</option>
                        <option value="30">每月 1 篇</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-1">发文关键词库 (逗号分隔)</label>
                      <textarea 
                        name="ai_article_keywords" 
                        defaultValue={settingsData.ai_article_keywords || '烟酰胺,抗老,美白,干皮护肤,敏感肌修复'}
                        className="w-full px-3 py-2 border rounded-lg text-sm h-20 resize-none"
                        placeholder="例如: 保湿,防晒,刷酸..."
                      />
                      <p className="text-xs text-stone-400 mt-1">AI 将每次随机从库中抽取一个关键词进行扩展创作。</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-stone-200 flex justify-end gap-3 bg-stone-50">
                <button type="button" onClick={() => setIsSettingsOpen(false)} className="px-4 py-2 text-stone-600 hover:text-stone-900 text-sm">取消</button>
                <button type="submit" disabled={saveSettingsMutation.isPending} className="px-4 py-2 bg-stone-900 text-white rounded-lg hover:bg-stone-800 disabled:opacity-50 text-sm">
                  {saveSettingsMutation.isPending ? '保存中...' : '保存设置'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
