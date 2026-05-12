import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { FileText, ChevronRight, X, Zap, Quote, Camera } from 'lucide-react';
import api from '../utils/api';
import { useTranslation } from "react-i18next";

interface AcademicPaper {
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

interface Certificate {
  id: string;
  title: string;
  img: string;
  en?: { title: string; };
  de?: { title: string; };
}

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

interface UserCase {
  id: string;
  title: string;
  tags: string[];
  desc: string;
  content?: string;
  img: string;
  en?: { title: string; tags: string[]; desc: string; content?: string; };
  de?: { title: string; tags: string[]; desc: string; content?: string; };
}

export default function ArticlesPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'articles' | 'clinical-reports' | 'swiss-center' | 'academic' | 'user-cases'>('swiss-center');
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [selectedCert, setSelectedCert] = useState<Certificate | null>(null);
  const [selectedCase, setSelectedCase] = useState<UserCase | null>(null);
  const limit = 12;
  const currentLang = i18n.language || 'zh';

  const { data: articlesData, isLoading: articlesLoading } = useQuery({
    queryKey: ['articles', page, keyword],
    queryFn: () => api.get('/articles?page=' + page + '&limit=' + limit + '&keyword=' + keyword),
    enabled: activeTab === 'articles',
  });

  const { data: reportsData, isLoading: reportsLoading } = useQuery({
    queryKey: ['clinical-reports', page, keyword],
    queryFn: () => api.get('/clinical-reports?page=' + page + '&limit=' + limit + '&keyword=' + keyword),
    enabled: activeTab === 'clinical-reports',
  });

  const { data: settingsData } = useQuery({
    queryKey: ['publicSettings'],
    queryFn: () => api.get('/settings'),
    enabled: activeTab === 'academic' || activeTab === 'swiss-center' || activeTab === 'user-cases',
  }) as any;

  let papers: AcademicPaper[] = [];
  let patents: Certificate[] = [];
  let awards: Certificate[] = [];
  try { if (settingsData?.brand_papers) papers = JSON.parse(settingsData.brand_papers); } catch (e) {}
  try { if (settingsData?.brand_patents) patents = JSON.parse(settingsData.brand_patents); } catch (e) {}
  try { if (settingsData?.brand_awards) awards = JSON.parse(settingsData.brand_awards); } catch (e) {}

  let teamMembers: TeamMember[] = [];
  try { if (settingsData?.brand_team_members) teamMembers = JSON.parse(settingsData.brand_team_members); } catch (e) {}

  let userCases: UserCase[] = [];
  try { if (settingsData?.brand_user_cases) userCases = JSON.parse(settingsData.brand_user_cases); } catch (e) {}

  const isLoading = activeTab === 'articles' ? articlesLoading : activeTab === 'clinical-reports' ? reportsLoading : false;
  const currentData = activeTab === 'articles' ? articlesData?.articles : reportsData?.reports;
  const currentTotal = activeTab === 'articles' ? articlesData?.total : reportsData?.total;

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <Helmet>
        <title>{t('auto_articlespage_64', '皮肤医学研究院 - TRASOCHY')}</title>
        <meta name="description" content={t('auto_articlespage_69', 'TRASOCHY皮肤医学研究院，探索前沿护肤科技与护肤知识。')} />
      </Helmet>

      <div className="text-center mb-10">
        <h1 className="text-4xl font-light text-stone-900 tracking-widest uppercase mb-4">{t('auto_shoplayout_345', '皮肤医学研究院')}</h1>
        <p className="text-sm text-stone-500 tracking-widest">{t('auto_articlespage_66', '探索前沿生物科技，解读肌肤语言')}</p>
      </div>

