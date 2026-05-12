import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, Trash2, Bot, Search, RefreshCw, FileText } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../../utils/api';

export default function AdminClinicalReports() {
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [langTab, setLangTab] = useState('zh');
  const [editingReport, setEditingReport] = useState<any>(null);
  const queryClient = useQueryClient();

  // ---------------- 数据获取 ----------------
  const { data, isLoading } = useQuery({
    queryKey: ['admin-clinical-reports', page, keyword],
    queryFn: () => api.get(`/clinical-reports/admin/list?page=${page}&limit=20&keyword=${keyword}`),
  });

  // ---------------- 突变操作 ----------------
  const saveMutation = useMutation({
    mutationFn: (data: any) => editingReport?.id ? api.put(`/clinical-reports/${editingReport.id}`, data) : api.post('/clinical-reports', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-clinical-reports'] });
      setIsModalOpen(false);
      toast.success('保存成功');
    },
    onError: (err: any) => toast.error(err.response?.data?.error || '保存失败'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/clinical-reports/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-clinical-reports'] });
      toast.success('删除成功');
    },
  });

  // AI 辅助翻译
  const translateAllMutation = useMutation({
    mutationFn: async () => {
      const textsToTranslate = {
        title: editingReport?.title || '',
        summary: editingReport?.summary || ''
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
      setEditingReport({
        ...editingReport,
        translations: {
          ...editingReport.translations,
          en: {
            ...editingReport.translations?.en,
            title: results.en.title || editingReport.translations?.en?.title || '',
            summary: results.en.summary || editingReport.translations?.en?.summary || ''
          },
          de: {
            ...editingReport.translations?.de,
            title: results.de.title || editingReport.translations?.de?.title || '',
            summary: results.de.summary || editingReport.translations?.de?.summary || ''
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
          <h1 className="text-2xl font-bold text-stone-800">临床报告管理</h1>
          <p className="text-sm text-stone-500 mt-1">管理皮肤医学研究院的临床研究报告</p>
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
              setEditingReport({ title: '', slug: '', summary: '', coverImage: '', pdfUrl: '', status: 'draft', translations: { en: { title: '', summary: '' }, de: { title: '', summary: '' } } });
              setLangTab('zh');
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-stone-900 text-white rounded-lg text-sm hover:bg-stone-800"
          >
            <Plus size={16} /> 新增报告
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-stone-50 border-b border-stone-200 text-stone-600">
            <tr>
              <th className="px-6 py-4 font-medium">标题</th>
              <th className="px-6 py-4 font-medium">状态</th>
              <th className="px-6 py-4 font-medium">PDF 附件</th>
              <th className="px-6 py-4 font-medium">发布时间</th>
              <th className="px-6 py-4 font-medium text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {isLoading ? (
              <tr><td colSpan={5} className="px-6 py-8 text-center text-stone-500">加载中...</td></tr>
            ) : data?.reports?.length === 0 ? (
              <tr><td colSpan={5} className="px-6 py-8 text-center text-stone-500">暂无报告</td></tr>
            ) : (
              data?.reports?.map((a: any) => (
                <tr key={a.id} className="hover:bg-stone-50/50">
                  <td className="px-6 py-4">
                    <a href={`/clinical-reports/${a.slug}`} target="_blank" rel="noreferrer" className="font-medium text-stone-900 hover:text-blue-600 hover:underline transition-colors">{a.title}</a>
                    <div className="text-xs text-stone-500">{a.slug}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={'px-2 py-1 rounded-full text-xs font-medium ' + (a.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-stone-100 text-stone-600')}>
                      {a.status === 'published' ? '已发布' : '草稿'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {a.pdf_url ? (
                      <a href={a.pdf_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full w-fit hover:bg-blue-100">
                        <FileText size={12} /> 查看 PDF
                      </a>
                    ) : (
                      <span className="text-xs text-stone-400">未上传</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-stone-500">
                    {a.published_at ? new Date(a.published_at).toLocaleString() : '-'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => { 
                      const translations = a.translations ? (typeof a.translations === 'string' ? JSON.parse(a.translations) : a.translations) : { en: { title: '', summary: '' }, de: { title: '', summary: '' } };
                      setEditingReport({ ...a, coverImage: a.cover_image, pdfUrl: a.pdf_url, translations }); 
                      setLangTab('zh');
                      setIsModalOpen(true); 
                    }} className="p-2 text-stone-400 hover:text-stone-900 transition-colors">
                      <Edit2 size={16} />
                    </button>
                    <button onClick={() => { if (confirm('确定删除该报告吗？')) deleteMutation.mutate(a.id); }} className="p-2 text-stone-400 hover:text-red-600 transition-colors">
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
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-stone-200 flex justify-between items-center shrink-0">
              <h2 className="text-lg font-bold text-stone-800">{editingReport?.id ? '编辑报告' : '新增报告'}</h2>
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
                  if (!editingReport?.title && !editingReport?.summary) {
                    toast.error('请先在中文标签下填写标题或摘要'); return;
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
            
            <div className="p-6 overflow-y-auto flex-1 bg-stone-50 space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">报告标题</label>
                <input type="text" 
                        value={langTab === 'zh' ? editingReport.title : (editingReport.translations[langTab]?.title || '')} 
                        onChange={e => {
                          if (langTab === 'zh') setEditingReport({ ...editingReport, title: e.target.value });
                          else setEditingReport({ ...editingReport, translations: { ...editingReport.translations, [langTab]: { ...editingReport.translations[langTab], title: e.target.value } } });
                        }} 
                        className="w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-stone-900 focus:border-stone-900" />
              </div>
              
              {langTab === 'zh' && (
                <>
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-stone-700 mb-1">别名 (Slug)</label>
                      <input type="text" value={editingReport.slug} onChange={e => setEditingReport({ ...editingReport, slug: e.target.value })} placeholder="留空自动生成" className="w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-stone-900 focus:border-stone-900 text-sm" />
                    </div>
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-stone-700 mb-1">发布状态</label>
                      <select value={editingReport.status} onChange={e => setEditingReport({ ...editingReport, status: e.target.value })} className="w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-stone-900 focus:border-stone-900 text-sm bg-white">
                        <option value="draft">草稿</option>
                        <option value="published">发布</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-stone-700 mb-1">封面图 URL</label>
                      <input type="text" value={editingReport.coverImage || ''} onChange={e => setEditingReport({ ...editingReport, coverImage: e.target.value })} placeholder="https://..." className="w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-stone-900 focus:border-stone-900 text-sm" />
                    </div>
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-stone-700 mb-1">PDF 附件 URL</label>
                      <input type="text" value={editingReport.pdfUrl || ''} onChange={e => setEditingReport({ ...editingReport, pdfUrl: e.target.value })} placeholder="https://..." className="w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-stone-900 focus:border-stone-900 text-sm" />
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">内容摘要</label>
                <textarea 
                  value={langTab === 'zh' ? editingReport.summary : (editingReport.translations[langTab]?.summary || '')} 
                  onChange={e => {
                    if (langTab === 'zh') setEditingReport({ ...editingReport, summary: e.target.value });
                    else setEditingReport({ ...editingReport, translations: { ...editingReport.translations, [langTab]: { ...editingReport.translations[langTab], summary: e.target.value } } });
                  }} 
                  className="w-full px-4 py-3 border rounded-lg focus:ring-1 focus:ring-stone-900 focus:border-stone-900 text-sm h-48 resize-none"
                  placeholder="输入报告摘要..."
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-stone-200 flex justify-end gap-3 bg-white shrink-0">
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-stone-600 hover:text-stone-900">取消</button>
              <button onClick={() => saveMutation.mutate(editingReport)} disabled={saveMutation.isPending} className="px-4 py-2 bg-stone-900 text-white rounded-lg hover:bg-stone-800 disabled:opacity-50">
                {saveMutation.isPending ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
