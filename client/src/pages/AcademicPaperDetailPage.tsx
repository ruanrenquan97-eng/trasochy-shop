import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft, FileText, Zap, ChevronRight } from 'lucide-react';
import { useTranslation } from "react-i18next";
import api from '../utils/api';

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

export default function AcademicPaperDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language || 'zh';

  const { data: settingsData, isLoading } = useQuery({
    queryKey: ['publicSettings'],
    queryFn: () => api.get('/settings'),
  }) as any;

  const [paper, setPaper] = useState<AcademicPaper | null>(null);

  useEffect(() => {
    if (settingsData?.brand_papers) {
      try {
        const papers: AcademicPaper[] = JSON.parse(settingsData.brand_papers);
        const found = papers.find(p => p.id === id);
        if (found) {
          setPaper(found);
        } else {
          // 如果找不到，跳回首页
          navigate(-1);
        }
      } catch (e) {
        console.error(e);
      }
    }
  }, [settingsData, id, navigate]);

  if (isLoading || !paper) {
    return <div className="min-h-[60vh] flex items-center justify-center text-stone-400">{t('auto_staticpage_313', '加载中...')}</div>;
  }

  const langData = currentLang === 'en' ? paper.en : currentLang === 'de' ? paper.de : null;
  const title = langData?.title || paper.title;
  const journal = langData?.journal || paper.journal;
  const authors = langData?.authors || paper.authors;
  const abstract = langData?.abstract || paper.abstract;
  const contribution = langData?.contribution || paper.contribution;

  return (
    <div className="bg-stone-50 min-h-screen py-12">
      <Helmet>
        <title>{title} - TRASOCHY</title>
      </Helmet>
      
      <div className="max-w-4xl mx-auto px-6">
        <button onClick={() => navigate(-1)} className="inline-flex items-center gap-2 text-stone-500 hover:text-stone-900 transition-colors mb-8 text-sm uppercase tracking-widest">
          <ArrowLeft size={16} /> {t('auto_staticpage_314', '返回')}
        </button>

        <div className="bg-white border border-stone-200 overflow-hidden shadow-sm">
          {/* Header */}
          <div className="p-8 md:p-12 border-b border-stone-100 bg-white">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-stone-100 text-stone-600 text-xs font-bold uppercase tracking-wider mb-6">
              <FileText size={14} /> Academic Paper
            </div>
            <h1 className="text-2xl md:text-3xl font-light text-stone-900 mb-4 leading-snug">{title}</h1>
            <p className="text-stone-600 font-medium mb-2 text-sm">{journal}</p>
            <p className="text-stone-400 text-sm tracking-wide">{authors}</p>
          </div>

          {/* Body */}
          <div className="p-8 md:p-12 space-y-12">
            <div>
              <h3 className="text-sm font-medium text-stone-800 mb-4 tracking-wide uppercase">{t('auto_brandstory_paper_abstract', '论文摘要')}</h3>
              <div className="text-stone-600 leading-relaxed text-sm whitespace-pre-wrap">{abstract}</div>
            </div>

            {contribution && (
              <div className="border-l-2 border-stone-200 pl-6">
                <h3 className="text-xs font-medium text-stone-500 mb-3 tracking-widest uppercase flex items-center gap-2">
                  <Zap size={14} /> {t('auto_brandstory_paper_contribution', '对品牌的贡献')}
                </h3>
                <div className="text-stone-900 font-bold leading-relaxed text-sm whitespace-pre-wrap">{contribution}</div>
              </div>
            )}

            {paper.link && (
              <div className="pt-8 mt-8 border-t border-stone-100">
                <h3 className="text-xs font-medium text-stone-500 mb-6 tracking-widest uppercase flex items-center gap-2">
                  <FileText size={14} /> {t('auto_brandstory_paper_homepage', '原文献首页')}
                </h3>
                <div className="border border-stone-200 rounded-sm overflow-hidden bg-stone-50 flex justify-center">
                  <img src={paper.link} alt="Paper Homepage" className="max-w-full h-auto object-contain" />
                </div>
              </div>
            )}

            {/* 学术与合规声明 */}
            <div className="pt-8 mt-8 border-t border-stone-100 text-center">
              <p className="text-[11px] text-stone-400 leading-relaxed max-w-xl mx-auto">
                【学术文献展示声明】本页面展示的学术论文与科研文献仅用于展示品牌科研探索历程与技术机理交流，文中所述实验数据及结论仅供学术参考，不作为针对具体个体的产品功效承诺。化妆品非药品，不具备疾病预防或治疗功能。
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
