import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../utils/api';
import { ArrowLeft } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
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

export interface MemberCertificate {
  id: string;
  title: string;
  img: string;
  memberId: string;
  en?: { title: string };
  de?: { title: string };
}

export default function MemberDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [member, setMember] = useState<TeamMember | null>(null);
  const [certificates, setCertificates] = useState<MemberCertificate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.scrollTo(0, 0);
    api.get('/settings').then((res: any) => {
      try {
        const settingsMap = res || {};
        
        if (settingsMap['brand_team_members']) {
          const team = JSON.parse(settingsMap['brand_team_members']) as TeamMember[];
          const found = team.find(m => m.id === id);
          if (found) {
            setMember(found);
          }
        }
        
        if (settingsMap['brand_member_certificates']) {
          const allCerts = JSON.parse(settingsMap['brand_member_certificates']) as MemberCertificate[];
          setCertificates(allCerts.filter(c => c.memberId === id));
        }
      } catch (err) {
        console.error('Failed to parse team', err);
      } finally {
        setLoading(false);
      }
    });
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen pt-24 pb-20 flex items-center justify-center bg-slate-50">
        <div className="text-slate-400">Loading...</div>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="min-h-screen pt-24 pb-20 flex flex-col items-center justify-center bg-slate-50">
        <div className="text-slate-500 mb-4">{t('auto_memberdetail_not_found', '未找到该人员信息')}</div>
        <button onClick={() => navigate('/brand-story')} className="text-blue-600 hover:underline">
          {t('auto_memberdetail_back', '返回品牌故事')}
        </button>
      </div>
    );
  }

  const currentLang = i18n.language || 'zh';
  const langData = currentLang === 'en' ? member.en : currentLang === 'de' ? member.de : null;
  const name = langData?.name || member.name;
  const role = langData?.role || member.role;
  const tags = langData?.tags && langData.tags.length > 0 ? langData.tags : member.tags;
  const fullDesc = langData?.fullDesc || member.fullDesc || langData?.desc || member.desc;

  return (
    <div className="min-h-screen pt-24 pb-20 bg-slate-50">
      <Helmet>
        <title>{name} - TRASOCHY</title>
      </Helmet>

      <div className="max-w-5xl mx-auto px-6">
        <button 
          onClick={() => navigate(-1)} 
          className="flex items-center gap-2 text-slate-500 hover:text-blue-600 transition mb-8 group"
        >
          <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          <span className="font-medium">{t('auto_memberdetail_back_btn', '返回')}</span>
        </button>

        <div className="bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 overflow-hidden flex flex-col md:flex-row md:items-start relative">
          {/* 左侧照片区域 - 带边距的画框样式 */}
          <div className="md:w-2/5 w-full relative bg-slate-50/50 p-8 md:p-12 lg:p-16 flex flex-col items-center justify-start border-b md:border-b-0 md:border-r border-slate-100">
            <div className="w-full max-w-sm relative rounded-2xl overflow-hidden shadow-lg border-4 border-white bg-white">
              <img 
                src={member.img} 
                alt={name} 
                className="w-full aspect-[3/4] object-cover object-top"
              />
            </div>
            
            {/* 移动端专属的标题区域（桌面端隐藏） */}
            <div className="mt-8 text-center md:hidden w-full">
              <h1 className="text-3xl font-bold text-slate-900 mb-2">{name}</h1>
              <div className="w-12 h-1 bg-blue-600 rounded-full mx-auto mb-3"></div>
              <p className="text-lg text-blue-600 font-medium">{role}</p>
            </div>

            {/* 证书展示移动到照片下方 */}
            {certificates.length > 0 && (
              <div className="mt-12 w-full pt-8 border-t border-slate-200/60">
                <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-3 justify-center md:justify-start">
                  <span className="w-1.5 h-5 bg-blue-600 rounded-full block"></span>
                  {t('auto_memberdetail_certs', '荣誉资质证书')}
                </h3>
                <div className="flex flex-col gap-6">
                  {certificates.map(cert => {
                    const certLangData = currentLang === 'en' ? cert.en : currentLang === 'de' ? cert.de : null;
                    const certTitle = certLangData?.title || cert.title;
                    return (
                      <div key={cert.id} className="group cursor-pointer">
                        <div className="aspect-[4/3] bg-white rounded-lg overflow-hidden mb-2 border border-slate-200 group-hover:border-blue-300 transition-colors relative shadow-sm hover:shadow-md">
                          <img src={cert.img} alt={certTitle} className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-300" />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors"></div>
                        </div>
                        <p className="text-xs text-center font-medium text-slate-700 group-hover:text-blue-600 transition-colors px-1 line-clamp-2" title={certTitle}>{certTitle}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* 右侧详细信息 */}
          <div className="md:w-3/5 p-8 md:p-12 lg:p-16 flex flex-col justify-center">
            <div className="hidden md:block mb-8">
              <h1 className="text-4xl font-bold text-slate-900 mb-2">{name}</h1>
              <div className="w-16 h-1 bg-blue-600 rounded-full mb-4"></div>
              <p className="text-xl text-blue-600 font-medium">{role}</p>
            </div>

            {tags && tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-8">
                {tags.map((tag, i) => (
                  <span 
                    key={i} 
                    className="px-4 py-1.5 bg-slate-100 text-slate-600 rounded-full text-sm font-medium tracking-wide"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            <div className="prose prose-slate max-w-none prose-h3:text-blue-600 prose-h3:font-bold prose-h3:mt-8 prose-h3:mb-4 prose-ul:list-disc prose-li:marker:text-blue-400 prose-p:leading-relaxed prose-hr:my-8">
              <ReactMarkdown>{fullDesc || ''}</ReactMarkdown>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
