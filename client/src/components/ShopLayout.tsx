import React, { useState, useRef, useEffect } from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, User, Search, Menu, X, ChevronDown, Heart, Sparkles, Camera } from 'lucide-react';
import { useAuthStore } from '../contexts/authStore';
import { LEVEL_LABELS, LEVEL_COLORS } from '../types';
import { useQuery } from '@tanstack/react-query';
import api from '../utils/api';
import { Helmet } from 'react-helmet-async';
import { AIChatbot } from './AIChatbot';
import { useTranslation } from "react-i18next";

export default function ShopLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
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
    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
    };
    const handleDragStart = (e: DragEvent) => {
      e.preventDefault();
    };
    const handleSelectStart = (e: Event) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      e.preventDefault();
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('copy', handleCopy);
    document.addEventListener('dragstart', handleDragStart);
    document.addEventListener('selectstart', handleSelectStart);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('dragstart', handleDragStart);
      document.removeEventListener('selectstart', handleSelectStart);
    };
  }, []);

  // 流量追踪与分析 (Tracking Scripts) 注入
  useEffect(() => {
    const injectScript = (code: string, id: string) => {
      if (!code || document.getElementById(id)) return;
      try {
        const fragment = document.createRange().createContextualFragment(code);
        const container = document.createElement('div');
        container.id = id;
        container.style.display = 'none';
        container.appendChild(fragment);
        document.body.appendChild(container);
      } catch (e) {
        console.error(`[Tracking] Failed to inject ${id} script:`, e);
      }
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
      {/* 顶部栏 */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between gap-2 md:gap-4">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 whitespace-nowrap">
            <span className="text-lg md:text-xl font-bold tracking-widest text-stone-900 shrink-0">TRASOCHY</span>
          </Link>

          {/* 导航 - 桌面 */}
          <nav className="hidden md:flex items-center gap-8 text-xs text-stone-500 tracking-widest uppercase">
            {settings.feature_ai_quiz === '1' && (
              <Link to="/quiz" className="flex items-center gap-1 text-rose-500 hover:text-rose-600 transition-colors font-medium">
                <Sparkles size={12} /> {t('auto_shoplayout_342', 'AI测肤')}
              </Link>
            )}
            <Link to="/" className="hover:text-stone-900 transition-colors">{t('nav.home', t('auto_shoplayout_341', '首页'))}</Link>
            <Link to="/products" className="hover:text-stone-900 transition-colors">{t('auto_shoplayout_343', t('auto_shoplayout_343', '全部商品'))}</Link>
            {settings.feature_company_intro === '1' && (
              <Link to="/brand-story" className="hover:text-stone-900 transition-colors font-medium">{t('nav.brand_story', t('auto_shoplayout_350', '品牌与技术'))}</Link>
            )}
            {settings.feature_articles === '1' && (
              <Link to="/articles" className="hover:text-stone-900 transition-colors">{t('nav.skincare_institute', t('auto_shoplayout_345', '皮肤医学研究院'))}</Link>
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

            {/* 移动端专享：AI测肤入口 */}
            {settings.feature_ai_quiz === '1' && (
              <Link to="/quiz" className="md:hidden flex items-center gap-1 text-rose-500 hover:text-rose-600 transition-colors font-medium text-xs mr-1">
                <Sparkles size={14} /> {t('auto_shoplayout_342', 'AI测肤')}
              </Link>
            )}

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
                  className="flex items-center gap-1 text-xs text-stone-700 hover:text-stone-900 transition-colors py-1 px-1.5 md:px-2 tracking-wider uppercase"
                >
                  <User size={18} />
                  <span className="hidden md:inline">{user.name}</span>
                  <ChevronDown size={12} className="hidden sm:block" />
                </button>
                {userOpen && (
                  <div className="absolute right-0 mt-1 w-44 bg-white rounded-sm shadow-lg border border-stone-100 py-1 text-xs z-50" onMouseLeave={() => setUserOpen(false)}>
                    <Link to="/profile" className="block px-4 py-2.5 hover:bg-stone-50 text-stone-700 uppercase tracking-wider">{t('auto_shoplayout_333', t('auto_shoplayout_333', '个人中心'))}</Link>
                    <Link to="/orders" className="block px-4 py-2.5 hover:bg-stone-50 text-stone-700 uppercase tracking-wider">{t('auto_shoplayout_347', t('auto_shoplayout_347', '我的订单'))}</Link>
                    <Link to="/favorites" className="block px-4 py-2.5 hover:bg-stone-50 text-stone-700 uppercase tracking-wider">{t('auto_shoplayout_346', t('auto_shoplayout_346', '我的收藏'))}</Link>
                    <Link to="/addresses" className="block px-4 py-2.5 hover:bg-stone-50 text-stone-700 uppercase tracking-wider">{t('auto_shoplayout_336', t('auto_shoplayout_336', '收货地址'))}</Link>
                    {(user.level === 'admin' || user.level === 'staff') && (
                      <Link to="/admin" className="block px-4 py-2.5 hover:bg-stone-50 text-stone-900 font-medium uppercase tracking-wider">{t('auto_shoplayout_337', t('auto_shoplayout_337', '管理后台'))}</Link>
                    )}
                    <hr className="my-1 border-stone-100" />
                    <button onClick={() => { logout(); navigate('/'); }} className="w-full text-left px-4 py-2.5 hover:bg-stone-50 text-stone-400 uppercase tracking-wider">{t('auto_shoplayout_338', t('auto_shoplayout_338', '退出登录'))}</button>
                  </div>
                )}
              </div>
            ) : (
              <Link to="/login" className="btn-primary text-xs py-1.5 px-3 md:py-2 md:px-5">{t('auto_shoplayout_339', t('auto_shoplayout_339', '登录'))}</Link>
            )}

            {/* 移动端菜单按钮 */}
            <button className="md:hidden p-1.5" onClick={() => setMenuOpen(!menuOpen)}>
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* 移动端菜单 */}
        {menuOpen && (
          <div className="md:hidden bg-white border-t border-stone-100 px-6 py-4 flex flex-col gap-4 text-xs uppercase tracking-widest">
            <form onSubmit={handleSearch} className="flex gap-2">
              <input value={searchKeyword} onChange={e => setSearchKeyword(e.target.value)} placeholder={t('auto_shoplayout_355', '搜索...')} className="flex-1 pl-3 pr-3 py-2 border-b border-stone-300 text-xs uppercase" />
              <button type="submit" className="btn-primary text-xs py-2 px-4">{t('auto_shoplayout_340', t('auto_shoplayout_340', '搜索'))}</button>
            </form>
            {settings.feature_ai_quiz === '1' && (
              <Link to="/quiz" onClick={() => setMenuOpen(false)} className="text-rose-500 font-medium flex items-center gap-1">
                <Sparkles size={12} /> {t('auto_shoplayout_342', 'AI测肤')}
              </Link>
            )}
            <Link to="/" onClick={() => setMenuOpen(false)} className="text-stone-700">{t('auto_shoplayout_341', t('auto_shoplayout_341', '首页'))}</Link>
            <Link to="/products" onClick={() => setMenuOpen(false)} className="text-stone-700">{t('auto_shoplayout_343', t('auto_shoplayout_343', '全部商品'))}</Link>
            {settings.feature_company_intro === '1' && (
              <Link to="/brand-story" onClick={() => setMenuOpen(false)} className="text-stone-700">{t('auto_shoplayout_350', t('auto_shoplayout_350', '品牌与技术'))}</Link>
            )}
            {settings.feature_articles === '1' && (
              <Link to="/articles" onClick={() => setMenuOpen(false)} className="text-stone-700">{t('auto_shoplayout_345', t('auto_shoplayout_345', '皮肤医学研究院'))}</Link>
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
          <p className="text-stone-600">© {new Date().getFullYear()} TRASOCHY. All rights reserved.</p>
        </div>
      </footer>
      {settings.feature_ai_chatbot === '1' && <AIChatbot />}
    </div>
  );
}
