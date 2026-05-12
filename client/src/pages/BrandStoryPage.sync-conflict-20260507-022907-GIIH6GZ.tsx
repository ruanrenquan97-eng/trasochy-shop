import React, { useEffect } from 'react';
import { ShieldCheck, Dna, Beaker, Zap, Quote } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import api from '../utils/api';

interface TeamMember {
  id: string;
  name: string;
  role: string;
  tags: string[];
  desc: string;
  img: string;
}

export default function BrandStoryPage() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const { data: settingsData, isLoading } = useQuery({
    queryKey: ['publicSettings'],
    queryFn: async () => {
      const res = await api.get('/settings');
      return res;
    }
  }) as any;

  if (isLoading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500">加载中...</div>;

  const heroBg = settingsData?.brand_hero_bg || '/images/tech/hero_bg.png';
  const techBg = settingsData?.brand_tech_bg || '/images/tech/ctdp_bg.png';
  
  let teamMembers: TeamMember[] = [];
  try {
    if (settingsData?.brand_team_members) {
      teamMembers = JSON.parse(settingsData.brand_team_members);
    }
  } catch (e) {
    teamMembers = [];
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-20">
      {/* Hero Section */}
      <section className="relative w-full h-[60vh] md:h-[70vh] flex items-center justify-center overflow-hidden bg-slate-900">
        <div className="absolute inset-0">
          <img 
            src={heroBg} 
            alt="Hero Background" 
            className="w-full h-full object-cover opacity-60 mix-blend-overlay"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-slate-900/60 via-slate-900/40 to-slate-900/80"></div>
        </div>
        <div className="relative z-10 text-center px-6 max-w-4xl mx-auto mt-16 animate-fade-in-up">
          <span className="inline-block px-4 py-1.5 mb-6 text-sm font-medium tracking-widest text-blue-300 bg-blue-900/30 border border-blue-500/30 rounded-full backdrop-blur-md">
            MELLGEN BIOTECH
          </span>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight tracking-tight">
            中国好成分 <span className="mx-2 text-blue-400">•</span> 透皮好吸收
          </h1>
          <p className="text-lg md:text-xl text-slate-300 font-light max-w-2xl mx-auto leading-relaxed">
            全球生物透皮递送技术领导者
          </p>
        </div>
      </section>

      {/* Brand Profile */}
      <section className="py-20 px-6 max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-slate-900 mb-4">品牌概览</h2>
          <div className="w-16 h-1 bg-blue-600 mx-auto rounded-full"></div>
        </div>
        <div className="bg-white rounded-3xl p-8 md:p-12 shadow-xl shadow-slate-200/50 flex flex-col md:flex-row items-center gap-12">
          <div className="md:w-1/2">
            <h3 className="text-2xl font-bold text-slate-800 mb-6 leading-snug">
              依托领先的生物透皮技术与绿色合成生物制造
            </h3>
            <p className="text-slate-600 leading-relaxed mb-6">
              美尔健生物 是一家专注新型生物功效活性材料开发、制造与整体方案输出的国家高新科技企业。我们以生物科技为核心，专注于活性成分与透皮递送技术的研发与产业化，构建从分子设计、原料制造到应用解决方案的完整能力体系，为全球品牌提供可信赖的技术支持。
            </p>
            <ul className="space-y-4">
              <li className="flex items-start gap-3 text-slate-700">
                <ShieldCheck className="w-6 h-6 text-blue-600 shrink-0" />
                <span>专注“皮肤抗衰老分子”、“海洋蓝色分子”和“特色植物资源”研究</span>
              </li>
              <li className="flex items-start gap-3 text-slate-700">
                <Dna className="w-6 h-6 text-blue-600 shrink-0" />
                <span>全球独创的第三代生物透皮技术</span>
              </li>
              <li className="flex items-start gap-3 text-slate-700">
                <Beaker className="w-6 h-6 text-blue-600 shrink-0" />
                <span>人工智能分子设计，合成生物学基础，开发定制化解决方案</span>
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
              <p className="text-4xl font-bold text-blue-600 mb-1">4600㎡</p>
              <p className="text-sm text-slate-500 font-medium">GMP细胞工厂与研发中心</p>
            </div>
          </div>
        </div>
      </section>

      {/* Technology Platform */}
      <section className="py-20 bg-slate-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <img src={techBg} alt="Tech BG" className="w-full h-full object-cover mix-blend-luminosity" />
        </div>
        <div className="max-w-6xl mx-auto px-6 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-white mb-4">核心技术平台</h2>
            <div className="w-16 h-1 bg-blue-500 mx-auto rounded-full mb-6"></div>
            <p className="text-slate-400 max-w-2xl mx-auto">
              围绕活性成分设计、生物透皮递送与产业化制造，构建多平台协同的技术体系，将复杂科研能力转化为稳定、可复制、可验证的应用解决方案。
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-20">
            {[
              {
                title: "AI 分子设计",
                desc: "覆盖分子/细胞层面的设计与机理研究，支撑核心透皮技术迭代。基于AI深度学习高效筛选与优化活性分子/功能原料。",
                icon: <Zap className="w-8 h-8 text-blue-400" />
              },
              {
                title: "生物透皮递送",
                desc: "全球领先的cTDP促渗透机理，解决大分子难穿过角质层致密“砖墙结构”的行业难题，让活性物深层起效。",
                icon: <Dna className="w-8 h-8 text-purple-400" />
              },
              {
                title: "合成生物制造",
                desc: "从菌株构建、发酵放大到纯化制备的规模化生产，形成从设计到落地的闭环能力，保障稳定量产。",
                icon: <Beaker className="w-8 h-8 text-emerald-400" />
              }
            ].map((tech, idx) => (
              <div key={idx} className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 p-8 rounded-3xl hover:bg-slate-800 transition duration-300">
                <div className="w-14 h-14 bg-slate-700/50 rounded-2xl flex items-center justify-center mb-6">
                  {tech.icon}
                </div>
                <h3 className="text-xl font-bold text-white mb-4">{tech.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{tech.desc}</p>
              </div>
            ))}
          </div>

          {/* cTDP Mechanism */}
          <div className="bg-gradient-to-r from-blue-900/50 to-indigo-900/50 rounded-3xl p-8 md:p-12 border border-blue-500/20">
            <h3 className="text-2xl font-bold text-white mb-8 text-center">cTDP 促渗透机理与过程</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[
                { step: "Step 1", title: "特异结合", desc: "环肽与皮肤表面细胞受体专一性结合" },
                { step: "Step 2", title: "打开通道", desc: "皮肤细胞表面紧密连接结构改变，5分钟形成较大间隙" },
                { step: "Step 3", title: "深层递送", desc: "大分子活性物通过打开的细胞间隙顺利渗透" },
                { step: "Step 4", title: "自然闭合", desc: "15分钟后皮肤间隙自动恢复正常屏障结构" }
              ].map((item, idx) => (
                <div key={idx} className="relative group">
                  <div className="text-blue-400 font-mono text-sm mb-2 font-bold">{item.step}</div>
                  <div className="h-1 w-full bg-slate-700 rounded-full mb-4 overflow-hidden">
                    <div className="h-full bg-blue-500 w-1/3 group-hover:w-full transition-all duration-500"></div>
                  </div>
                  <h4 className="text-lg font-bold text-slate-200 mb-2">{item.title}</h4>
                  <p className="text-slate-400 text-xs leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-20 px-6 max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <span className="text-blue-600 font-semibold tracking-wider text-sm uppercase mb-2 block">Global R&D Team</span>
          <h2 className="text-3xl font-bold text-slate-900 mb-4">瑞士创新中心 (MSIC)</h2>
          <div className="w-16 h-1 bg-blue-600 mx-auto rounded-full mb-6"></div>
          <p className="text-slate-600 max-w-2xl mx-auto">
            以中瑞技术连接为纽带，融合瑞士抗衰理念与先进透皮技术，推动关键成果的应用转化与产品升级，形成更完善的研发验证体系与持续创新能力。
          </p>
        </div>

        <div className="grid md:grid-cols-4 gap-8">
          {teamMembers.map((member) => (
            <div key={member.id} className="bg-white rounded-3xl overflow-hidden shadow-xl shadow-slate-200/50 group hover:-translate-y-2 transition-all duration-300">
              <div className="h-48 overflow-hidden relative">
                <div className="absolute inset-0 bg-blue-900/20 group-hover:bg-transparent transition duration-300 z-10"></div>
                <img src={member.img} alt={member.name} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition duration-500 scale-105 group-hover:scale-100" />
              </div>
              <div className="p-6 flex flex-col h-full">
                <h3 className="text-xl font-bold text-slate-800 mb-1">{member.name}</h3>
                <p className="text-blue-600 text-sm font-medium mb-4">{member.role}</p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {member.tags.map((tag, i) => (
                    <span key={i} className="text-[10px] px-2 py-1 bg-slate-100 text-slate-600 rounded-md font-medium">
                      {tag}
                    </span>
                  ))}
                </div>
                <p className="text-slate-500 text-xs leading-relaxed">
                  {member.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
        
        {/* Quote */}
        <div className="mt-20 bg-blue-50 rounded-3xl p-8 md:p-12 text-center relative overflow-hidden">
          <Quote className="w-24 h-24 text-blue-100 absolute top-4 left-4 -rotate-12" />
          <h3 className="text-2xl md:text-3xl font-bold text-slate-800 mb-4 relative z-10">
            中瑞联合研发与技术共创
          </h3>
          <p className="text-slate-600 max-w-3xl mx-auto relative z-10">
            瑞士端负责欧洲创新原料开发、方法开发、机理验证及人体功效设计与数据规范；<br className="hidden md:block"/>
            中国端负责产业化转化与高效交付，形成贯通上游创新与下游制造的完美闭环体系。
          </p>
        </div>
      </section>
    </div>
  );
}
