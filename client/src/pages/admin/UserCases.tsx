import React, { useState, useEffect } from 'react';
import { Save, Plus, Trash2, Edit2, ImageIcon, Image as ImageIcon2, Bot } from 'lucide-react';
import api from '../../utils/api';
import toast from 'react-hot-toast';

export interface UserCase {
  id: string;
  title: string;
  tags: string[];
  desc: string;
  content?: string;
  img: string;
  en?: { title: string; tags: string[]; desc: string; content?: string; };
  de?: { title: string; tags: string[]; desc: string; content?: string; };
}

export default function AdminUserCases() {
  const [cases, setCases] = useState<UserCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);

  const [editingCase, setEditingCase] = useState<UserCase | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const data = await api.get('/admin/settings');
      const settingsMap: Record<string, string> = {};
      data.settings.forEach((s: any) => { settingsMap[s.key] = s.value; });
      
      try {
        if (settingsMap['brand_user_cases']) setCases(JSON.parse(settingsMap['brand_user_cases']));
      } catch (e) { setCases([]); }
      
      setLoading(false);
    } catch (err) {
      toast.error('获取配置失败');
      setLoading(false);
    }
  };

  const saveCasesToDb = async (newCases: UserCase[]) => {
    try {
      await api.put('/admin/settings/brand_user_cases', { value: JSON.stringify(newCases) });
      toast.success('案例保存成功！', { id: 'saveCases' });
    } catch (err: any) {
      toast.error(err.response?.data?.error || '保存案例失败', { id: 'saveCases' });
    }
  };

  const handleTranslateAll = async () => {
    if (cases.length === 0) return;
    toast.loading('正在逐一翻译案例...', { id: 'transCases' });
    try {
      const newCases = [...cases];
      for (const c of newCases) {
        const textToTrans = { title: c.title, tags: c.tags.join(' | '), desc: c.desc, content: c.content || '' };
        const enRes: any = await api.post('/ai/translate', { texts: textToTrans, targetLang: 'en' });
        const deRes: any = await api.post('/ai/translate', { texts: textToTrans, targetLang: 'de' });
        
        const enTrans = enRes.translated || {};
        const deTrans = deRes.translated || {};
        
        c.en = { 
          title: enTrans.title || c.title, 
          tags: enTrans.tags ? enTrans.tags.split('|').map((t:string)=>t.trim()) : c.tags, 
          desc: enTrans.desc || c.desc,
          content: enTrans.content || c.content 
        };
        c.de = { 
          title: deTrans.title || c.title, 
          tags: deTrans.tags ? deTrans.tags.split('|').map((t:string)=>t.trim()) : c.tags, 
          desc: deTrans.desc || c.desc,
          content: deTrans.content || c.content 
        };
      }
      setCases(newCases);
      await saveCasesToDb(newCases);
      toast.success('案例自动翻译并保存成功！', { id: 'transCases' });
    } catch (err) {
      toast.error('自动翻译部分案例失败', { id: 'transCases' });
    }
  };

  const handleUpload = async (file: File) => {
    setUploading('case');
    const formData = new FormData();
    formData.append('image', file);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/upload/image', {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        body: formData,
      });
      const data = await res.json();
      if (data.url && editingCase) {
        setEditingCase({ ...editingCase, img: data.url });
        toast.success('图片上传成功');
      } else {
         toast.error(data.error || '上传失败');
      }
    } catch (err) {
      toast.error('上传出错');
    } finally {
      setUploading('');
    }
  };

  const handleSave = () => {
    if (!editingCase) return;
    if (!editingCase.title) {
      toast.error('标题为必填项');
      return;
    }
    
    let updated = [...cases];
    if (cases.find(c => c.id === editingCase.id)) {
      updated = updated.map(c => c.id === editingCase.id ? editingCase : c);
    } else {
      updated.push({ ...editingCase, id: 'uc' + Date.now() });
    }
    
    setCases(updated);
    saveCasesToDb(updated);
    setIsModalOpen(false);
    setEditingCase(null);
  };

  const handleDelete = (id: string) => {
    if (confirm('确定要删除该案例吗？')) {
      const updated = cases.filter(c => c.id !== id);
      setCases(updated);
      saveCasesToDb(updated);
    }
  };

  const openAddModal = () => {
    setEditingCase({ id: '', title: '', tags: [], desc: '', content: '', img: '', en: { title: '', tags: [], desc: '', content: '' }, de: { title: '', tags: [], desc: '', content: '' } });
    setIsModalOpen(true);
  };

  if (loading) return <div className="p-8 text-center text-gray-500">加载中...</div>;

  return (
    <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
      <div className="flex items-center justify-between mb-4 border-b pb-2">
        <h2 className="text-lg font-semibold text-gray-800">用户案例管理</h2>
        <div className="flex gap-2">
          <button onClick={handleTranslateAll} className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 transition text-sm">
            <Bot size={14} /> 一键翻译现有案例
          </button>
          <button onClick={openAddModal} className="flex items-center gap-1 px-3 py-1.5 bg-stone-900 text-white rounded-md hover:bg-stone-800 transition text-sm">
            <Plus size={14} /> 新增案例
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cases.map((c) => (
          <div key={c.id} className="border rounded-lg overflow-hidden flex flex-col bg-white">
            <div className="aspect-[4/3] bg-gray-100 relative">
              {c.img ? (
                <img src={c.img} alt={c.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">无图片</div>
              )}
              <div className="absolute top-2 right-2 flex gap-1">
                <button onClick={() => { setEditingCase(c); setIsModalOpen(true); }} className="p-1.5 bg-white/90 text-blue-600 rounded-md shadow-sm hover:bg-white transition">
                  <Edit2 size={14} />
                </button>
                <button onClick={() => handleDelete(c.id)} className="p-1.5 bg-white/90 text-red-600 rounded-md shadow-sm hover:bg-white transition">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
            <div className="p-4 flex-1 flex flex-col">
              <h3 className="font-bold text-gray-800 line-clamp-1">{c.title}</h3>
              <div className="flex flex-wrap gap-1 mb-2 mt-2">
                {c.tags.map((tag, i) => (
                  <span key={i} className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{tag}</span>
                ))}
              </div>
               <p className="text-xs text-gray-500 line-clamp-3">{c.desc}</p>
            </div>
          </div>
        ))}
        {cases.length === 0 && (
           <div className="col-span-full py-8 text-center text-gray-500 text-sm bg-gray-50 rounded-lg border border-dashed">
             暂无用户案例，请点击右上角新增。
           </div>
        )}
      </div>

      {/* Edit Modal */}
      {isModalOpen && editingCase && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-gray-800">{editingCase.id ? '编辑案例' : '新增案例'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">&times;</button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              <div className="flex gap-4 items-start pb-4 border-b">
                <div className="w-24 h-24 bg-gray-100 border rounded-lg overflow-hidden shrink-0 flex flex-col">
                  {editingCase.img ? (
                    <img src={editingCase.img} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400 text-xs gap-1">
                      <ImageIcon2 size={20} />无照片
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">案例图片 (前后对比或照片)</label>
                  <div className="flex gap-2">
                    <label className="flex items-center justify-center px-3 py-1.5 bg-gray-100 border border-gray-300 text-gray-700 rounded-md cursor-pointer hover:bg-gray-200 text-sm whitespace-nowrap">
                      {uploading === 'case' ? '上传中...' : '本地上传'}
                      <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0])} />
                    </label>
                    <input 
                      type="text" 
                      value={editingCase.img} 
                      onChange={e => setEditingCase({...editingCase, img: e.target.value})} 
                      placeholder="或输入图片URL" 
                      className="flex-1 px-2 py-1.5 border rounded-md text-sm" 
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">建议 4:3 比例的横图或者对比图</p>
                </div>
              </div>

              {/* 中文 */}
              <div className="space-y-4">
                <h4 className="font-bold text-gray-700 bg-gray-100 px-3 py-1 rounded inline-block text-sm">中文内容</h4>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">案例标题 <span className="text-red-500">*</span></label>
                  <input type="text" value={editingCase.title} onChange={e => setEditingCase({...editingCase, title: e.target.value})} className="w-full px-3 py-2 border rounded-md text-sm" placeholder="如：3周淡化法令纹反馈" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">用户标签 (逗号或竖线分隔)</label>
                  <input 
                    type="text" 
                    value={editingCase.tags.join(' | ')} 
                    onChange={e => setEditingCase({...editingCase, tags: e.target.value.split(/[\|,]/).map(t => t.trim()).filter(Boolean)})} 
                    className="w-full px-3 py-2 border rounded-md text-sm" 
                    placeholder="如：28岁 | 干性肌肤 | 熬夜修护" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">简短描述</label>
                  <textarea 
                    value={editingCase.desc} 
                    onChange={e => setEditingCase({...editingCase, desc: e.target.value})} 
                    className="w-full px-3 py-2 border rounded-md text-sm h-20 resize-none" 
                    placeholder="简短的一句话描述效果..." 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">详细反馈 (可选)</label>
                  <textarea 
                    value={editingCase.content || ''} 
                    onChange={e => setEditingCase({...editingCase, content: e.target.value})} 
                    className="w-full px-3 py-2 border rounded-md text-sm h-32 resize-y" 
                    placeholder="完整的案例细节描述..." 
                  />
                </div>
              </div>

              {/* English */}
              <div className="space-y-4 pt-4 border-t">
                <h4 className="font-bold text-gray-700 bg-blue-50 text-blue-700 px-3 py-1 rounded inline-block text-sm">English</h4>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title (EN)</label>
                  <input type="text" value={editingCase.en?.title || ''} onChange={e => setEditingCase({...editingCase, en: { ...editingCase.en, title: e.target.value } as any})} className="w-full px-3 py-2 border rounded-md text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tags (EN) (| separated)</label>
                  <input 
                    type="text" 
                    value={editingCase.en?.tags?.join(' | ') || ''} 
                    onChange={e => setEditingCase({...editingCase, en: { ...editingCase.en, tags: e.target.value.split(/[\|,]/).map(t => t.trim()).filter(Boolean) } as any})} 
                    className="w-full px-3 py-2 border rounded-md text-sm" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Desc (EN) - Short</label>
                  <textarea 
                    value={editingCase.en?.desc || ''} 
                    onChange={e => setEditingCase({...editingCase, en: { ...editingCase.en, desc: e.target.value } as any})} 
                    className="w-full px-3 py-2 border rounded-md text-sm h-20 resize-none" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Content (EN) - Full</label>
                  <textarea 
                    value={editingCase.en?.content || ''} 
                    onChange={e => setEditingCase({...editingCase, en: { ...editingCase.en, content: e.target.value } as any})} 
                    className="w-full px-3 py-2 border rounded-md text-sm h-32 resize-y" 
                  />
                </div>
              </div>

              {/* Deutsch */}
              <div className="space-y-4 pt-4 border-t">
                <h4 className="font-bold text-gray-700 bg-emerald-50 text-emerald-700 px-3 py-1 rounded inline-block text-sm">Deutsch</h4>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title (DE)</label>
                  <input type="text" value={editingCase.de?.title || ''} onChange={e => setEditingCase({...editingCase, de: { ...editingCase.de, title: e.target.value } as any})} className="w-full px-3 py-2 border rounded-md text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tags (DE) (| separated)</label>
                  <input 
                    type="text" 
                    value={editingCase.de?.tags?.join(' | ') || ''} 
                    onChange={e => setEditingCase({...editingCase, de: { ...editingCase.de, tags: e.target.value.split(/[\|,]/).map(t => t.trim()).filter(Boolean) } as any})} 
                    className="w-full px-3 py-2 border rounded-md text-sm" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Desc (DE) - Short</label>
                  <textarea 
                    value={editingCase.de?.desc || ''} 
                    onChange={e => setEditingCase({...editingCase, de: { ...editingCase.de, desc: e.target.value } as any})} 
                    className="w-full px-3 py-2 border rounded-md text-sm h-20 resize-none" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Content (DE) - Full</label>
                  <textarea 
                    value={editingCase.de?.content || ''} 
                    onChange={e => setEditingCase({...editingCase, de: { ...editingCase.de, content: e.target.value } as any})} 
                    className="w-full px-3 py-2 border rounded-md text-sm h-32 resize-y" 
                  />
                </div>
              </div>

            </div>
            
            <div className="p-4 border-t bg-gray-50 flex justify-end gap-3">
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition text-sm">取消</button>
              <button onClick={handleSave} className="px-6 py-2 bg-stone-900 text-white rounded-md hover:bg-stone-800 transition text-sm">保存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
