import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, Trash2, Settings, Bot, Search, AlertCircle, RefreshCw, Upload, ImageIcon } from 'lucide-react';
import { toast } from 'react-hot-toast';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import api from '../../utils/api';

export default function AdminArticles() {
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [aiSettingsKeywords, setAiSettingsKeywords] = useState('');
  const [langTab, setLangTab] = useState('zh');
  const [editingArticle, setEditingArticle] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const handleUploadCover = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      const res: any = await api.post('/upload/single', formData);
      setEditingArticle((prev: any) => ({ ...prev, coverImage: res.url, cover_image: res.url }));
      toast.success('封面图上传成功');
    } catch (err: any) {
      toast.error(err.message || '上传失败');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // 富文本编辑器图片上传处理
  const imageHandler = useCallback(() => {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*');
    input.click();
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      setUploading(true);
      try {
        const formData = new FormData();
        formData.append('image', file);
        const res: any = await api.post('/upload/single', formData);
        // 获取 Quill 编辑器实例，在光标位置插入图片
        const quill = (window as any).__quill_editor_ref;
        if (quill) {
          const range = quill.getSelection(true);
          quill.clipboard.dangerouslyPasteHTML(range.index, `<img src="${res.url}" style="max-width:100%;height:auto;" />`);
        }
        toast.success('图片已插入正文');
      } catch (err: any) {
        toast.error(err.message || '上传失败');
      } finally {
        setUploading(false);
      }
    };
  }, []);

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
    mutationFn: (newSettings: any) => api.put('/admin/settings', { settings: newSettings }),
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
  const translateAllMutation = useMutation({
    mutationFn: async () => {
      const textsToTranslate = {
        title: editingArticle?.title || '',
        content: editingArticle?.content || ''
      };
      const [enRes, deRes] = await Promise.all([
        api.post('/ai/translate', { texts: textsToTranslate, targetLang: 'en' }),
        api.post('/ai/translate', { texts: textsToTranslate, targetLang: 'de' })
      ]);
      return {
        en: (enRes as any).translated || {},
        de: (deRes as any).translated || {}
      };
    },
    onSuccess: (results: any) => {
      if (!results) return;
      setEditingArticle({
        ...editingArticle,
        translations: {
          ...editingArticle.translations,
          en: {
            ...editingArticle.translations?.en,
            title: results.en.title || editingArticle.translations?.en?.title || '',
            content: results.en.content || editingArticle.translations?.en?.content || ''
          },
          de: {
            ...editingArticle.translations?.de,
            title: results.de.title || editingArticle.translations?.de?.title || '',
            content: results.de.content || editingArticle.translations?.de?.content || ''
          }
        }
      });
      toast.success('双语翻译已生成，请点击保存应用更改');
    },
    onError: (err: any) => toast.error(err.message || '翻译失败'),
  });

  // ---------------- 渲染列表 ----------------
  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">内容管理</h1>
          <p className="text-sm text-stone-500 mt-1">管理皮肤医学研究院及科普文章</p>
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
            onClick={() => {
              setAiSettingsKeywords(settingsData?.ai_article_keywords || '烟酰胺,抗老,美白,干皮护肤,敏感肌修复');
              setIsSettingsOpen(true);
            }}
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
                    <a href={`/articles/${a.slug}`} target="_blank" rel="noopener noreferrer" className="font-medium text-stone-900 hover:text-blue-600 hover:underline transition-colors block">
                      {a.title}
                    </a>
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
              <button
                onClick={() => {
                  if (!editingArticle?.title && !editingArticle?.content) {
                    toast.error('请先在中文标签下填写标题或正文'); return;
                  }
                  translateAllMutation.mutate();
                }}
                disabled={translateAllMutation.isPending}
                className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium px-3 py-1.5 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
              >
                {translateAllMutation.isPending ? <RefreshCw size={14} className="animate-spin" /> : <Bot size={14} />}
                {translateAllMutation.isPending ? '生成中...' : '一键生成双语翻译 (EN & DE)'}
              </button>
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
                    <label className="block text-sm font-medium text-stone-700 mb-1">封面图</label>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-stone-50 border border-dashed border-stone-300 rounded-lg overflow-hidden flex items-center justify-center shrink-0">
                        {(editingArticle.coverImage || editingArticle.cover_image) ? (
                          <img src={editingArticle.coverImage || editingArticle.cover_image} alt="Cover" className="w-full h-full object-cover" />
                        ) : (
                          <ImageIcon size={18} className="text-stone-300" />
                        )}
                      </div>
                      <div className="flex flex-col items-start gap-1">
                        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleUploadCover} className="hidden" />
                        <div className="flex items-center gap-2">
                          <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="px-3 py-1.5 border border-stone-200 text-stone-600 rounded-lg text-xs hover:bg-stone-50 flex items-center gap-1.5">
                            <Upload size={14} /> {uploading ? '上传中...' : '点击上传封面'}
                          </button>
                          {(editingArticle.coverImage || editingArticle.cover_image) && (
                            <button onClick={() => setEditingArticle({ ...editingArticle, coverImage: '', cover_image: '' })} className="text-xs text-stone-400 hover:text-rose-500">移除</button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                )}

                <div className="flex justify-between items-end">
                  <label className="block text-sm font-medium text-stone-700 mb-1">正文</label>
                  <button 
                    onClick={() => {
                      if(!editingArticle.title && !editingArticle.keywords) {
                        toast.error('请先填写标题或关键词'); return;
                      }
                      generateArticleMutation.mutate(editingArticle.title || editingArticle.keywords);
                    }}
                    disabled={generateArticleMutation.isPending}
                    className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium px-3 py-1.5 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors mb-1"
                  >
                    {generateArticleMutation.isPending ? <RefreshCw size={14} className="animate-spin" /> : <Bot size={14} />}
                    {generateArticleMutation.isPending ? '生成中...' : 'AI 辅助撰写'}
                  </button>
                </div>
                <div className="border border-stone-200 rounded-xl overflow-hidden bg-white">
                  {(editingArticle.isAiGenerated || editingArticle.is_ai_generated) ? (
                    <textarea
                      value={langTab === 'zh' ? editingArticle.content : (editingArticle.translations[langTab]?.content || '')}
                      onChange={e => {
                        const val = e.target.value;
                        if (langTab === 'zh') setEditingArticle({ ...editingArticle, content: val });
                        else setEditingArticle({ ...editingArticle, translations: { ...editingArticle.translations, [langTab]: { ...editingArticle.translations[langTab], content: val } } });
                      }}
                      className="w-full min-h-[400px] p-4 font-mono text-sm focus:outline-none resize-y bg-stone-50"
                      placeholder="在此输入 Markdown 格式正文..."
                    />
                  ) : (
                    <ReactQuill 
                      key={langTab}
                      theme="snow"
                      value={langTab === 'zh' ? editingArticle.content : (editingArticle.translations[langTab]?.content || '')} 
                      onChange={val => {
                        if (langTab === 'zh') setEditingArticle({ ...editingArticle, content: val });
                        else setEditingArticle({ ...editingArticle, translations: { ...editingArticle.translations, [langTab]: { ...editingArticle.translations[langTab], content: val } } });
                      }} 
                      modules={{
                        toolbar: {
                          container: [
                            [{ 'header': [1, 2, 3, false] }],
                            ['bold', 'italic', 'underline', 'strike'],
                            [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                            [{ 'color': [] }, { 'background': [] }],
                            [{ 'align': [] }],
                            ['link', 'image', 'video'],
                            ['clean'],
                          ],
                          handlers: {
                            image: imageHandler,
                          },
                        },
                      }}
                      formats={['header', 'bold', 'italic', 'underline', 'strike', 'list', 'color', 'background', 'align', 'link', 'image', 'video']}
                      placeholder="在此输入图文并茂的正文内容..."
                      style={{ minHeight: '400px' }}
                      ref={(el: any) => {
                        if (el) {
                          setTimeout(() => {
                            const editor = el.getEditor?.();
                            if (editor) (window as any).__quill_editor_ref = editor;
                          }, 100);
                        }
                      }}
                    />
                  )}
                </div>
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
                  <label className="block text-sm font-medium text-stone-700 mb-2">SEO 关键词 / 标签</label>
                  <input type="text" value={editingArticle.keywords || ''} onChange={e => setEditingArticle({ ...editingArticle, keywords: e.target.value })} placeholder="用逗号分隔，便于搜索引擎收录" className="w-full px-3 py-2 border rounded-lg text-sm mb-2" />
                  
                  {(settingsData as any)?.global_seo_keywords && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {(() => {
                        let allTags: string[] = [];
                        const raw = (settingsData as any).global_seo_keywords;
                        try {
                          const parsed = JSON.parse(raw);
                          if (Array.isArray(parsed)) {
                            allTags = parsed.flatMap((b: any) => b.keywords);
                          } else { throw new Error(); }
                        } catch(e) {
                          allTags = raw.split(',').map((t: string) => t.trim()).filter(Boolean);
                        }
                        allTags = Array.from(new Set(allTags));
                        
                        return allTags.map((tag: string, i: number) => {
                          const currentKeywords = (editingArticle.keywords || '').split(',').map((t: string) => t.trim()).filter(Boolean);
                          const isSelected = currentKeywords.includes(tag);
                        return (
                          <button
                            key={i}
                            type="button"
                            onClick={() => {
                              const newKeywords = isSelected
                                ? currentKeywords.filter((t: string) => t !== tag)
                                : [...currentKeywords, tag];
                              setEditingArticle({ ...editingArticle, keywords: newKeywords.join(', ') });
                            }}
                            className={`text-[10px] px-2 py-0.5 rounded transition-colors ${isSelected ? 'bg-stone-800 text-white border border-stone-800' : 'bg-white text-stone-500 border border-stone-200 hover:border-stone-400'}`}
                          >
                            {tag}
                          </button>
                          );
                        });
                      })()}
                    </div>
                  )}
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
                    开启前台展示 (皮肤医学研究院)
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
                        value={aiSettingsKeywords}
                        onChange={(e) => setAiSettingsKeywords(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg text-sm h-20 resize-none"
                        placeholder="留空则 AI 将全自动从下方的【全局 SEO 词库】中智能挑选最佳 GEO 关键词..."
                      />
                      <div className="flex justify-between items-start mt-1">
                        <p className="text-xs text-stone-400">
                          如果不填写，后台引擎会全自动从您的全局 SEO 词库中抽取最利于收录的热词进行深度创作。您也可以在下方点击补充特定词汇。
                        </p>
                        {aiSettingsKeywords && (
                          <button 
                            type="button" 
                            onClick={() => setAiSettingsKeywords('')}
                            className="text-[10px] text-rose-500 hover:text-rose-600 whitespace-nowrap ml-2"
                          >
                            清空并委托给 AI
                          </button>
                        )}
                      </div>
                      
                      {(settingsData as any)?.global_seo_keywords && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {(() => {
                            let allTags: string[] = [];
                            const raw = (settingsData as any).global_seo_keywords;
                            try {
                              const parsed = JSON.parse(raw);
                              if (Array.isArray(parsed)) {
                                allTags = parsed.flatMap((b: any) => b.keywords);
                              } else { throw new Error(); }
                            } catch(e) {
                              allTags = raw.split(',').map((t: string) => t.trim()).filter(Boolean);
                            }
                            allTags = Array.from(new Set(allTags));
                            
                            return allTags.map((tag: string, i: number) => {
                              const currentKeywords = aiSettingsKeywords.split(',').map((t: string) => t.trim()).filter(Boolean);
                              const isSelected = currentKeywords.includes(tag);
                              return (
                                <button
                                  key={i}
                                  type="button"
                                  onClick={() => {
                                    const newKeywords = isSelected
                                      ? currentKeywords.filter((t: string) => t !== tag)
                                      : [...currentKeywords, tag];
                                    setAiSettingsKeywords(newKeywords.join(', '));
                                  }}
                                  className={`text-[10px] px-2 py-0.5 rounded transition-colors ${isSelected ? 'bg-blue-600 text-white border border-blue-600' : 'bg-white text-stone-500 border border-stone-200 hover:border-blue-300'}`}
                                >
                                  {isSelected ? '✓ ' : '+ '}{tag}
                                </button>
                              );
                            });
                          })()}
                        </div>
                      )}
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
