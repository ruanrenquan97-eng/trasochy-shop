import React, { useState, useEffect } from 'react';
import { Save, Plus, Trash2, Edit2, ImageIcon, Image as ImageIcon2, Bot } from 'lucide-react';
import api from '../../utils/api';
import toast from 'react-hot-toast';

export interface AcademicPaper {
  id: string;
  title: string;
  journal: string;
  authors: string;
  abstract: string;
  contribution: string;
  link?: string;
  en?: { title: string; journal: string; authors: string; abstract: string; contribution: string; };
  de?: { title: string; journal: string; authors: string; abstract: string; contribution: string; };
}

export interface Certificate {
  id: string;
  title: string;
  img: string;
  en?: { title: string; };
  de?: { title: string; };
}

export default function AdminAcademicConfig() {
  const [papers, setPapers] = useState<AcademicPaper[]>([]);
  const [patents, setPatents] = useState<Certificate[]>([]);
  const [awards, setAwards] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);

  const [editingPaper, setEditingPaper] = useState<AcademicPaper | null>(null);
  const [isPaperModalOpen, setIsPaperModalOpen] = useState(false);
  const [editingCert, setEditingCert] = useState<Certificate | null>(null);
  const [certType, setCertType] = useState<'patent' | 'award'>('patent');
  const [isCertModalOpen, setIsCertModalOpen] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const data = await api.get('/admin/settings') as any;
      const settingsMap: Record<string, string> = {};
      data.settings.forEach((s: any) => { settingsMap[s.key] = s.value; });

      try {
        if (settingsMap['brand_papers']) setPapers(JSON.parse(settingsMap['brand_papers']));
      } catch (e) { setPapers([]); }

      try {
        if (settingsMap['brand_patents']) setPatents(JSON.parse(settingsMap['brand_patents']));
      } catch (e) { setPatents([]); }
      
      try {
        if (settingsMap['brand_awards']) setAwards(JSON.parse(settingsMap['brand_awards']));
      } catch (e) { setAwards([]); }

    } catch (err) {
      toast.error('获取设置失败');
    } finally {
      setLoading(false);
    }
  };

  const savePapersToDb = async (newPapers: AcademicPaper[]) => {
    try {
      await api.put('/admin/settings/brand_papers', { value: JSON.stringify(newPapers) });
      toast.success('学术论文保存成功！', { id: 'savePaper' });
    } catch (err: any) {
      toast.error(err.response?.data?.error || '保存学术论文失败', { id: 'savePaper' });
    }
  };

  const savePatentsToDb = async (newPatents: Certificate[]) => {
    try {
      await api.put('/admin/settings/brand_patents', { value: JSON.stringify(newPatents) });
      toast.success('专利证书保存成功！', { id: 'savePatent' });
    } catch (err: any) {
      toast.error(err.response?.data?.error || '保存专利证书失败', { id: 'savePatent' });
    }
  };

  const saveAwardsToDb = async (newAwards: Certificate[]) => {
    try {
      await api.put('/admin/settings/brand_awards', { value: JSON.stringify(newAwards) });
      toast.success('获奖证书保存成功！', { id: 'saveAward' });
    } catch (err: any) {
      toast.error(err.response?.data?.error || '保存获奖证书失败', { id: 'saveAward' });
    }
  };

  const handleTranslateAllPapers = async () => {
    if (papers.length === 0) return;
    toast.loading('正在逐一翻译学术论文...', { id: 'transPaper' });
    try {
      const updated = await Promise.all(papers.map(async p => {
        const textsToTrans = { 
          title: p.title || '', 
          journal: p.journal || '', 
          authors: p.authors || '', 
          abstract: p.abstract || '', 
          contribution: p.contribution || '' 
        };
        const enRes: any = await api.post('/ai/translate', { texts: textsToTrans, targetLang: 'en' });
        const deRes: any = await api.post('/ai/translate', { texts: textsToTrans, targetLang: 'de' });
        
        const enObj = { ...p.en, ...(enRes.translated || {}) };
        const deObj = { ...p.de, ...(deRes.translated || {}) };
        
        return { ...p, en: enObj, de: deObj } as AcademicPaper;
      }));
      setPapers(updated);
      await savePapersToDb(updated);
      toast.success('学术论文自动翻译并保存成功！', { id: 'transPaper' });
    } catch (err) {
      toast.error('自动翻译部分论文失败', { id: 'transPaper' });
    }
  };

  const handleUpload = async (file: File, type: string) => {
    setUploading(type);
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
      if (data.url) {
        if (type === 'cert' && editingCert) {
          setEditingCert({ ...editingCert, img: data.url });
        } else if (type === 'paper' && editingPaper) {
          setEditingPaper({ ...editingPaper, link: data.url });
        }
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

  const savePaper = () => {
    if (!editingPaper) return;
    if (!editingPaper.title || !editingPaper.abstract) {
      toast.error('标题和摘要为必填项');
      return;
    }
    
    let updatedPapers = [...papers];
    if (papers.find(p => p.id === editingPaper.id)) {
      updatedPapers = updatedPapers.map(p => p.id === editingPaper.id ? editingPaper : p);
    } else {
      updatedPapers.push({ ...editingPaper, id: 'p' + Date.now() });
    }
    
    setPapers(updatedPapers);
    savePapersToDb(updatedPapers);
    setIsPaperModalOpen(false);
    setEditingPaper(null);
  };

  const deletePaper = (id: string) => {
    if (confirm('确定要删除该学术论文吗？')) {
      const updatedPapers = papers.filter(p => p.id !== id);
      setPapers(updatedPapers);
      savePapersToDb(updatedPapers);
    }
  };

  const openAddPaperModal = () => {
    setEditingPaper({ id: '', title: '', journal: '', authors: '', abstract: '', contribution: '', link: '', en: { title: '', journal: '', authors: '', abstract: '', contribution: '' }, de: { title: '', journal: '', authors: '', abstract: '', contribution: '' } });
    setIsPaperModalOpen(true);
  };

  const handleCertSave = () => {
    if (!editingCert) return;
    if (!editingCert.title || !editingCert.img) {
      toast.error('标题和图片为必填项');
      return;
    }
    
    if (certType === 'patent') {
      let updated = [...patents];
      if (patents.find(p => p.id === editingCert.id)) {
        updated = updated.map(p => p.id === editingCert.id ? editingCert : p);
      } else {
        updated.push({ ...editingCert, id: 'cert' + Date.now() });
      }
      setPatents(updated);
      savePatentsToDb(updated);
    } else {
      let updated = [...awards];
      if (awards.find(a => a.id === editingCert.id)) {
        updated = updated.map(a => a.id === editingCert.id ? editingCert : a);
      } else {
        updated.push({ ...editingCert, id: 'cert' + Date.now() });
      }
      setAwards(updated);
      saveAwardsToDb(updated);
    }
    
    setIsCertModalOpen(false);
    setEditingCert(null);
  };

  const handleCertDelete = (id: string, type: 'patent'|'award') => {
    if (confirm('确定要删除该证书吗？')) {
      if (type === 'patent') {
        const updated = patents.filter(p => p.id !== id);
        setPatents(updated);
        savePatentsToDb(updated);
      } else {
        const updated = awards.filter(a => a.id !== id);
        setAwards(updated);
        saveAwardsToDb(updated);
      }
    }
  };

  const openAddCertModal = (type: 'patent'|'award') => {
    setCertType(type);
    setEditingCert({ id: '', title: '', img: '', en: { title: '' }, de: { title: '' } });
    setIsCertModalOpen(true);
  };

  if (loading) return <div className="p-8 text-center text-gray-500">加载中...</div>;

  return (
    <div className="bg-white rounded-xl shadow-sm border p-6 mb-6 space-y-12">
      {/* 学术论文管理 */}
      <div>
        <div className="flex items-center justify-between mb-4 border-b pb-2">
          <h2 className="text-lg font-semibold text-gray-800">学术论文管理</h2>
          <div className="flex gap-2">
            <button onClick={handleTranslateAllPapers} className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 transition text-sm">
              <Bot size={14} /> 一键翻译现有论文
            </button>
            <button onClick={openAddPaperModal} className="flex items-center gap-1 px-3 py-1.5 bg-stone-900 text-white rounded-md hover:bg-stone-800 transition text-sm">
              <Plus size={14} /> 新增论文
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {papers.map(p => (
            <div key={p.id} className="border border-gray-200 rounded-xl p-4 bg-white flex flex-col justify-between shadow-sm">
              <div>
                <h3 className="font-bold text-gray-800 line-clamp-2 leading-tight mb-2">{p.title}</h3>
                <p className="text-sm text-blue-600 font-medium mb-1">{p.journal}</p>
                <p className="text-xs text-gray-500 line-clamp-1">{p.authors}</p>
              </div>
              <div className="mt-4 flex gap-2 justify-end">
                <button onClick={() => { setEditingPaper(p); setIsPaperModalOpen(true); }} className="text-blue-500 hover:text-blue-700 bg-blue-50 px-3 py-1 rounded text-sm transition">
                  <Edit2 size={14} className="inline mr-1"/> 编辑
                </button>
                <button onClick={() => deletePaper(p.id)} className="text-red-500 hover:text-red-700 bg-red-50 px-3 py-1 rounded text-sm transition">
                  <Trash2 size={14} className="inline mr-1"/> 删除
                </button>
              </div>
            </div>
          ))}
          {papers.length === 0 && (
            <div className="col-span-full py-8 text-center text-gray-400 bg-gray-50 rounded-xl border border-dashed">
              暂无学术论文，请点击右上角新增
            </div>
          )}
        </div>
      </div>

      {/* 专利证书管理 */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4 border-b pb-2">
          <h2 className="text-lg font-semibold text-gray-800">专利证书管理</h2>
          <button onClick={() => openAddCertModal('patent')} className="flex items-center gap-1 px-3 py-1.5 bg-stone-900 text-white rounded-md hover:bg-stone-800 transition text-sm">
            <Plus size={14} /> 新增专利
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {patents.map(p => (
            <div key={p.id} className="border border-gray-200 rounded-xl p-3 bg-white flex flex-col justify-between shadow-sm">
              <div className="aspect-[3/4] bg-gray-100 rounded-lg overflow-hidden mb-3 border">
                {p.img ? <img src={p.img} alt={p.title} className="w-full h-full object-cover" /> : <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 text-xs"><ImageIcon2 size={24}/></div>}
              </div>
              <h3 className="font-bold text-gray-800 text-sm line-clamp-2 leading-tight mb-3 text-center">{p.title}</h3>
              <div className="flex gap-2 justify-center">
                <button onClick={() => { setCertType('patent'); setEditingCert(p); setIsCertModalOpen(true); }} className="text-blue-500 hover:bg-blue-50 px-2 py-1 rounded text-xs transition">编辑</button>
                <button onClick={() => handleCertDelete(p.id, 'patent')} className="text-red-500 hover:bg-red-50 px-2 py-1 rounded text-xs transition">删除</button>
              </div>
            </div>
          ))}
          {patents.length === 0 && (
            <div className="col-span-full py-8 text-center text-gray-400 bg-gray-50 rounded-xl border border-dashed">
              暂无专利证书，请点击右上角新增
            </div>
          )}
        </div>
      </div>

      {/* 获奖证书管理 */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4 border-b pb-2">
          <h2 className="text-lg font-semibold text-gray-800">获奖证书管理</h2>
          <button onClick={() => openAddCertModal('award')} className="flex items-center gap-1 px-3 py-1.5 bg-stone-900 text-white rounded-md hover:bg-stone-800 transition text-sm">
            <Plus size={14} /> 新增获奖
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {awards.map(a => (
            <div key={a.id} className="border border-gray-200 rounded-xl p-3 bg-white flex flex-col justify-between shadow-sm">
              <div className="aspect-[3/4] bg-gray-100 rounded-lg overflow-hidden mb-3 border">
                {a.img ? <img src={a.img} alt={a.title} className="w-full h-full object-cover" /> : <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 text-xs"><ImageIcon2 size={24}/></div>}
              </div>
              <h3 className="font-bold text-gray-800 text-sm line-clamp-2 leading-tight mb-3 text-center">{a.title}</h3>
              <div className="flex gap-2 justify-center">
                <button onClick={() => { setCertType('award'); setEditingCert(a); setIsCertModalOpen(true); }} className="text-blue-500 hover:bg-blue-50 px-2 py-1 rounded text-xs transition">编辑</button>
                <button onClick={() => handleCertDelete(a.id, 'award')} className="text-red-500 hover:bg-red-50 px-2 py-1 rounded text-xs transition">删除</button>
              </div>
            </div>
          ))}
          {awards.length === 0 && (
            <div className="col-span-full py-8 text-center text-gray-400 bg-gray-50 rounded-xl border border-dashed">
              暂无获奖证书，请点击右上角新增
            </div>
          )}
        </div>
      </div>

      {/* Edit Paper Modal */}
      {isPaperModalOpen && editingPaper && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-gray-800">{editingPaper.id ? '编辑论文' : '新增论文'}</h3>
              <button onClick={() => setIsPaperModalOpen(false)} className="text-gray-400 hover:text-gray-600">&times;</button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              <div className="space-y-4">
                <h4 className="font-bold text-gray-700 bg-gray-100 px-3 py-1 rounded inline-block text-sm">中文内容</h4>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">论文标题 <span className="text-red-500">*</span></label>
                  <input type="text" value={editingPaper.title} onChange={e => setEditingPaper({...editingPaper, title: e.target.value})} className="w-full px-3 py-2 border rounded-md text-sm" placeholder="如：新型环肽的设计及其透皮促渗作用研究" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">发表期刊/会议及年份</label>
                    <input type="text" value={editingPaper.journal} onChange={e => setEditingPaper({...editingPaper, journal: e.target.value})} className="w-full px-3 py-2 border rounded-md text-sm" placeholder="如：Nature Communications (2024)" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">作者列表</label>
                    <input type="text" value={editingPaper.authors} onChange={e => setEditingPaper({...editingPaper, authors: e.target.value})} className="w-full px-3 py-2 border rounded-md text-sm" placeholder="如：Renquan Ruan, et al." />
                  </div>
                </div>
                <div className="flex gap-4 items-start pb-4 border-b">
                  <div className="w-24 h-32 bg-gray-100 border rounded-lg overflow-hidden shrink-0 flex flex-col">
                    {editingPaper.link ? (
                      <img src={editingPaper.link} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center text-gray-400 text-xs gap-1 text-center px-1">
                        <ImageIcon2 size={20} />文章首页图
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">文章首页图片 (原文献)</label>
                    <div className="flex gap-2">
                      <label className="flex items-center justify-center px-3 py-1.5 bg-gray-100 border border-gray-300 text-gray-700 rounded-md cursor-pointer hover:bg-gray-200 text-sm whitespace-nowrap">
                        {uploading === 'paper' ? '上传中...' : '本地上传'}
                        <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0], 'paper')} />
                      </label>
                      <input 
                        type="text" 
                        value={editingPaper.link || ''} 
                        onChange={e => setEditingPaper({...editingPaper, link: e.target.value})} 
                        placeholder="或输入图片URL" 
                        className="flex-1 px-2 py-1.5 border rounded-md text-sm min-w-[50px]" 
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">上传论文首页或关键图表的截图，用于展示在详情页</p>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">论文摘要 <span className="text-red-500">*</span></label>
                  <textarea 
                    value={editingPaper.abstract} 
                    onChange={e => setEditingPaper({...editingPaper, abstract: e.target.value})} 
                    className="w-full px-3 py-2 border rounded-md text-sm min-h-[100px] resize-y" 
                    placeholder="简要概括该论文的研究内容与发现..." 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">该研究对品牌的贡献 (品牌应用)</label>
                  <textarea 
                    value={editingPaper.contribution} 
                    onChange={e => setEditingPaper({...editingPaper, contribution: e.target.value})} 
                    className="w-full px-3 py-2 border rounded-md text-sm min-h-[80px] resize-y bg-blue-50/50" 
                    placeholder="这项研究成果直接支撑了品牌XX产品的核心透皮技术，使得..." 
                  />
                </div>
              </div>

              {/* English */}
              <div className="space-y-4 pt-4 border-t">
                <h4 className="font-bold text-gray-700 bg-blue-50 text-blue-700 px-3 py-1 rounded inline-block text-sm">English</h4>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title (EN)</label>
                  <input type="text" value={editingPaper.en?.title || ''} onChange={e => setEditingPaper({...editingPaper, en: { ...editingPaper.en, title: e.target.value } as any})} className="w-full px-3 py-2 border rounded-md text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Journal (EN)</label>
                    <input type="text" value={editingPaper.en?.journal || ''} onChange={e => setEditingPaper({...editingPaper, en: { ...editingPaper.en, journal: e.target.value } as any})} className="w-full px-3 py-2 border rounded-md text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Authors (EN)</label>
                    <input type="text" value={editingPaper.en?.authors || ''} onChange={e => setEditingPaper({...editingPaper, en: { ...editingPaper.en, authors: e.target.value } as any})} className="w-full px-3 py-2 border rounded-md text-sm" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Abstract (EN)</label>
                  <textarea value={editingPaper.en?.abstract || ''} onChange={e => setEditingPaper({...editingPaper, en: { ...editingPaper.en, abstract: e.target.value } as any})} className="w-full px-3 py-2 border rounded-md text-sm min-h-[80px] resize-y" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contribution (EN)</label>
                  <textarea value={editingPaper.en?.contribution || ''} onChange={e => setEditingPaper({...editingPaper, en: { ...editingPaper.en, contribution: e.target.value } as any})} className="w-full px-3 py-2 border rounded-md text-sm min-h-[80px] resize-y" />
                </div>
              </div>

              {/* Deutsch */}
              <div className="space-y-4 pt-4 border-t">
                <h4 className="font-bold text-gray-700 bg-emerald-50 text-emerald-700 px-3 py-1 rounded inline-block text-sm">Deutsch</h4>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title (DE)</label>
                  <input type="text" value={editingPaper.de?.title || ''} onChange={e => setEditingPaper({...editingPaper, de: { ...editingPaper.de, title: e.target.value } as any})} className="w-full px-3 py-2 border rounded-md text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Journal (DE)</label>
                    <input type="text" value={editingPaper.de?.journal || ''} onChange={e => setEditingPaper({...editingPaper, de: { ...editingPaper.de, journal: e.target.value } as any})} className="w-full px-3 py-2 border rounded-md text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Authors (DE)</label>
                    <input type="text" value={editingPaper.de?.authors || ''} onChange={e => setEditingPaper({...editingPaper, de: { ...editingPaper.de, authors: e.target.value } as any})} className="w-full px-3 py-2 border rounded-md text-sm" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Abstract (DE)</label>
                  <textarea value={editingPaper.de?.abstract || ''} onChange={e => setEditingPaper({...editingPaper, de: { ...editingPaper.de, abstract: e.target.value } as any})} className="w-full px-3 py-2 border rounded-md text-sm min-h-[80px] resize-y" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contribution (DE)</label>
                  <textarea value={editingPaper.de?.contribution || ''} onChange={e => setEditingPaper({...editingPaper, de: { ...editingPaper.de, contribution: e.target.value } as any})} className="w-full px-3 py-2 border rounded-md text-sm min-h-[80px] resize-y" />
                </div>
              </div>

            </div>

            <div className="p-4 border-t bg-gray-50 flex justify-end gap-2">
              <button onClick={() => setIsPaperModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md text-sm transition">取消</button>
              <button onClick={savePaper} className="px-4 py-2 bg-stone-900 text-white hover:bg-stone-800 rounded-md text-sm transition font-medium">保存论文</button>
            </div>
          </div>
        </div>
      )}
      
      {/* Edit Cert Modal */}
      {isCertModalOpen && editingCert && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-gray-800">{editingCert.id ? `编辑${certType === 'patent' ? '专利' : '获奖'}` : `新增${certType === 'patent' ? '专利' : '获奖'}`}</h3>
              <button onClick={() => setIsCertModalOpen(false)} className="text-gray-400 hover:text-gray-600">&times;</button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              <div className="flex gap-4 items-start pb-4 border-b">
                <div className="w-24 h-32 bg-gray-100 border rounded-lg overflow-hidden shrink-0 flex flex-col">
                  {editingCert.img ? (
                    <img src={editingCert.img} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400 text-xs gap-1">
                      <ImageIcon2 size={20} />无照片
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">证书照片</label>
                  <div className="flex gap-2">
                    <label className="flex items-center justify-center px-3 py-1.5 bg-gray-100 border border-gray-300 text-gray-700 rounded-md cursor-pointer hover:bg-gray-200 text-sm whitespace-nowrap">
                      {uploading === 'cert' ? '上传中...' : '本地上传'}
                      <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0], 'cert')} />
                    </label>
                    <input 
                      type="text" 
                      value={editingCert.img} 
                      onChange={e => setEditingCert({...editingCert, img: e.target.value})} 
                      placeholder="或输入图片URL" 
                      className="flex-1 px-2 py-1.5 border rounded-md text-sm min-w-[50px]" 
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">建议上传清晰的竖版扫描件/照片</p>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-bold text-gray-700 bg-gray-100 px-3 py-1 rounded inline-block text-sm">中文内容</h4>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">证书名称 <span className="text-red-500">*</span></label>
                  <input type="text" value={editingCert.title} onChange={e => setEditingCert({...editingCert, title: e.target.value})} className="w-full px-3 py-2 border rounded-md text-sm" placeholder="例如：一种新型皮肤促渗活性组合物" />
                </div>
              </div>
              
              <div className="space-y-4 pt-4 border-t">
                <h4 className="font-bold text-gray-700 bg-blue-50 text-blue-700 px-3 py-1 rounded inline-block text-sm">English</h4>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title (EN)</label>
                  <input type="text" value={editingCert.en?.title || ''} onChange={e => setEditingCert({...editingCert, en: { ...editingCert.en, title: e.target.value } as any})} className="w-full px-3 py-2 border rounded-md text-sm" />
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t">
                <h4 className="font-bold text-gray-700 bg-emerald-50 text-emerald-700 px-3 py-1 rounded inline-block text-sm">Deutsch</h4>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title (DE)</label>
                  <input type="text" value={editingCert.de?.title || ''} onChange={e => setEditingCert({...editingCert, de: { ...editingCert.de, title: e.target.value } as any})} className="w-full px-3 py-2 border rounded-md text-sm" />
                </div>
              </div>

            </div>

            <div className="p-4 border-t bg-gray-50 flex justify-end gap-2">
              <button onClick={() => setIsCertModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md text-sm transition">取消</button>
              <button onClick={handleCertSave} className="px-4 py-2 bg-stone-900 text-white hover:bg-stone-800 rounded-md text-sm transition font-medium">保存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