      <div className="flex justify-center mb-12">
        <div className="flex gap-8 border-b border-stone-200">
          <button
            onClick={() => { setActiveTab('swiss-center'); setPage(1); }}
            className={`pb-4 px-2 text-sm tracking-widest uppercase transition-colors relative flex items-center gap-1 ${activeTab === 'swiss-center' ? 'text-stone-900 font-medium' : 'text-stone-400 hover:text-stone-600'}`}
          >
            {t('tab_swiss_center', '瑞士创研中心')}
            {activeTab === 'swiss-center' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-stone-900" />}
          </button>
          <button
            onClick={() => navigate('/skin-analysis-pro-intro')}
            className="pb-4 px-2 text-sm tracking-widest uppercase transition-colors relative text-stone-400 hover:text-stone-900 flex items-center group"
          >
            {t('tab_swiss_skin_center', '瑞士皮肤衰老检测中心')}
            <span className="ml-1 text-rose-500 opacity-80 group-hover:opacity-100 transition-opacity"><Zap size={14} /></span>
          </button>
          <button
            onClick={() => { setActiveTab('clinical-reports'); setPage(1); }}
            className={`pb-4 px-2 text-sm tracking-widest uppercase transition-colors relative ${activeTab === 'clinical-reports' ? 'text-stone-900 font-medium' : 'text-stone-400 hover:text-stone-600'}`}
          >
            {t('tab_clinical_reports', '临床研究报告')}
            {activeTab === 'clinical-reports' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-stone-900" />}
          </button>
          <button
            onClick={() => { setActiveTab('academic'); setPage(1); }}
            className={`pb-4 px-2 text-sm tracking-widest uppercase transition-colors relative ${activeTab === 'academic' ? 'text-stone-900 font-medium' : 'text-stone-400 hover:text-stone-600'}`}
          >
            {t('tab_academic', '学术研究成果')}
            {activeTab === 'academic' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-stone-900" />}
          </button>
          <button
            onClick={() => { setActiveTab('user-cases'); setPage(1); }}
            className={`pb-4 px-2 text-sm tracking-widest uppercase transition-colors relative ${activeTab === 'user-cases' ? 'text-stone-900 font-medium' : 'text-stone-400 hover:text-stone-600'}`}
          >
            {t('tab_user_cases', '用户案例')}
            {activeTab === 'user-cases' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-stone-900" />}
          </button>
          <button
            onClick={() => { setActiveTab('articles'); setPage(1); }}
            className={`pb-4 px-2 text-sm tracking-widest uppercase transition-colors relative ${activeTab === 'articles' ? 'text-stone-900 font-medium' : 'text-stone-400 hover:text-stone-600'}`}
          >
            {t('tab_articles', '科学护肤知识')}
            {activeTab === 'articles' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-stone-900" />}
          </button>
        </div>
      </div>

      {/* 学术成果标签内容 */}
      {activeTab === 'academic' && (
        <div>
          {/* Academic Papers */}
          {papers.length > 0 && (
            <section className="mb-20">
              <div className="text-center mb-12">
                <span className="text-stone-400 font-medium tracking-widest text-xs uppercase mb-2 block">Academic Research</span>
                <h2 className="text-2xl font-light text-stone-900 tracking-widest uppercase mb-4">{t('auto_brandstory_papers_title', '全球顶尖学术论文')}</h2>
                <div className="w-12 h-px bg-stone-300 mx-auto"></div>
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                {papers.map(paper => {
                  const langData = currentLang === 'en' ? paper.en : currentLang === 'de' ? paper.de : null;
                  const title = langData?.title || paper.title;
                  const journal = langData?.journal || paper.journal;
                  const authors = langData?.authors || paper.authors;
                  return (
                    <div
                      key={paper.id}
                      onClick={() => navigate('/academic/' + paper.id)}
                      className="bg-white border border-stone-200 p-6 hover:border-stone-400 transition-all duration-300 cursor-pointer group"
                    >
                      <div className="flex gap-4 items-start">
                        <div className="w-10 h-10 border border-stone-200 text-stone-400 flex items-center justify-center shrink-0 group-hover:bg-stone-900 group-hover:text-white group-hover:border-stone-900 transition-colors">
                          <FileText size={18} />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-medium text-stone-800 line-clamp-2 leading-snug mb-2 group-hover:text-stone-600 transition-colors text-sm">{title}</h3>
                          <p className="text-stone-500 text-xs mb-1 tracking-wide">{journal}</p>
                          <p className="text-stone-400 text-xs line-clamp-1">{authors}</p>
                        </div>
                        <ChevronRight className="text-stone-300 group-hover:text-stone-600 transition-colors shrink-0" size={16} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Patents */}
          {patents.length > 0 && (
            <section className="mb-20">
              <div className="text-center mb-12">
                <span className="text-stone-400 font-medium tracking-widest text-xs uppercase mb-2 block">Patents</span>
                <h2 className="text-2xl font-light text-stone-900 tracking-widest uppercase mb-4">{t('auto_brandstory_patents_title', '专利证书')}</h2>
                <div className="w-12 h-px bg-stone-300 mx-auto"></div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {patents.map(cert => {
                  const langData = currentLang === 'en' ? cert.en : currentLang === 'de' ? cert.de : null;
                  const title = langData?.title || cert.title;
                  return (
                    <div key={cert.id} onClick={() => setSelectedCert(cert)} className="cursor-pointer group">
                      <div className="aspect-[3/4] bg-stone-50 overflow-hidden mb-3 border border-stone-100 group-hover:border-stone-300 transition-colors">
                        <img src={cert.img} alt={title} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                      </div>
                      <h3 className="text-stone-700 text-xs line-clamp-2 text-center tracking-wide group-hover:text-stone-900 transition-colors">{title}</h3>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Awards */}
          {awards.length > 0 && (
            <section className="mb-20">
              <div className="text-center mb-12">
                <span className="text-stone-400 font-medium tracking-widest text-xs uppercase mb-2 block">Awards</span>
                <h2 className="text-2xl font-light text-stone-900 tracking-widest uppercase mb-4">{t('auto_brandstory_awards_title', '获奖证书')}</h2>
                <div className="w-12 h-px bg-stone-300 mx-auto"></div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {awards.map(cert => {
                  const langData = currentLang === 'en' ? cert.en : currentLang === 'de' ? cert.de : null;
                  const title = langData?.title || cert.title;
                  return (
                    <div key={cert.id} onClick={() => setSelectedCert(cert)} className="cursor-pointer group">
                      <div className="aspect-[3/4] bg-stone-50 overflow-hidden mb-3 border border-stone-100 group-hover:border-stone-300 transition-colors">
                        <img src={cert.img} alt={title} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                      </div>
                      <h3 className="text-stone-700 text-xs line-clamp-2 text-center tracking-wide group-hover:text-stone-900 transition-colors">{title}</h3>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {papers.length === 0 && patents.length === 0 && awards.length === 0 && (
            <div className="text-center py-20 text-stone-400 tracking-widest">{t('auto_articlespage_68', '暂无相关内容')}</div>
          )}
        </div>
      )}

      {activeTab === 'user-cases' && (
        <div className="animate-fade-in-up">
          {userCases.length === 0 ? (
            <div className="text-center py-32">
              <p className="text-stone-400 tracking-widest uppercase">{t('auto_articlespage_68', '暂无相关内容')}</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {userCases.map((c) => {
                const langData = currentLang === 'en' ? c.en : currentLang === 'de' ? c.de : null;
                const title = langData?.title || c.title;
                const desc = langData?.desc || c.desc;
                const tags = langData?.tags && langData.tags.length > 0 ? langData.tags : c.tags;
                
                return (
                  <div 
                    key={c.id} 
                    onClick={() => setSelectedCase(c)}
                    className="bg-white border border-stone-200 group cursor-pointer hover:-translate-y-1 hover:shadow-lg transition-all duration-300 flex flex-col"
                  >
                    <div className="aspect-[4/3] overflow-hidden relative bg-stone-100">
                      {c.img ? (
                        <img src={c.img} alt={title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-stone-300">TRASOCHY CASE</div>
                      )}
                      <div className="absolute inset-0 bg-stone-900/0 group-hover:bg-stone-900/10 transition-colors duration-300"></div>
                    </div>
                    <div className="p-6 flex-1 flex flex-col">
                      <h3 className="text-lg font-medium text-stone-900 mb-2 line-clamp-2">{title}</h3>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {tags.map((tag, i) => (
                          <span key={i} className="text-[10px] uppercase tracking-wider bg-stone-50 text-stone-500 px-2 py-1 border border-stone-100">{tag}</span>
                        ))}
                      </div>
                      <p className="text-sm text-stone-500 line-clamp-3 leading-relaxed flex-1">{desc}</p>
                      <div className="mt-4 flex items-center text-xs font-bold uppercase tracking-widest text-stone-900 opacity-0 group-hover:opacity-100 transition-opacity">
                        {t('auto_view_detail', '查看详情')} <ChevronRight size={14} className="ml-1" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* User Case Modal */}
      {selectedCase && (
        <div className="fixed inset-0 bg-stone-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto" onClick={() => setSelectedCase(null)}>
          <div className="bg-white w-full max-w-4xl flex flex-col md:flex-row relative shadow-2xl my-auto animate-fade-in-up" onClick={e => e.stopPropagation()}>
            <button onClick={() => setSelectedCase(null)} className="absolute top-4 right-4 z-10 w-8 h-8 bg-white/50 backdrop-blur flex items-center justify-center text-stone-900 rounded-full hover:bg-white transition-colors shadow-sm">
              <X size={16} />
            </button>
            <div className="md:w-1/2 bg-stone-100 relative min-h-[300px]">
              {selectedCase.img && (
                <img src={selectedCase.img} alt="" className="absolute inset-0 w-full h-full object-cover" />
              )}
            </div>
            <div className="md:w-1/2 p-8 md:p-12 flex flex-col bg-white">
              {(() => {
                const langData = currentLang === 'en' ? selectedCase.en : currentLang === 'de' ? selectedCase.de : null;
                const title = langData?.title || selectedCase.title;
                const desc = langData?.desc || selectedCase.desc;
                const content = langData?.content || selectedCase.content;
                const tags = langData?.tags && langData.tags.length > 0 ? langData.tags : selectedCase.tags;
                
                return (
                  <>
                    <h2 className="text-2xl font-light text-stone-900 mb-4">{title}</h2>
                    <div className="flex flex-wrap gap-2 mb-6">
                      {tags.map((tag, i) => (
                        <span key={i} className="text-xs tracking-wider bg-stone-50 text-stone-500 px-3 py-1 border border-stone-100 uppercase">{tag}</span>
                      ))}
                    </div>
                    <div className="prose prose-stone prose-sm max-w-none text-stone-600 leading-relaxed whitespace-pre-wrap flex-1">
                      {content || desc}
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {(activeTab === 'articles' || activeTab === 'clinical-reports') && (
        <>
          {/* 搜索框 */}
          <div className="flex justify-center mb-12">
            <input
              type="text"
              placeholder={t('auto_articlespage_70', '搜索护肤文章...')}
              value={keyword}
              onChange={(e) => { setKeyword(e.target.value); setPage(1); }}
              className="w-full max-w-md px-6 py-3 border-b border-stone-300 bg-transparent text-center focus:outline-none focus:border-stone-900 transition-colors uppercase tracking-widest text-sm placeholder-stone-400"
            />
          </div>

          {isLoading ? (
            <div className="text-center py-20 text-stone-400">{t('auto_staticpage_313', '加载中...')}</div>
          ) : currentData?.length === 0 ? (
            <div className="text-center py-20 text-stone-400 tracking-widest">{t('auto_articlespage_68', '暂无相关内容')}</div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                {currentData?.map((item: any) => (
                  <Link key={item.id} to={activeTab === 'articles' ? ('/articles/' + item.slug) : ('/clinical-reports/' + item.slug)} className="group block">
                    <div className="aspect-[4/3] bg-stone-100 overflow-hidden mb-4 rounded-sm relative">
                      {item.cover_image ? (
                        <img
                          src={item.cover_image}
                          alt={item.title}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-stone-300 font-serif italic text-2xl tracking-widest bg-stone-50">
                          TRASOCHY
                        </div>
                      )}
                      {activeTab === 'clinical-reports' && (
                        <div className="absolute top-4 left-4 bg-white/90 backdrop-blur text-stone-900 text-[10px] font-bold px-3 py-1 tracking-widest uppercase">
                          Clinical Report
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-stone-900 group-hover:text-stone-600 transition-colors mb-2 line-clamp-2">
                        {item.title}
                      </h3>
                      <div className="flex items-center justify-between text-xs text-stone-400 tracking-widest">
                        <span>{new Date(item.published_at || item.created_at).toLocaleDateString()}</span>
                        {activeTab === 'articles' && item.keywords && (
                          <span className="uppercase">{JSON.parse(item.keywords || '[]').join(' • ')}</span>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              {/* 分页 */}
              {currentTotal > limit && (
                <div className="flex justify-center gap-2 mt-16">
                  {Array.from({ length: Math.ceil(currentTotal / limit) }).map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setPage(i + 1)}
                      className={'w-8 h-8 flex items-center justify-center text-xs tracking-widest transition-colors ' + (page === i + 1 ? 'bg-stone-900 text-white' : 'text-stone-500 hover:bg-stone-100')}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Cert Detail Modal */}
      {selectedCert && (
        <div className="fixed inset-0 bg-stone-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setSelectedCert(null)}>
          <div className="relative w-full max-w-3xl max-h-[90vh] flex flex-col items-center justify-center" onClick={e => e.stopPropagation()}>
            <button onClick={() => setSelectedCert(null)} className="absolute -top-12 right-0 w-10 h-10 bg-white/10 border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-colors shrink-0">
              <X size={18} />
            </button>
            <img src={selectedCert.img} alt={selectedCert.title} className="max-w-full max-h-[80vh] object-contain shadow-2xl" />
            <h3 className="mt-4 text-white text-sm font-medium text-center tracking-widest">
              {currentLang === 'en' ? (selectedCert.en?.title || selectedCert.title) : currentLang === 'de' ? (selectedCert.de?.title || selectedCert.title) : selectedCert.title}
            </h3>
          </div>
        </div>
      )}
      {/* Swiss Innovation Center Tab */}
      {activeTab === 'swiss-center' && (
        <div className="animate-fade-in-up">
          <section className="py-12 px-6 max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <span className="text-stone-400 font-medium tracking-[0.2em] text-xs uppercase mb-2 block">{settingsData?.bs_team_subtitle || 'Global R&D Team'}</span>
              <h2 className="text-3xl font-light text-stone-900 tracking-widest uppercase mb-4">{settingsData?.bs_team_title || t('auto_brandstorypage_85', '瑞士创新中心 (MSIC)')}</h2>
              <div className="w-16 h-px bg-stone-300 mx-auto mb-6"></div>
              <p className="text-stone-500 max-w-2xl mx-auto text-sm tracking-wide">
                {settingsData?.bs_team_desc || t('auto_brandstorypage_86', '以中瑞技术连接为纽带，融合瑞士抗衰理念与先进透皮技术，推动关键成果的应用转化与产品升级。')}
              </p>
            </div>

            <div className="grid md:grid-cols-4 gap-8">
              {teamMembers.filter(m => m.isInnovationCenter).map((member) => {
                const langData = currentLang === 'en' ? member.en : currentLang === 'de' ? member.de : null;
                const name = langData?.name || member.name;
                const role = langData?.role || member.role;
                const tags = langData?.tags && langData.tags.length > 0 ? langData.tags : member.tags;
                const desc = langData?.desc || member.desc;

                return (
                  <div 
                    key={member.id} 
                    onClick={() => navigate(`/team/${member.id}`)}
                    className="bg-white rounded-xl overflow-hidden shadow-sm border border-stone-100 group hover:-translate-y-1 transition-all duration-300 cursor-pointer"
                  >
                    <div className="aspect-square overflow-hidden relative">
                      <div className="absolute inset-0 bg-stone-900/10 group-hover:bg-transparent transition duration-300 z-10"></div>
                      <img src={member.img} alt={name} className="w-full h-full object-cover object-top grayscale-0 group-hover:grayscale transition duration-500 scale-105 group-hover:scale-100" />
                    </div>
                    <div className="p-6 flex flex-col h-full">
                      <h3 className="text-lg font-medium text-stone-900 mb-1">{name}</h3>
                      <p className="text-stone-500 text-sm mb-3">{role}</p>
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {(tags || []).map((tag, i) => (
                          <span key={i} className="text-[10px] px-2 py-0.5 bg-stone-100 text-stone-500 rounded font-medium">
                            {tag}
                          </span>
                        ))}
                      </div>
                      <p className="text-stone-400 text-xs leading-relaxed line-clamp-3">{desc}</p>
                      <div className="mt-3 text-stone-900 text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity flex items-center tracking-widest uppercase">
                        {t('auto_view_detail', '查看详情')} <ChevronRight className="w-3 h-3 ml-1" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* VISIA Promo */}
            <div className="mt-16 bg-gradient-to-br from-rose-50 to-white border border-rose-100 rounded-2xl p-8 md:p-10 text-center relative overflow-hidden shadow-sm hover:shadow-md transition-shadow">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-rose-300 via-rose-400 to-rose-500"></div>
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 bg-white shadow-sm border border-rose-100 rounded-full flex items-center justify-center mb-5 overflow-hidden">
                  <svg viewBox="0 0 512 512" className="w-full h-full">
                    <rect width="512" height="512" fill="#D52B1E"/>
                    <rect x="213" y="106" width="86" height="300" fill="#FFFFFF"/>
                    <rect x="106" y="213" width="300" height="86" fill="#FFFFFF"/>
                  </svg>
                </div>
                <h3 className="text-xl md:text-2xl font-medium text-stone-800 mb-3 tracking-wide">
                  瑞士皮肤抗衰研究
                </h3>
                <p className="text-stone-600 max-w-2xl mx-auto text-sm md:text-base leading-relaxed mb-8">
                  结合瑞士前沿科研与AI大模型技术，对肌肤衰老维度进行深度解析。精准量化皮肤状态，为您提供科学的定制化抗衰老追踪与解决方案。
                </p>
                <Link to="/skin-analysis-pro-intro" className="inline-flex items-center gap-2 px-8 py-3.5 bg-rose-500 text-white rounded-full text-sm font-medium tracking-widest uppercase hover:bg-rose-600 transition-all shadow-lg hover:shadow-rose-500/30 transform hover:-translate-y-0.5">
                  <svg viewBox="0 0 512 512" className="w-4 h-4 rounded-sm overflow-hidden">
                    <rect width="512" height="512" fill="#D52B1E"/>
                    <rect x="213" y="106" width="86" height="300" fill="#FFFFFF"/>
                    <rect x="106" y="213" width="300" height="86" fill="#FFFFFF"/>
                  </svg> 
                  开始皮肤深度抗衰研究
                </Link>
              </div>
            </div>

            {/* Quote */}
            <div className="mt-16 bg-stone-50 border border-stone-200 rounded-xl p-8 md:p-12 text-center relative overflow-hidden">
              <Quote className="w-20 h-20 text-stone-100 absolute top-4 left-4 -rotate-12" />
              <h3 className="text-xl md:text-2xl font-medium text-stone-800 mb-4 relative z-10 tracking-wide">
                {settingsData?.bs_quote_title || t('auto_brandstorypage_87', '中瑞联合研发与技术共创')}
              </h3>
              <p className="text-stone-500 max-w-3xl mx-auto relative z-10 text-sm leading-relaxed">
                {settingsData?.bs_quote_desc ? (
                  settingsData.bs_quote_desc.split('\n').map((line: string, i: number) => (
                    <React.Fragment key={i}>{line}<br className="hidden md:block"/></React.Fragment>
                  ))
                ) : (
                  <>
                    {t('auto_brandstorypage_88', '瑞士端负责欧洲创新原料开发、方法开发、机理验证及人体功效设计与数据规范；')}<br className="hidden md:block"/>
                    {t('auto_brandstorypage_89', '中国端负责产业化转化与高效交付，形成贯通上游创新与下游制造的完美闭环体系。')}
                  </>
                )}
              </p>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
