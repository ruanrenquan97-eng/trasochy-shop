import React, { useState, useEffect } from 'react';
import { Save, Plus, Trash2, Edit2, ImageIcon, Image as ImageIcon2, Bot, RefreshCw } from 'lucide-react';
import api from '../../utils/api';
import toast from 'react-hot-toast';

import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

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

const TEXT_KEYS = [
  { key: 'bs_hero_title', label: '首屏标题', type: 'text', default: '中国好成分' },
  { key: 'bs_hero_subtitle', label: '首屏副标题', type: 'text', default: '透皮好吸收' },
  { key: 'bs_hero_desc', label: '首屏描述', type: 'textarea', default: '全球生物透皮递送技术领导者' },
  { key: 'bs_sec1_title', label: '概览标题', type: 'text', default: '品牌概览' },
  { key: 'bs_sec1_subtitle', label: '概览副标题', type: 'text', default: '依托领先的生物透皮技术与绿色合成生物制造' },
  { key: 'bs_sec1_desc', label: '概览描述', type: 'textarea', default: '美尔健生物 是一家专注新型生物功效活性材料开发、制造与整体方案输出的国家高新科技企业。我们以生物科技为核心，专注于活性成分与透皮递送技术的研发与产业化，构建从分子设计、原料制造到应用解决方案的完整能力体系，为全球品牌提供可信赖的技术支持。' },
  { key: 'bs_sec1_list1', label: '概览亮点 1', type: 'text', default: '专注“皮肤抗衰老分子”、“海洋蓝色分子”和“特色植物资源”研究' },
  { key: 'bs_sec1_list2', label: '概览亮点 2', type: 'text', default: '全球独创的第三代生物透皮技术' },
  { key: 'bs_sec1_list3', label: '概览亮点 3', type: 'text', default: '人工智能分子设计，合成生物学基础，开发定制化解决方案' },
  { key: 'bs_sec1_badge_title', label: '徽标大字', type: 'text', default: '4600㎡' },
  { key: 'bs_sec1_badge_desc', label: '徽标小字', type: 'text', default: 'GMP细胞工厂与研发中心' },
  { key: 'bs_tech_title', label: '技术平台标题', type: 'text', default: '核心技术平台' },
  { key: 'bs_tech_desc', label: '技术平台描述', type: 'textarea', default: '围绕活性成分设计、生物透皮递送与产业化制造，构建多平台协同的技术体系，将复杂科研能力转化为稳定、可复制、可验证的应用解决方案。' },
  { key: 'bs_tech1_title', label: '技术模块1标题', type: 'text', default: 'AI 分子设计' },
  { key: 'bs_tech1_desc', label: '技术模块1描述', type: 'textarea', default: '覆盖分子/细胞层面的设计与机理研究，支撑核心透皮技术迭代。基于AI深度学习高效筛选与优化活性分子/功能原料。' },
  { key: 'bs_tech2_title', label: '技术模块2标题', type: 'text', default: '生物透皮递送' },
  { key: 'bs_tech2_desc', label: '技术模块2描述', type: 'textarea', default: '全球领先的cTDP促渗透机理，解决大分子难穿过角质层致密“砖墙结构”的行业难题，让活性物深层起效。' },
  { key: 'bs_tech3_title', label: '技术模块3标题', type: 'text', default: '合成生物制造' },
  { key: 'bs_tech3_desc', label: '技术模块3描述', type: 'textarea', default: '从菌株构建、发酵放大到纯化制备的规模化生产，形成从设计到落地的闭环能力，保障稳定量产。' },
  { key: 'bs_ctdp_title', label: 'cTDP大标题', type: 'text', default: 'cTDP 促渗透机理与过程' },
  { key: 'bs_ctdp1_title', label: '机理步骤 1 标题', type: 'text', default: '特异结合' },
  { key: 'bs_ctdp1_desc', label: '机理步骤 1 描述', type: 'text', default: '环肽与皮肤表面细胞受体专一性结合' },
  { key: 'bs_ctdp2_title', label: '机理步骤 2 标题', type: 'text', default: '打开通道' },
  { key: 'bs_ctdp2_desc', label: '机理步骤 2 描述', type: 'text', default: '皮肤细胞表面紧密连接结构改变，5分钟形成较大间隙' },
  { key: 'bs_ctdp3_title', label: '机理步骤 3 标题', type: 'text', default: '深层递送' },
  { key: 'bs_ctdp3_desc', label: '机理步骤 3 描述', type: 'text', default: '大分子活性物通过打开的细胞间隙顺利渗透' },
  { key: 'bs_ctdp4_title', label: '机理步骤 4 标题', type: 'text', default: '自然闭合' },
  { key: 'bs_ctdp4_desc', label: '机理步骤 4 描述', type: 'text', default: '15分钟后皮肤间隙自动恢复正常屏障结构' },
  { key: 'bs_team_subtitle', label: '研发团队小标题', type: 'text', default: 'Global R&D Team' },
  { key: 'bs_team_title', label: '研发团队大标题', type: 'text', default: '瑞士创新中心 (MSIC)' },
  { key: 'bs_team_desc', label: '研发团队描述', type: 'textarea', default: '以中瑞技术连接为纽带，融合瑞士抗衰理念与先进透皮技术，推动关键成果的应用转化与产品升级，形成更完善的研发验证体系与持续创新能力。' },
  { key: 'bs_quote_title', label: '底部语录标题', type: 'text', default: '中瑞联合研发与技术共创' },
  { key: 'bs_quote_desc', label: '底部语录正文', type: 'textarea', default: '瑞士端负责欧洲创新原料开发、方法开发、机理验证及人体功效设计与数据规范；中国端负责产业化转化与高效交付，形成贯通上游创新与下游制造的完美闭环体系。' },
];

