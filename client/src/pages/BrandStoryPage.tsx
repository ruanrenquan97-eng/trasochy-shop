import React, { useEffect, useState } from 'react';
import { ShieldCheck, Dna, Beaker, Zap, Quote, FileText, ChevronRight, X, Award, FileBadge } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import api from '../utils/api';
import { useTranslation } from "react-i18next";
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';

interface TeamMember {
  id: string;
  name: string;
  role: string;
  tags: string[];
  desc: string;
  fullDesc?: string;
  img: string;
  en?: { name: string; role: string; tags: string[]; desc: string; fullDesc?: string; };
  de?: { name: string; role: string; tags: string[]; desc: string; fullDesc?: string; };
}

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

export default function BrandStoryPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'story' | 'founder' | 'tech'>('story');
  const [selectedPaper, setSelectedPaper] = useState<AcademicPaper | null>(null);
  const [selectedCert, setSelectedCert] = useState<Certificate | null>(null);
  const currentLang = (i18n.resolvedLanguage || i18n.language || 'zh').split('-')[0];

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const { data: settingsData, isLoading } = useQuery({
    queryKey: ['publicSettings', currentLang],
    queryFn: async () => {
      const res = await api.get('/settings');
      return res;
    }
  }) as any;

  if (isLoading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500">{t('auto_staticpage_313', t('auto_staticpage_313', '加载中...'))}</div>;

  const heroBg = settingsData?.brand_hero_bg || '/images/tech/hero_bg.png';
  const techBg = settingsData?.brand_tech_bg || '/images/tech/ctdp_bg.png';
  
  let teamMembers: TeamMember[] = [];
  try {
    if (settingsData?.brand_team_members) teamMembers = JSON.parse(settingsData.brand_team_members);
  } catch (e) { teamMembers = []; }

  let papers: AcademicPaper[] = [];
  try {
    if (settingsData?.brand_papers) papers = JSON.parse(settingsData.brand_papers);
  } catch (e) { papers = []; }

  let patents: Certificate[] = [];
  try {
    if (settingsData?.brand_patents) patents = JSON.parse(settingsData.brand_patents);
  } catch (e) { patents = []; }

  let awards: Certificate[] = [];
  try {
    if (settingsData?.brand_awards) awards = JSON.parse(settingsData.brand_awards);
  } catch (e) { awards = []; }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-20">
      {/* Hero Section */}
      <section className="relative w-full py-16 md:py-20 flex items-center justify-center overflow-hidden bg-stone-900">
        <div className="absolute inset-0">
          <img 
            src={heroBg} 
            alt="Hero Background" 
            className="w-full h-full object-cover opacity-50"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/60"></div>
        </div>
        <div className="relative z-10 text-center px-6 max-w-4xl mx-auto animate-fade-in-up">
          <span className="inline-block px-4 py-1.5 mb-5 text-xs md:text-sm font-medium tracking-widest text-slate-100 bg-white/10 border border-white/20 rounded-full backdrop-blur-md uppercase">
            {settingsData?.site_name_en || 'TRASOCHY'}
          </span>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 leading-tight tracking-tight">
            {settingsData?.bs_hero_title || t('auto_brandstorypage_72', '中国好成分')} <span className="mx-2 text-white/50">•</span> {settingsData?.bs_hero_subtitle || t('auto_brandstorypage_73', '透皮好吸收')}
          </h1>
          <p className="text-base md:text-lg text-slate-200 font-light max-w-2xl mx-auto leading-relaxed">
            {settingsData?.bs_hero_desc || t('auto_brandstorypage_74', '专注于生物透皮递送技术创新')}
          </p>
        </div>
      </section>

      {/* Tabs */}
      <div className="max-w-6xl mx-auto px-6 mt-8 flex justify-center border-b border-slate-200">
        <button 
          onClick={() => setActiveTab('story')}
          className={`px-8 py-4 text-lg font-bold transition-all border-b-4 ${activeTab === 'story' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          {t('auto_brandstory_tab_story', '品牌故事')}
        </button>
        <button 
          onClick={() => setActiveTab('founder')}
          className={`px-8 py-4 text-lg font-bold transition-all border-b-4 ${activeTab === 'founder' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          {t('auto_brandstory_tab_founder', '品牌创始人')}
        </button>
        <button 
          onClick={() => setActiveTab('tech')}
          className={`px-8 py-4 text-lg font-bold transition-all border-b-4 ${activeTab === 'tech' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          {t('auto_brandstory_tab_tech', '核心技术')}
        </button>
      </div>

      <div className="py-12">
        {/* TAB 1: Brand Story */}
        {activeTab === 'story' && (
          <div className="animate-fade-in-up">
            {/* Brand Story Image-Text Editorial Layout */}
            <section className="w-full bg-white pb-12 md:pb-24 pt-2 md:pt-6">
              <div className="max-w-6xl mx-auto px-6">

                {settingsData?.page_about ? (
                  <div 
                    className="prose prose-lg prose-slate max-w-none text-slate-600 font-light leading-loose
                    prose-headings:text-slate-900 prose-headings:font-normal prose-headings:tracking-tight
                    prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl 
                    prose-p:text-base md:text-lg prose-p:leading-relaxed prose-p:mb-8
                    prose-a:text-slate-900 prose-a:font-medium prose-a:underline prose-a:underline-offset-4 hover:prose-a:text-blue-600
                    prose-img:rounded-none prose-img:shadow-xl prose-img:my-16 prose-img:w-full prose-img:object-cover
                    prose-strong:text-slate-900 prose-strong:font-medium
                    marker:text-slate-300 prose-ul:space-y-4
                    prose-blockquote:border-l-0 prose-blockquote:border-t prose-blockquote:border-slate-900 prose-blockquote:bg-transparent prose-blockquote:pt-8 prose-blockquote:px-0 prose-blockquote:text-xl prose-blockquote:text-slate-800 prose-blockquote:font-light prose-blockquote:italic prose-blockquote:my-16"
                    dangerouslySetInnerHTML={{ __html: settingsData.page_about }}
                  />
                ) : (
                  <div className="text-slate-400 font-light italic text-center">品牌故事内容正在更新中...</div>
                )}
              </div>
            </section>
          </div>
        )}

        {/* TAB: Brand Founder */}
        {activeTab === 'founder' && (
          <div className="animate-fade-in-up">
            <section className="py-12 px-6 max-w-7xl mx-auto">
              {(() => {
                const founders = teamMembers.filter(m => m.role && m.role.includes('创始人'));
                if (founders.length === 0 && teamMembers.length > 0) founders.push(teamMembers[0]);
                if (founders.length === 0) return <div className="text-center text-slate-400 py-20">创始人信息正在更新中...</div>;
                
                return (
                  <div className={`grid gap-8 ${founders.length > 1 ? 'lg:grid-cols-2' : 'grid-cols-1'}`}>
                    {founders.map((founder, index) => {
                      const langData = currentLang === 'en' ? founder.en : currentLang === 'de' ? founder.de : null;
                      const name = langData?.name || founder.name;
                      const role = langData?.role || founder.role;
                      const tags = langData?.tags && langData.tags.length > 0 ? langData.tags : founder.tags;
                      const fullDesc = langData?.fullDesc || founder.fullDesc || langData?.desc || founder.desc;
                      
                      // 只在第一位创始人（通常是阮博士）下方展示资质证书，或者如果只有一个创始人
                      const showCerts = index === 0 && patents.length > 0;

                      return (
                        <div key={founder.id} className={`bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 overflow-hidden flex ${founders.length === 1 ? 'flex-col md:flex-row' : 'flex-col'} relative`}>
                          {/* 照片区域 */}
                          <div className={`${founders.length === 1 ? 'md:w-2/5' : 'w-full'} relative bg-slate-50/50 p-8 flex flex-col items-center justify-center border-b ${founders.length === 1 ? 'md:border-b-0 md:border-r' : ''} border-slate-100`}>
                            <div className="w-full max-w-sm aspect-[3/4] relative rounded-2xl overflow-hidden shadow-lg border-4 border-white bg-white">
                              {founder.img ? (
                                <img src={founder.img} alt={name} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-400">暂无照片</div>
                              )}
                            </div>
                            
                            <div className={`mt-8 text-center ${founders.length === 1 ? 'md:hidden' : ''} w-full`}>
                              <h1 className="text-3xl font-bold text-slate-900 mb-2">{name}</h1>
                              <div className="w-12 h-1 bg-blue-600 rounded-full mx-auto mb-3"></div>
                              <p className="text-lg text-blue-600 font-medium">{role}</p>
                            </div>

                            {/* 证书展示 */}
                            {showCerts && (
                              <div className="mt-10 w-full">
                                <h4 className="text-sm font-bold text-slate-700 tracking-widest uppercase text-center mb-5">
                                  <Award className="inline w-4 h-4 mr-1.5 -mt-0.5" />
                                  {t('auto_founder_certs', '资质证书')}
                                </h4>
                                <div className="grid grid-cols-2 gap-3">
                                  {patents.map((cert) => {
                                    const certTitle = currentLang === 'en' ? cert.en?.title : currentLang === 'de' ? cert.de?.title : null;
                                    return (
                                      <div
                                        key={cert.id}
                                        onClick={() => setSelectedCert(cert)}
                                        className="group cursor-pointer rounded-xl overflow-hidden bg-white border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300"
                                      >
                                        <div className="aspect-[3/4] overflow-hidden bg-slate-50">
                                          <img src={cert.img} alt={certTitle || cert.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                        </div>
                                        <p className="text-[10px] text-slate-500 text-center py-2 px-1 truncate">{certTitle || cert.title}</p>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                          
                          {/* 详情区域 */}
                          <div className={`${founders.length === 1 ? 'md:w-3/5' : 'w-full'} p-8 md:p-12 flex flex-col justify-start`}>
                            <div className={`${founders.length === 1 ? 'hidden md:block' : 'hidden'} mb-8`}>
                              <h1 className="text-4xl font-bold text-slate-900 mb-2">{name}</h1>
                              <div className="w-16 h-1 bg-blue-600 rounded-full mb-4"></div>
                              <p className="text-xl text-blue-600 font-medium">{role}</p>
                            </div>
                            
                            {tags && tags.length > 0 && (
                              <div className="flex flex-wrap gap-2 mb-8">
                                {tags.map((tag, i) => (
                                  <span key={i} className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-medium tracking-wide">{tag}</span>
                                ))}
                              </div>
                            )}
                            
                            <div className="prose prose-slate max-w-none prose-h3:text-blue-600 prose-h3:font-bold prose-h3:mt-8 prose-h3:mb-4 prose-ul:list-disc prose-li:marker:text-blue-400 prose-p:leading-relaxed prose-hr:my-8 text-sm md:text-base">
                              <ReactMarkdown>{fullDesc || ''}</ReactMarkdown>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </section>
          </div>
        )}

        {/* TAB 2: Core Technology */}
        {activeTab === 'tech' && (
          <div className="animate-fade-in-up">
            {/* Brand Profile (Moved from Story Tab) */}
            <section className="px-6 max-w-6xl mx-auto mb-20 mt-8">
              <div className="text-center mb-16">
                <h2 className="text-3xl font-bold text-slate-900 mb-4">{settingsData?.bs_sec1_title || t('auto_brandstorypage_75', '品牌概览')}</h2>
                <div className="w-16 h-1 bg-blue-600 mx-auto rounded-full"></div>
              </div>
              <div className="bg-white rounded-3xl p-8 md:p-12 shadow-xl shadow-slate-200/50 flex flex-col md:flex-row items-center gap-12">
                <div className="md:w-1/2">
                  <h3 className="text-2xl font-bold text-slate-800 mb-6 leading-snug">
                    {settingsData?.bs_sec1_subtitle || t('auto_brandstorypage_76', '依托先进的生物透皮技术与绿色合成生物制造')}
                  </h3>
                  <p className="text-slate-600 leading-relaxed mb-6">
                    {settingsData?.bs_sec1_desc || t('auto_brandstorypage_77', '美尔健生物 是一家专注新型生物功效活性材料开发、制造与整体方案输出的国家高新科技企业。我们以生物科技为核心，专注于活性成分与透皮递送技术的研发与产业化，构建从分子设计、原料制造到应用解决方案的完整能力体系，为全球品牌提供可信赖的技术支持。')}
                  </p>
                  <ul className="space-y-4">
                    <li className="flex items-start gap-3 text-slate-700">
                      <ShieldCheck className="w-6 h-6 text-blue-600 shrink-0" />
                      <span>{settingsData?.bs_sec1_list1 || t('auto_brandstorypage_78', '专注“皮肤抗衰老分子”、“海洋蓝色分子”和“特色植物资源”研究')}</span>
                    </li>
                    <li className="flex items-start gap-3 text-slate-700">
                      <Dna className="w-6 h-6 text-blue-600 shrink-0" />
                      <span>{settingsData?.bs_sec1_list2 || t('auto_brandstorypage_79', '全球独创的第三代生物透皮技术')}</span>
                    </li>
                    <li className="flex items-start gap-3 text-slate-700">
                      <Beaker className="w-6 h-6 text-blue-600 shrink-0" />
                      <span>{settingsData?.bs_sec1_list3 || t('auto_brandstorypage_80', '人工智能分子设计，合成生物学基础，开发定制化解决方案')}</span>
                    </li>
                  </ul>
                </div>
                <div className="md:w-1/2 relative">
                  <div className="aspect-[4/3] rounded-2xl overflow-hidden shadow-lg border border-slate-100">
                    <img 
                      src="/images/tech/laboratory.png" 
                      alt="Laboratory" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="absolute -bottom-6 -left-6 bg-white p-6 rounded-2xl shadow-xl">
                    <p className="text-4xl font-bold text-blue-600 mb-1">{settingsData?.bs_sec1_badge_title || '4600㎡'}</p>
                    <p className="text-sm text-slate-500 font-medium">{settingsData?.bs_sec1_badge_desc || t('auto_brandstorypage_81', 'GMP细胞工厂与研发中心')}</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Tech Profile */}
            <section className="relative py-24 bg-slate-100 text-slate-900 overflow-hidden mb-20">
              <div className="absolute inset-0 opacity-5">
                <img src={techBg} alt="Tech BG" className="w-full h-full object-cover mix-blend-multiply" />
              </div>
              <div className="max-w-6xl mx-auto px-6 relative z-10">
                <div className="text-center mb-16">
                  <h2 className="text-3xl font-bold text-slate-900 mb-4">{settingsData?.bs_tech_title || t('auto_brandstorypage_82', '核心技术平台')}</h2>
                  <div className="w-16 h-1 bg-blue-600 mx-auto rounded-full mb-6"></div>
                  <p className="text-slate-600 max-w-2xl mx-auto">
                    {settingsData?.bs_tech_desc || t('auto_brandstorypage_83', '围绕活性成分设计、生物透皮递送与产业化制造，构建多平台协同的技术体系，将复杂科研能力转化为稳定、可复制、可验证的应用解决方案。')}
                  </p>
                </div>

                <div className="grid md:grid-cols-3 gap-8 mb-20">
                  {[
                    {
                      title: settingsData?.bs_tech1_title || t('auto_brandstorypage_90', 'AI 分子设计'),
                      desc: settingsData?.bs_tech1_desc || t('auto_brandstorypage_91', '覆盖分子/细胞层面的设计与机理研究，支撑核心透皮技术迭代。基于AI深度学习高效筛选与优化活性分子/功能原料。'),
                      icon: <Zap className="w-8 h-8 text-blue-500" />
                    },
                    {
                      title: settingsData?.bs_tech2_title || t('auto_brandstorypage_92', '生物透皮递送'),
                      desc: settingsData?.bs_tech2_desc || t('auto_brandstorypage_93', '自主创新的cTDP促渗透机理，解决大分子难穿过角质层致密“砖墙结构”的行业难题，让活性物深层起效。'),
                      icon: <Dna className="w-8 h-8 text-purple-500" />
                    },
                    {
                      title: settingsData?.bs_tech3_title || t('auto_brandstorypage_94', '合成生物制造'),
                      desc: settingsData?.bs_tech3_desc || t('auto_brandstorypage_95', '从菌株构建、发酵放大到纯化制备的规模化生产，形成从设计到落地的闭环能力，保障稳定量产。'),
                      icon: <Beaker className="w-8 h-8 text-emerald-500" />
                    }
                  ].map((tech, idx) => (
                    <div key={idx} className="bg-white shadow-xl shadow-slate-200/40 border border-slate-100 p-8 rounded-3xl hover:-translate-y-1 transition duration-300">
                      <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center mb-6">
                        {tech.icon}
                      </div>
                      <h3 className="text-xl font-bold text-slate-800 mb-4">{tech.title}</h3>
                      <p className="text-slate-600 text-sm leading-relaxed">{tech.desc}</p>
                    </div>
                  ))}
                </div>

                {/* cTDP Mechanism */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-3xl p-8 md:p-12 border border-blue-100 shadow-lg shadow-blue-900/5">
                  <h3 className="text-2xl font-bold text-slate-800 mb-8 text-center">{settingsData?.bs_ctdp_title || t('auto_brandstorypage_84', 'cTDP 促渗透机理与过程')}</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    {[
                      { step: "Step 1", title: settingsData?.bs_ctdp1_title || t('auto_brandstorypage_96', '特异结合'), desc: settingsData?.bs_ctdp1_desc || t('auto_brandstorypage_97', '环肽与皮肤表面细胞受体专一性结合') },
                      { step: "Step 2", title: settingsData?.bs_ctdp2_title || t('auto_brandstorypage_98', '打开通道'), desc: settingsData?.bs_ctdp2_desc || t('auto_brandstorypage_99', '皮肤细胞表面紧密连接结构改变，5分钟形成较大间隙') },
                      { step: "Step 3", title: settingsData?.bs_ctdp3_title || t('auto_brandstorypage_100', '深层递送'), desc: settingsData?.bs_ctdp3_desc || t('auto_brandstorypage_101', '大分子活性物通过打开的细胞间隙顺利渗透') },
                      { step: "Step 4", title: settingsData?.bs_ctdp4_title || t('auto_brandstorypage_102', '自然闭合'), desc: settingsData?.bs_ctdp4_desc || t('auto_brandstorypage_103', '15分钟后皮肤间隙自动恢复正常屏障结构') }
                    ].map((item, idx) => (
                      <div key={idx} className="relative group">
                        <div className="text-blue-600 font-mono text-sm mb-2 font-bold">{item.step}</div>
                        <div className="h-1 w-full bg-slate-200 rounded-full mb-4 overflow-hidden">
                          <div className="h-full bg-blue-500 w-1/3 group-hover:w-full transition-all duration-500"></div>
                        </div>
                        <h4 className="text-lg font-bold text-slate-800 mb-2">{item.title}</h4>
                        <p className="text-slate-600 text-xs leading-relaxed">{item.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* Awards Section */}
            {awards.length > 0 && (
              <section className="px-6 max-w-6xl mx-auto mb-20">
                <div className="text-center mb-16">
                  <span className="text-amber-500 font-semibold tracking-wider text-sm uppercase mb-2 block">
                    <Award className="inline w-4 h-4 mr-1 -mt-0.5" /> Industry Recognition
                  </span>
                  <h2 className="text-3xl font-bold text-slate-900 mb-4">{t('auto_brandstory_awards_title', '行业大奖')}</h2>
                  <div className="w-16 h-1 bg-amber-500 mx-auto rounded-full mb-6"></div>
                  <p className="text-slate-600 max-w-2xl mx-auto">
                    {t('auto_brandstory_awards_desc', '我们的技术与产品获得了行业专业机构的认可与荣誉')}
                  </p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                  {awards.map((award) => {
                    const awardTitle = currentLang === 'en' ? award.en?.title : currentLang === 'de' ? award.de?.title : null;
                    return (
                      <div
                        key={award.id}
                        onClick={() => setSelectedCert(award)}
                        className="group cursor-pointer bg-white rounded-2xl overflow-hidden shadow-lg shadow-slate-200/50 hover:-translate-y-1 transition-all duration-300 border border-slate-100"
                      >
                        <div className="aspect-[3/4] overflow-hidden bg-slate-50">
                          <img src={award.img} alt={awardTitle || award.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        </div>
                        <div className="p-3 text-center">
                          <p className="text-xs text-slate-700 font-medium line-clamp-2">{awardTitle || award.title}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

          </div>
        )}

      </div>

      {/* Certificate / Award Lightbox Modal */}
      {selectedCert && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setSelectedCert(null)}>
          <div className="relative max-w-lg w-full bg-white rounded-2xl overflow-hidden shadow-2xl animate-fade-in-up" onClick={e => e.stopPropagation()}>
            <button onClick={() => setSelectedCert(null)} className="absolute top-4 right-4 z-10 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center text-slate-600 hover:text-slate-900 shadow-md">
              <X size={18} />
            </button>
            <img src={selectedCert.img} alt={selectedCert.title} className="w-full object-contain max-h-[70vh]" />
            <div className="p-4 text-center">
              <p className="text-sm font-medium text-slate-800">
                {currentLang === 'en' ? selectedCert.en?.title || selectedCert.title : currentLang === 'de' ? selectedCert.de?.title || selectedCert.title : selectedCert.title}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
