import React, { useState, useRef, useEffect } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  ShoppingCart, User, Search, Menu, X, ChevronDown, Heart, Sparkles, 
  Camera, ClipboardList, Gift, ArrowRight, UserPlus, CheckCircle2, FlaskConical 
} from 'lucide-react';
import { useAuthStore } from '../contexts/authStore';
import { LEVEL_LABELS, LEVEL_COLORS } from '../types';
import { useQuery } from '@tanstack/react-query';
import api from '../utils/api';
import { Helmet } from 'react-helmet-async';
import { AIChatbot } from './AIChatbot';
import BackToTop from './BackToTop';
import { useTranslation } from "react-i18next";

export default function ShopLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [showExperimentModal, setShowExperimentModal] = useState(false);
  const searchRef = useRef<HTMLFormElement>(null);
  const suggestRef = useRef<HTMLDivElement>(null);
  const { t, i18n } = useTranslation();

  const { data: cartData } = useQuery({
    queryKey: ['cart'],
    queryFn: () => api.get('/cart'),
    enabled: !!user,
  }) as any;

  const { data: suggestions } = useQuery({
    queryKey: ['search-suggestions', searchKeyword],
    queryFn: () => api.get(`/products/search/suggestions?q=${encodeURIComponent(searchKeyword)}`),
    enabled: searchKeyword.length >= 1,
  }) as any;

  const { data: hotSearch } = useQuery({
    queryKey: ['hot-search'],
    queryFn: () => api.get('/products/search/hot'),
  }) as any;

  // 读取网站设置
  const { data: settingsData } = useQuery({
    queryKey: ['site-settings-public'],
    queryFn: () => api.get('/settings'),
  }) as any;
  const settings: Record<string, string> = settingsData || {};

  const cartCount = cartData?.count || 0;

  // 随机分组：AI 组 ('ai_assisted') vs 非AI组 ('traditional_search')
  const [experimentPath, setExperimentPath] = useState<string>(() => {
    let saved = sessionStorage.getItem('experiment_path') || localStorage.getItem('experiment_path');
    if (!saved) {
      saved = Math.random() < 0.5 ? 'ai_assisted' : 'traditional_search';
      sessionStorage.setItem('experiment_path', saved);
      localStorage.setItem('experiment_path', saved);
    }
    return saved;
  });

  // 判断是否弹出苏黎世大学调研欢迎弹窗（首次进入且开启了问卷功能）
  useEffect(() => {
    if (settings.feature_ai_quiz === '1') {
      const seen = sessionStorage.getItem('zurich_experiment_modal_seen');
      if (!seen && location.pathname !== '/survey' && location.pathname !== '/quiz') {
        setShowExperimentModal(true);
      }
    }
  }, [settings.feature_ai_quiz, location.pathname]);

  const dismissExperimentModal = () => {
    sessionStorage.setItem('zurich_experiment_modal_seen', '1');
    setShowExperimentModal(false);
  };

  // GEO: 生成网站基础结构化数据
  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": settings.site_name || "TRASOCHY",
    "url": window.location.origin,
    "potentialAction": {
      "@type": "SearchAction",
      "target": {
        "@type": "EntryPoint",
        "urlTemplate": `${window.location.origin}/products?keyword={search_term_string}`
      },
      "query-input": "required name=search_term_string"
    }
  };

  const orgSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": settings.site_name || "TRASOCHY",
    "url": window.location.origin,
    "logo": settings.brand_logo ? (settings.brand_logo.startsWith('http') ? settings.brand_logo : `${window.location.origin}${settings.brand_logo}`) : `${window.location.origin}/logo.png`,
    "description": settings.site_slogan || "高端护肤 · 臻致美肌"
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchKeyword.trim()) {
      navigate(`/products?keyword=${encodeURIComponent(searchKeyword)}`);
      setShowSuggestions(false);
    }
  };

  // 点击外部关闭搜索建议
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node) &&
          suggestRef.current && !suggestRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // 防复制、防下载、防右键保护
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey && (e.key === 'c' || e.key === 'C' || e.key === 'u' || e.key === 'U' || e.key === 's' || e.key === 'S' || e.key === 'a' || e.key === 'A')) ||
        (e.metaKey && (e.key === 'c' || e.key === 'C' || e.key === 'u' || e.key === 'U' || e.key === 's' || e.key === 'S' || e.key === 'a' || e.key === 'A')) ||
        e.key === 'F12'
      ) {
        e.preventDefault();
      }
    };
    const handleSelectStart = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
        e.preventDefault();
      }
    };
    const handleDragStart = (e: DragEvent) => {
      e.preventDefault();
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('selectstart', handleSelectStart);
    document.addEventListener('dragstart', handleDragStart);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('selectstart', handleSelectStart);
      document.removeEventListener('dragstart', handleDragStart);
    };
  }, []);

  // 动态注入统计代码
  useEffect(() => {
    const injectScript = (code: string, id: string) => {
      if (!code || document.getElementById(id)) return;
      const script = document.createElement('script');
      script.id = id;
      script.async = true;
      if (code.startsWith('<script') && code.endsWith('</script>')) {
        const srcMatch = code.match(/src=["']([^"']+)["']/);
        if (srcMatch && srcMatch[1]) {
          script.src = srcMatch[1];
        } else {
          script.innerHTML = code.replace(/<script[^>]*>/, '').replace(/<\/script>/, '');
        }
      } else {
        script.innerHTML = code;
      }
      document.head.appendChild(script);
    };

    if (settingsData) {
      if (settings.google_analytics_code) injectScript(settings.google_analytics_code, 'tracking-ga');
      if (settings.baidu_tongji_code) injectScript(settings.baidu_tongji_code, 'tracking-baidu');
    }
  }, [settingsData]);

  return (
    <div 
      className="min-h-screen flex flex-col" 
      style={{ 
        fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
        userSelect: 'none',
        WebkitUserSelect: 'none',
        WebkitTouchCallout: 'none'
      }}
    >
      <Helmet>
        <title>{settings.seo_title || settings.site_name || t('auto_shoplayout_356', '传诗奇 TRASOCHY')}</title>
        <meta name="description" content={settings.seo_description || settings.site_slogan || ''} />
        <meta name="keywords" content={settings.seo_keywords || t('auto_shoplayout_357', '护肤品')} />
        
        {/* Open Graph Tags */}
        <meta property="og:title" content={settings.og_title || settings.seo_title || settings.site_name || ''} />
        <meta property="og:description" content={settings.og_description || settings.seo_description || settings.site_slogan || ''} />
        {settings.og_image && <meta property="og:image" content={settings.og_image} />}
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />

        {/* GEO: JSON-LD Structured Data */}
        <script type="application/ld+json">
          {JSON.stringify(websiteSchema)}
        </script>
        <script type="application/ld+json">
          {JSON.stringify(orgSchema)}
        </script>
      </Helmet>

      {/* 顶部主导航栏 */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between gap-2 md:gap-4">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 whitespace-nowrap">
            <span className="text-lg md:text-xl font-bold tracking-widest text-stone-900 shrink-0">TRASOCHY</span>
          </Link>

          {/* 导航 - 桌面 */}
          <nav className="hidden md:flex items-center gap-8 text-xs text-stone-500 tracking-widest uppercase">
            <Link to="/" className="hover:text-stone-900 transition-colors">{t('nav.home', t('auto_shoplayout_341', '首页'))}</Link>
            <Link to="/products" className="hover:text-stone-900 transition-colors">{t('auto_shoplayout_343', t('auto_shoplayout_343', '全部商品'))}</Link>
            {settings.feature_company_intro === '1' && (
              <Link to="/brand-story" className="hover:text-stone-900 transition-colors font-medium">{t('nav.brand_story', t('auto_shoplayout_350', '品牌与技术'))}</Link>
            )}
            {settings.feature_articles === '1' && (
              <Link to="/articles" className="hover:text-stone-900 transition-colors">{t('nav.skincare_institute', t('auto_shoplayout_345', '皮肤科学研创中心'))}</Link>
            )}
          </nav>

          {/* 搜索 */}
          <form ref={searchRef} onSubmit={handleSearch} className="hidden md:block relative flex-1 max-w-xs ml-8">
            <div className="relative">
              <input
                value={searchKeyword}
                onChange={e => { setSearchKeyword(e.target.value); setShowSuggestions(true); }}
                onFocus={() => setShowSuggestions(true)}
                placeholder={t('auto_shoplayout_354', '搜索商品...')}
                className="w-full pl-4 pr-10 py-1.5 text-xs border-b border-stone-300 bg-transparent focus:outline-none focus:border-stone-900 uppercase tracking-wider placeholder-stone-400"
              />
              <button type="submit" className="absolute right-0 top-1.5 text-stone-400 hover:text-stone-900">
                <Search size={14} />
              </button>
            </div>

            {/* 搜索建议下拉 */}
            {showSuggestions && (
              <div ref={suggestRef}
                className="absolute top-full left-0 right-0 mt-1 bg-white border border-stone-200 shadow-lg z-50 overflow-hidden">
                {searchKeyword.length >= 1 && suggestions?.length > 0 ? (
                  suggestions.map((item: any) => (
                    <button key={item.slug} type="button"
                      onClick={() => { navigate(`/products/${item.slug}`); setShowSuggestions(false); setSearchKeyword(''); }}
                      className="w-full px-4 py-2.5 text-left text-xs text-stone-700 hover:bg-stone-50 transition-colors flex items-center gap-2">
                      <Search size={12} className="text-stone-300" />
                      {item.name}
                    </button>
                  ))
                ) : searchKeyword.length >= 1 ? (
                  <div className="px-4 py-3 text-xs text-stone-400">{t('auto_shoplayout_330', t('auto_shoplayout_330', '未找到相关商品'))}</div>
                ) : hotSearch?.length > 0 ? (
                  <div>
                    <div className="px-4 py-2 text-xs text-stone-400 tracking-wider uppercase border-b border-stone-100">{t('auto_shoplayout_331', t('auto_shoplayout_331', '热门搜索'))}</div>
                    {hotSearch.map((tag: string) => (
                      <button key={tag} type="button"
                        onClick={() => { setSearchKeyword(tag); navigate(`/products?keyword=${encodeURIComponent(tag)}`); setShowSuggestions(false); }}
                        className="w-full px-4 py-2.5 text-left text-xs text-stone-600 hover:bg-stone-50 transition-colors">
                        {tag}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            )}
          </form>

          {/* 右侧操作区 */}
          <div className="flex items-center gap-2 md:gap-4 shrink-0">
            {/* 多语言切换 */}
            <div className="relative hidden md:block">
              <button 
                onClick={() => setLangOpen(!langOpen)}
                className="flex items-center gap-1 text-xs text-stone-500 hover:text-stone-900 transition-colors py-1 px-1.5 uppercase"
              >
                {i18n.language === 'zh' ? t('auto_shoplayout_358', '中文') : i18n.language === 'en' ? 'EN' : 'DE'}
                <ChevronDown size={10} />
              </button>
              {langOpen && (
                <div className="absolute right-0 mt-1 w-24 bg-white rounded-sm shadow-lg border border-stone-100 py-1 text-xs z-50" onMouseLeave={() => setLangOpen(false)}>
                  <button onClick={() => { i18n.changeLanguage('zh'); setLangOpen(false); window.location.reload(); }} className="w-full text-left px-4 py-2 hover:bg-stone-50 text-stone-700">{t('auto_shoplayout_358', t('auto_shoplayout_358', '中文'))}</button>
                  <button onClick={() => { i18n.changeLanguage('en'); setLangOpen(false); window.location.reload(); }} className="w-full text-left px-4 py-2 hover:bg-stone-50 text-stone-700">English</button>
                  <button onClick={() => { i18n.changeLanguage('de'); setLangOpen(false); window.location.reload(); }} className="w-full text-left px-4 py-2 hover:bg-stone-50 text-stone-700">Deutsch</button>
                </div>
              )}
            </div>

            {/* 收藏 (在移动端隐藏) */}
            {user && (
              <Link to="/favorites" className="hidden md:flex relative p-1.5 md:p-2 text-stone-400 hover:text-rose-500 transition-colors">
                <Heart size={18} />
              </Link>
            )}

            {/* 购物车 */}
            {user && (
              <Link to="/cart" className="relative p-1.5 md:p-2 text-stone-600 hover:text-stone-900 transition-colors">
                <ShoppingCart size={20} />
                {cartCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-stone-900 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
                    {cartCount > 9 ? '9+' : cartCount}
                  </span>
                )}
              </Link>
            )}

            {/* 用户菜单 */}
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setUserOpen(!userOpen)}
                  className="flex items-center gap-1.5 text-xs text-stone-600 hover:text-stone-900 transition-colors p-1.5"
                >
                  <User size={18} />
                  <span className="hidden md:inline font-medium">{user.name || user.username || user.email}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${LEVEL_COLORS[user.level] || 'bg-stone-100 text-stone-600'}`}>
                    {LEVEL_LABELS[user.level] || user.level}
                  </span>
                </button>

                {userOpen && (
                  <div
                    className="absolute right-0 mt-2 w-48 bg-white border border-stone-200 shadow-lg py-2 text-xs z-50 uppercase tracking-wider"
                    onMouseLeave={() => setUserOpen(false)}
                  >
                    <Link to="/profile" onClick={() => setUserOpen(false)} className="block px-4 py-2 text-stone-700 hover:bg-stone-50">{t('nav.profile', '个人中心')}</Link>
                    <Link to="/orders" onClick={() => setUserOpen(false)} className="block px-4 py-2 text-stone-700 hover:bg-stone-50">{t('nav.orders', '我的订单')}</Link>
                    <Link to="/addresses" onClick={() => setUserOpen(false)} className="block px-4 py-2 text-stone-700 hover:bg-stone-50">{t('nav.addresses', '地址管理')}</Link>
                    <Link to="/favorites" onClick={() => setUserOpen(false)} className="block px-4 py-2 text-stone-700 hover:bg-stone-50">{t('nav.favorites', '我的收藏')}</Link>
                    {user.level === 'admin' && (
                      <Link to="/admin" onClick={() => setUserOpen(false)} className="block px-4 py-2 text-rose-600 font-bold hover:bg-rose-50 border-t border-stone-100">{t('nav.admin', '管理后台')}</Link>
                    )}
                    <button
                      onClick={() => { logout(); setUserOpen(false); navigate('/'); }}
                      className="w-full text-left px-4 py-2 text-stone-400 hover:text-stone-700 border-t border-stone-100 cursor-pointer"
                    >
                      {t('nav.logout', '退出登录')}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/register" className="hidden sm:inline-flex text-xs text-rose-600 font-medium hover:underline">{t('nav.register', '快速注册')}</Link>
                <Link to="/login" className="btn-primary text-xs py-1.5 px-3 md:py-2 md:px-5">{t('nav.login', '登录')}</Link>
              </div>
            )}

            {/* 移动端菜单按钮 */}
            <button className="md:hidden p-1.5" onClick={() => setMenuOpen(!menuOpen)}>
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* 移动端展开菜单 */}
        {menuOpen && (
          <div className="md:hidden bg-white border-t border-stone-100 px-6 py-4 flex flex-col gap-4 text-xs uppercase tracking-widest">
            <form onSubmit={handleSearch} className="flex gap-2">
              <input value={searchKeyword} onChange={e => setSearchKeyword(e.target.value)} placeholder={t('auto_shoplayout_355', '搜索...')} className="flex-1 pl-3 pr-3 py-2 border-b border-stone-300 text-xs uppercase" />
              <button type="submit" className="btn-primary text-xs py-2 px-4">{t('auto_shoplayout_340', t('auto_shoplayout_340', '搜索'))}</button>
            </form>
            <Link to="/" onClick={() => setMenuOpen(false)} className="text-stone-700">{t('auto_shoplayout_341', t('auto_shoplayout_341', '首页'))}</Link>
            <Link to="/products" onClick={() => setMenuOpen(false)} className="text-stone-700">{t('auto_shoplayout_343', t('auto_shoplayout_343', '全部商品'))}</Link>
            {settings.feature_company_intro === '1' && (
              <Link to="/brand-story" onClick={() => setMenuOpen(false)} className="text-stone-700">{t('auto_shoplayout_350', t('auto_shoplayout_350', '品牌与技术'))}</Link>
            )}
            {settings.feature_articles === '1' && (
              <Link to="/articles" onClick={() => setMenuOpen(false)} className="text-stone-700">{t('auto_shoplayout_345', t('auto_shoplayout_345', '皮肤科学研创中心'))}</Link>
            )}
            {user && (
              <>
                <Link to="/favorites" onClick={() => setMenuOpen(false)} className="text-stone-700">{t('auto_shoplayout_346', t('auto_shoplayout_346', '我的收藏'))}</Link>
                <Link to="/orders" onClick={() => setMenuOpen(false)} className="text-stone-700">{t('auto_shoplayout_347', t('auto_shoplayout_347', '我的订单'))}</Link>
              </>
            )}
            <div className="border-t border-stone-100 pt-4 flex gap-4">
              <button onClick={() => { i18n.changeLanguage('zh'); setMenuOpen(false); window.location.reload(); }} className={`text-xs ${i18n.language === 'zh' ? 'text-rose-500 font-bold' : 'text-stone-500'}`}>{t('auto_shoplayout_358', t('auto_shoplayout_358', '中文'))}</button>
              <button onClick={() => { i18n.changeLanguage('en'); setMenuOpen(false); window.location.reload(); }} className={`text-xs ${i18n.language === 'en' ? 'text-rose-500 font-bold' : 'text-stone-500'}`}>EN</button>
              <button onClick={() => { i18n.changeLanguage('de'); setMenuOpen(false); window.location.reload(); }} className={`text-xs ${i18n.language === 'de' ? 'text-rose-500 font-bold' : 'text-stone-500'}`}>DE</button>
            </div>
          </div>
        )}
      </header>

      {/* ── 瑞士苏黎世大学科研实验任务指示条 ── */}
      {settings.feature_ai_quiz === '1' && (
        <div className="bg-stone-900 text-white py-2.5 px-4 shadow-sm border-b border-stone-800 sticky top-16 z-40">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className={`px-2 py-0.5 rounded text-[11px] font-semibold tracking-wider flex items-center gap-1 border ${
                experimentPath === 'ai_assisted'
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
              }`}>
                <FlaskConical size={12} /> {experimentPath === 'ai_assisted' ? '苏黎世大学学术实验 · AI组' : '苏黎世大学学术实验 · 非AI组'}
              </span>
              <span className="text-stone-300">
                {experimentPath === 'ai_assisted'
                  ? '请在商城挑选心仪产品加入购物车；您可随时使用 AI 测肤与智能问答辅助决策。'
                  : '请在商城中自主浏览并挑选 2~3 款心仪产品加入购物车；加购完成后点击完成问卷调查。'}
              </span>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              {experimentPath === 'ai_assisted' && (
                <button
                  type="button"
                  onClick={() => {
                    navigate('/quiz');
                  }}
                  className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-500 text-white px-3.5 py-1.5 rounded-full font-medium transition-all shadow-sm hover:shadow"
                >
                  <Sparkles size={13} /> 我需要 AI 帮助
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  if (!user) {
                    navigate('/login?redirect=/survey');
                  } else {
                    navigate('/survey');
                  }
                }}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full font-medium border transition-all ${
                  cartCount >= 2 && cartCount <= 3
                    ? 'bg-emerald-400 hover:bg-emerald-300 text-stone-950 border-emerald-300 font-bold shadow animate-pulse'
                    : cartCount > 0
                    ? 'bg-amber-400 hover:bg-amber-300 text-stone-950 border-amber-300 font-bold shadow'
                    : 'bg-stone-800 hover:bg-stone-700 text-stone-300 border-stone-700'
                }`}
              >
                <Gift size={13} className={cartCount > 0 ? 'text-stone-950' : 'text-amber-400'} />
                <span>
                  {cartCount >= 2 && cartCount <= 3
                    ? `🎯 已挑选 ${cartCount} 件 (达成目标) · 点击完成问卷调查`
                    : experimentPath === 'ai_assisted'
                    ? '完成问卷调查 (领代金券)'
                    : '完成问卷调查 (21题)'}
                </span>
                {cartCount > 0 && !(cartCount >= 2 && cartCount <= 3) && (
                  <span className="bg-stone-950 text-white text-[10px] px-1.5 py-0.2 rounded-full">
                    已加购{cartCount}件
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 瑞士苏黎世大学合作学术调研 Welcome Modal ── */}
      {showExperimentModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 md:p-8 shadow-2xl border border-stone-100 relative text-left">
            <button
              type="button"
              onClick={dismissExperimentModal}
              className="absolute top-4 right-4 text-stone-400 hover:text-stone-700 transition-colors p-1"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center shrink-0 ${
                experimentPath === 'ai_assisted' ? 'bg-rose-50 border-rose-100 text-rose-600' : 'bg-emerald-50 border-emerald-100 text-emerald-600'
              }`}>
                <FlaskConical size={24} />
              </div>
              <div>
                <span className={`text-[11px] font-bold uppercase tracking-widest ${
                  experimentPath === 'ai_assisted' ? 'text-rose-600' : 'text-emerald-600'
                }`}>
                  University of Zurich · Academic Research ({experimentPath === 'ai_assisted' ? 'AI 组' : '非 AI 组'})
                </span>
                <h3 className="text-lg font-bold text-stone-900">
                  {experimentPath === 'ai_assisted' ? '欢迎参与学术实验与问卷调研（AI组）' : '欢迎参与学术实验与问卷调研（非AI组）'}
                </h3>
              </div>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed mb-5">
              感谢您访问 TRASOCHY 传诗奇！目前我们正与<b>瑞士苏黎世大学</b>联合开展一项关于<b>「线上护肤品购物决策过程与体验」</b>的学术实验。
              {experimentPath === 'traditional_search' && (
                <span className="block mt-1 text-stone-700 font-medium">
                  本组为<b>非 AI 组</b>，请在预算不超过 300 元的情况下，自主浏览并挑选 2~3 款产品加入购物车，本组不提供 AI 测肤或 AI 推荐。
                </span>
              )}
            </p>

            <div className="space-y-3 bg-stone-50 rounded-xl p-4 border border-stone-100 text-xs text-stone-700 mb-6">
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-stone-900 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">1</span>
                <div>
                  <p className="font-semibold text-stone-900">快速注册账号</p>
                  <p className="text-stone-500 text-[11px]">使用简单用户名一键注册登录，开启实验体验。</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-stone-900 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">2</span>
                <div>
                  <p className="font-semibold text-stone-900">挑选 2~3 款心仪产品加入购物车</p>
                  <p className="text-stone-500 text-[11px]">
                    {experimentPath === 'ai_assisted'
                      ? '自主浏览或借助 AI 测肤顾问推荐，挑选商品并将其加入购物车。'
                      : '自主浏览与搜索商品，挑选 2~3 款心仪产品加入购物车。'}
                  </p>
                </div>
              </div>

              {experimentPath === 'ai_assisted' && (
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-stone-900 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">3</span>
                  <div>
                    <p className="font-semibold text-stone-900">可随时获取 AI 帮助</p>
                    <p className="text-stone-500 text-[11px]">点击<b>【我需要 AI 帮助】</b>或右下角客服获取智能护肤方案与产品建议。</p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-stone-900 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                  {experimentPath === 'ai_assisted' ? '4' : '3'}
                </span>
                <div>
                  <p className="font-semibold text-stone-900">完成问卷，立领专属代金券</p>
                  <p className="text-stone-500 text-[11px]">
                    选品完成后点击<b>【完成问卷调查】</b>，提交即可获得<b>专属代金券</b>直接抵扣订单！
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              {!user ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      dismissExperimentModal();
                      navigate('/register?redirect=/products');
                    }}
                    className="flex-1 flex items-center justify-center gap-2 bg-stone-900 hover:bg-stone-800 text-white py-2.5 px-4 rounded-xl text-xs font-semibold transition-all shadow-sm"
                  >
                    <UserPlus size={14} /> 快速注册并开始实验
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      dismissExperimentModal();
                      navigate('/login?redirect=/products');
                    }}
                    className="flex items-center justify-center px-4 py-2.5 border border-stone-200 text-stone-700 hover:bg-stone-50 rounded-xl text-xs font-medium"
                  >
                    已有账号登录
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    dismissExperimentModal();
                    navigate('/products');
                  }}
                  className="w-full flex items-center justify-center gap-2 bg-stone-900 hover:bg-stone-800 text-white py-2.5 px-4 rounded-xl text-xs font-semibold transition-all shadow-sm"
                >
                  <ArrowRight size={14} /> 进入商城开始挑选商品
                </button>
              )}
            </div>

            {/* 调研免购买说明 */}
            <div className="mt-4 pt-3 border-t border-stone-100 text-center">
              <p className="text-[11px] text-stone-500 leading-relaxed">
                💡 <b>温馨提示</b>：此次为调研活动，无需您真实购买，将产品加入购物车代表购物完毕，感谢您的支持！
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 内容区 */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* 页脚 */}
      <footer className="bg-stone-950 text-stone-400 text-xs py-12 mt-16 tracking-wider uppercase">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-stone-200 font-bold tracking-widest text-sm mb-4">{settings.footer_text || t('auto_shoplayout_359', 'TRASOCHY · 传诗奇')}</p>
          <p className="mb-2">{settings.site_slogan || t('auto_shoplayout_360', '高端护肤 · 臻致美肌')}</p>
          <div className="flex justify-center gap-8 mb-6">
            {settings.feature_company_intro === '1' && (
              <Link to="/brand-story" className="text-stone-500 hover:text-stone-300 transition-colors">{t('auto_shoplayout_350', t('auto_shoplayout_350', '品牌与技术'))}</Link>
            )}
            <Link to="/contact" className="text-stone-500 hover:text-stone-300 transition-colors">{t('auto_shoplayout_351', t('auto_shoplayout_351', '联系方式'))}</Link>
            <Link to="/delivery" className="text-stone-500 hover:text-stone-300 transition-colors">{t('auto_shoplayout_352', t('auto_shoplayout_352', '配送说明'))}</Link>
            <Link to="/privacy" className="text-stone-500 hover:text-stone-300 transition-colors">{t('auto_shoplayout_353', t('auto_shoplayout_353', '隐私政策'))}</Link>
          </div>

          {/* 化妆品与广告法合规免责声明 */}
          <div className="max-w-4xl mx-auto mt-6 pt-6 border-t border-stone-800 text-[11px] text-stone-500 normal-case leading-relaxed text-center space-y-1">
            <p>
              【法律声明与合规提示】本网站展示及销售的商品均为普通/特殊化妆品，非药品，不具备疾病预防、治疗或医疗作用。
            </p>
            <p>
              页面展示的成分说明、核心功效及科普内容均源于原料备案文献或科学参考资料，实际护肤体验因个体肤质及使用习惯而异。
            </p>
            <p className="text-stone-600 text-[10px]">
              本平台严格遵守《中华人民共和国广告法》与《化妆品监督管理条例》，若发现任何表述疏漏或歧义，请联系我们及时指正。
            </p>
          </div>

          <p className="text-stone-600 mt-4">© {new Date().getFullYear()} TRASOCHY. All rights reserved.</p>
        </div>
      </footer>
      {settings.feature_ai_chatbot === '1' && experimentPath === 'ai_assisted' && <AIChatbot />}
      <BackToTop />
    </div>
  );
}