export default function BrandStoryConfig() {
  const [heroBg, setHeroBg] = useState('');
  const [techBg, setTechBg] = useState('');
  const quillRef = React.useRef<any>(null);
  const [papers, setPapers] = useState<AcademicPaper[]>([]);
  const [patents, setPatents] = useState<Certificate[]>([]);
  const [awards, setAwards] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);

  // Texts state
  const [texts, setTexts] = useState<Record<string, string>>({});
  const [translations, setTranslations] = useState<Record<string, any>>({});
  const [langTab, setLangTab] = useState<'zh' | 'en' | 'de'>('zh');
  const [translating, setTranslating] = useState(false);

  // Form states
  const [pageAboutLang, setPageAboutLang] = useState<'zh'|'en'|'de'>('zh');
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
      const data = await api.get('/admin/settings');
      const settingsMap: Record<string, string> = {};
      const transMap: Record<string, any> = {};

      data.settings.forEach((s: any) => { 
        settingsMap[s.key] = s.value;
        if (s.translations) {
          try {
            transMap[s.key] = typeof s.translations === 'string' ? JSON.parse(s.translations) : s.translations;
          } catch {
            transMap[s.key] = { en: { value: '' }, de: { value: '' } };
          }
        }
      });
      
      setHeroBg(settingsMap['brand_hero_bg'] || '');
      setTechBg(settingsMap['brand_tech_bg'] || '');
      

      
      try {
        if (settingsMap['brand_papers']) setPapers(JSON.parse(settingsMap['brand_papers']));
      } catch (e) { setPapers([]); }

      try {
        if (settingsMap['brand_patents']) setPatents(JSON.parse(settingsMap['brand_patents']));
      } catch (e) { setPatents([]); }
      
      try {
        if (settingsMap['brand_awards']) setAwards(JSON.parse(settingsMap['brand_awards']));
      } catch (e) { setAwards([]); }

      const initialTexts: Record<string, string> = {};
      const initialTrans: Record<string, any> = {};
      TEXT_KEYS.forEach(tk => {
        initialTexts[tk.key] = settingsMap[tk.key] || tk.default;
        initialTrans[tk.key] = transMap[tk.key] || { en: { value: '' }, de: { value: '' } };
      });
      // Initialize page_about texts
      initialTexts['page_about'] = settingsMap['page_about'] || '';
      initialTrans['page_about'] = transMap['page_about'] || { en: { value: '' }, de: { value: '' } };

      setTexts(initialTexts);
      setTranslations(initialTrans);

      setLoading(false);
    } catch (err) {
      toast.error('获取配置失败');
      setLoading(false);
    }
  };

  const handleSaveImages = async () => {
    setSaving(true);
    try {
      await api.put('/admin/settings', {
        settings: {
          brand_hero_bg: heroBg,
          brand_tech_bg: techBg
        }
      });
      toast.success('背景图片保存成功');
    } catch (err) {
      toast.error('保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTexts = async () => {
    setSaving(true);
    try {
      const promises = TEXT_KEYS.map(tk => 
        api.put(`/admin/settings/${tk.key}`, { 
          value: texts[tk.key], 
          translations: translations[tk.key] 
        })
      );
      promises.push(
        api.put('/admin/settings/page_about', {
          value: texts['page_about'],
          translations: translations['page_about']
        })
      );
      await Promise.all(promises);
      toast.success('文案保存成功');
    } catch (err) {
      toast.error('保存文案失败');
    } finally {
      setSaving(false);
    }
  };

  const handleAutoTranslate = async () => {
    setTranslating(true);
    try {
      const allKeys = TEXT_KEYS.map(tk => tk.key);
      const chunkSize = 5;
      
      const newEnTrans: Record<string, string> = {};
      const newDeTrans: Record<string, string> = {};

      for (let i = 0; i < allKeys.length; i += chunkSize) {
        const chunkKeys = allKeys.slice(i, i + chunkSize);
        const textsToTranslate: Record<string, string> = {};
        chunkKeys.forEach(key => { if (texts[key]) textsToTranslate[key] = texts[key]; });

        if (Object.keys(textsToTranslate).length === 0) continue;

        const enRes: any = await api.post('/ai/translate', { texts: textsToTranslate, targetLang: 'en' });
        const deRes: any = await api.post('/ai/translate', { texts: textsToTranslate, targetLang: 'de' });
        Object.assign(newEnTrans, enRes.translated || {});
        Object.assign(newDeTrans, deRes.translated || {});
      }

      setTranslations(prev => {
        const next = { ...prev };
        TEXT_KEYS.forEach(tk => {
          if (!next[tk.key]) next[tk.key] = { en: { value: '' }, de: { value: '' } };
          if (newEnTrans[tk.key]) next[tk.key].en = { value: newEnTrans[tk.key] };
          if (newDeTrans[tk.key]) next[tk.key].de = { value: newDeTrans[tk.key] };
        });
        return next;
      });

      toast.success('翻译生成成功，请点击保存文案');
    } catch (err: any) {
      toast.error(err.response?.data?.error || '翻译失败');
    } finally {
      setTranslating(false);
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
      const newPapers = [...papers];
      for (const p of newPapers) {
        const textToTrans = { title: p.title, journal: p.journal, authors: p.authors, abstract: p.abstract, contribution: p.contribution };
        const enRes: any = await api.post('/ai/translate', { texts: textToTrans, targetLang: 'en' });
        const deRes: any = await api.post('/ai/translate', { texts: textToTrans, targetLang: 'de' });
        
        const enTrans = enRes.translated || {};
        const deTrans = deRes.translated || {};
        
        p.en = { title: enTrans.title || p.title, journal: enTrans.journal || p.journal, authors: enTrans.authors || p.authors, abstract: enTrans.abstract || p.abstract, contribution: enTrans.contribution || p.contribution };
        p.de = { title: deTrans.title || p.title, journal: deTrans.journal || p.journal, authors: deTrans.authors || p.authors, abstract: deTrans.abstract || p.abstract, contribution: deTrans.contribution || p.contribution };
      }
      setPapers(newPapers);
      await savePapersToDb(newPapers);
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
        if (type === 'hero') setHeroBg(data.url);
        else if (type === 'tech') setTechBg(data.url);
        else if (type === 'page_about') {
          const editor = quillRef.current?.getEditor?.();
          if (editor) {
            const range = editor.getSelection(true);
            editor.clipboard.dangerouslyPasteHTML(range.index, `<img src="${data.url}" alt="" style="max-width:100%;height:auto;" />`);
          }
        } else if (type === 'cert' && editingCert) {
          setEditingCert({ ...editingCert, img: data.url });
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

  if (loading) return <div className="p-8 text-center text-gray-500">加载中...</div>;

  return (
    <div className="bg-white rounded-xl shadow-sm border p-6 mb-6 space-y-12">
      {/* 文本配置区 */}
      <div>
        <div className="flex justify-between items-center mb-6 border-b pb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">页面核心文案配置</h2>
            <p className="text-sm text-gray-500 mt-1">修改品牌故事页面的主要文案并支持一键多语言翻译。</p>
          </div>
          <div className="flex gap-4 items-center">
            <div className="flex border-b border-gray-200">
              {['zh', 'en', 'de'].map(l => (
                <button 
                  key={l}
                  onClick={() => setLangTab(l as any)}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${langTab === l ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                  {l === 'zh' ? '中文' : l === 'en' ? 'English' : 'Deutsch'}
                </button>
              ))}
            </div>
            <button
              onClick={handleAutoTranslate}
              disabled={translating || saving}
              className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium px-3 py-1.5 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors disabled:opacity-50"
            >
              {translating ? <RefreshCw size={14} className="animate-spin" /> : <Bot size={14} />}
              一键自动翻译
            </button>
            <button
              onClick={handleSaveTexts}
              disabled={saving || translating}
              className="flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition disabled:opacity-50 text-sm"
            >
              <Save size={14} /> 保存全部文案
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-xl border border-slate-100 max-h-[600px] overflow-y-auto">
          {TEXT_KEYS.map(tk => (
            <div key={tk.key} className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
              <label className="block text-sm font-medium text-gray-700 mb-2">{tk.label}</label>
              {langTab === 'zh' ? (
                tk.type === 'textarea' ? (
                  <textarea
                    value={texts[tk.key] || ''}
                    onChange={e => setTexts({...texts, [tk.key]: e.target.value})}
                    className="w-full px-3 py-2 border rounded-md text-sm min-h-[80px]"
                  />
                ) : (
                  <input
                    type="text"
                    value={texts[tk.key] || ''}
                    onChange={e => setTexts({...texts, [tk.key]: e.target.value})}
                    className="w-full px-3 py-2 border rounded-md text-sm"
                  />
                )
              ) : (
                tk.type === 'textarea' ? (
                  <textarea
                    value={translations[tk.key]?.[langTab]?.value || ''}
                    onChange={e => setTranslations({...translations, [tk.key]: {...translations[tk.key], [langTab]: { value: e.target.value }}})}
                    className="w-full px-3 py-2 border rounded-md text-sm min-h-[80px]"
                    placeholder="Translation"
                  />
                ) : (
                  <input
                    type="text"
                    value={translations[tk.key]?.[langTab]?.value || ''}
                    onChange={e => setTranslations({...translations, [tk.key]: {...translations[tk.key], [langTab]: { value: e.target.value }}})}
                    className="w-full px-3 py-2 border rounded-md text-sm"
                    placeholder="Translation"
                  />
                )
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 背景图片配置 */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">背景图片配置</h2>
        <div className="grid md:grid-cols-2 gap-6">
          {/* Hero BG */}
          <div className="p-4 border rounded-lg bg-slate-50">
            <h3 className="text-sm font-medium text-gray-700 mb-2">首屏背景大图 (Hero Background)</h3>
            {heroBg && (
              <img src={heroBg} alt="Hero BG" className="w-full h-32 object-cover rounded-md mb-3 border border-gray-200" />
            )}
            <div className="flex items-center gap-2">
               <label className="flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-md cursor-pointer hover:bg-gray-50 text-sm">
                <ImageIcon size={14} />
                {uploading === 'hero' ? '上传中...' : '更换图片'}
                <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0], 'hero')} />
              </label>
              <input type="text" value={heroBg} onChange={e => setHeroBg(e.target.value)} placeholder="图片URL" className="flex-1 px-2 py-1.5 border rounded-md text-sm" />
            </div>
          </div>

          {/* Tech BG */}
          <div className="p-4 border rounded-lg bg-slate-50">
            <h3 className="text-sm font-medium text-gray-700 mb-2">核心技术背景图 (Tech Background)</h3>
            {techBg && (
              <img src={techBg} alt="Tech BG" className="w-full h-32 object-cover rounded-md mb-3 border border-gray-200" />
            )}
            <div className="flex items-center gap-2">
               <label className="flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-md cursor-pointer hover:bg-gray-50 text-sm">
                <ImageIcon size={14} />
                {uploading === 'tech' ? '上传中...' : '更换图片'}
                <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0], 'tech')} />
              </label>
              <input type="text" value={techBg} onChange={e => setTechBg(e.target.value)} placeholder="图片URL" className="flex-1 px-2 py-1.5 border rounded-md text-sm" />
            </div>
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button onClick={handleSaveImages} disabled={saving} className="flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition text-sm disabled:opacity-50">
            <Save size={14} /> 保存图片配置
          </button>
        </div>
      </div>

      {/* 品牌故事 (富文本) */}
      <div>
        <div className="flex items-center justify-between mb-4 border-b pb-2">
          <h2 className="text-lg font-semibold text-gray-800">品牌故事 (关于我们) 内容配置</h2>
          <div className="flex gap-4 items-center">
            <div className="flex border-b border-gray-200">
              {['zh', 'en', 'de'].map(l => (
                <button 
                  key={l}
                  onClick={() => setPageAboutLang(l as any)}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${pageAboutLang === l ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                  {l === 'zh' ? '中文' : l === 'en' ? 'English' : 'Deutsch'}
                </button>
              ))}
            </div>
            <button
              onClick={handleSaveTexts}
              disabled={saving}
              className="flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition disabled:opacity-50 text-sm"
            >
              <Save size={14} /> 保存品牌故事
            </button>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border">
          <ReactQuill
            ref={quillRef}
            theme="snow"
            value={pageAboutLang === 'zh' ? (texts['page_about'] || '') : (translations['page_about']?.[pageAboutLang]?.value || '')}
            onChange={val => {
              if (pageAboutLang === 'zh') {
                setTexts({...texts, page_about: val});
              } else {
                setTranslations({...translations, page_about: {...translations['page_about'], [pageAboutLang]: { value: val }}});
              }
            }}
            modules={{
              toolbar: {
                container: [
                  [{ header: [1, 2, 3, false] }],
                  ['bold', 'italic', 'underline'],
                  [{ list: 'ordered' }, { list: 'bullet' }],
                  ['link'],
                  ['image'],
                  ['clean'],
                ],
                handlers: {
                  image: () => {
                    const input = document.createElement('input');
                    input.setAttribute('type', 'file');
                    input.setAttribute('accept', 'image/*');
                    input.click();
                    input.onchange = () => {
                      if (input.files?.[0]) handleUpload(input.files[0], 'page_about');
                    };
                  }
                }
              }
            }}
            className="h-80 pb-12"
          />
        </div>
      </div>

      {/* Edit Paper Modal */}
      {isPaperModalOpen && editingPaper && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-gray-800">{editingPaper.id ? '编辑学术论文' : '新增学术论文'}</h3>
              <button onClick={() => setIsPaperModalOpen(false)} className="text-gray-400 hover:text-gray-600">&times;</button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {/* 中文 */}
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">原文献链接 (可选)</label>
                  <input type="text" value={editingPaper.link || ''} onChange={e => setEditingPaper({...editingPaper, link: e.target.value})} className="w-full px-3 py-2 border rounded-md text-sm" placeholder="如：https://doi.org/..." />
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
