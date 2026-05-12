import React, { useState, useRef, useEffect } from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, User, Search, Menu, X, ChevronDown, Heart, Sparkles } from 'lucide-react';
import { useAuthStore } from '../contexts/authStore';
import { LEVEL_LABELS, LEVEL_COLORS } from '../types';
import { useQuery } from '@tanstack/react-query';
import api from '../utils/api';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { AIChatbot } from './AIChatbot';

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

  return (
    <div className="min-h-screen flex flex-col" style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
      <Helmet>
        <title>{settings.seo_title || settings.site_name || '传诗奇 TRASOCHY'}</title>
        <meta name="description" content={settings.seo_description || settings.site_slogan || ''} />
        <meta name="keywords" content={settings.seo_keywords || '护肤品'} />
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
            <Link to="/" className="hover:text-stone-900 transition-colors">{t('nav.home', '首页')}</Link>
            {settings.feature_ai_quiz === '1' && (
              <Link to="/quiz" className="flex items-center gap-1 text-rose-500 hover:text-rose-600 transition-colors font-medium">
                <Sparkles size={12} /> AI测肤
              </Link>
            )}
            <Link to="/products" className="hover:text-stone-900 transition-colors">全部商品</Link>
            {settings.feature_company_intro === '1' && (
              <Link to="/brand-story" className="hover:text-stone-900 transition-colors font-medium">{t('nav.brand_story', '品牌与技术')}</Link>
            )}
            {settings.feature_articles === '1' && (
              <Link to="/articles" className="hover:text-stone-900 transition-colors">{t('nav.skincare_institute', '护肤研究所')}</Link>
            )}
          </nav>

          {/* 搜索 */}
          <form ref={searchRef} onSubmit={handleSearch} className="hidden md:block relative flex-1 max-w-xs ml-8">
            <div className="relative">
              <input
                value={searchKeyword}
                onChange={e => { setSearchKeyword(e.target.value); setShowSuggestions(true); }}
                onFocus={() => setShowSuggestions(true)}
                placeholder="搜索商品..."
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
                  <div className="px-4 py-3 text-xs text-stone-400">未找到相关商品</div>
                ) : hotSearch?.length > 0 ? (
                  <div>
                    <div className="px-4 py-2 text-xs text-stone-400 tracking-wider uppercase border-b border-stone-100">热门搜索</div>
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
                {i18n.language === 'zh' ? '中文' : i18n.language === 'en' ? 'EN' : 'DE'}
                <ChevronDown size={10} />
              </button>
              {langOpen && (
                <div className="absolute right-0 mt-1 w-24 bg-white rounded-sm shadow-lg border border-stone-100 py-1 text-xs z-50" onMouseLeave={() => setLangOpen(false)}>
                  <button onClick={() => { i18n.changeLanguage('zh'); setLangOpen(false); window.location.reload(); }} className="w-full text-left px-4 py-2 hover:bg-stone-50 text-stone-700">中文</button>
                  <button onClick={() => { i18n.changeLanguage('en'); setLangOpen(false); window.location.reload(); }} className="w-full text-left px-4 py-2 hover:bg-stone-50 text-stone-700">English</button>
                  <button onClick={() => { i18n.changeLanguage('de'); setLangOpen(false); window.location.reload(); }} className="w-full text-left px-4 py-2 hover:bg-stone-50 text-stone-700">Deutsch</button>
                </div>
              )}
            </div>

            {/* 收藏 */}
            {user && (
              <Link to="/favorites" className="relative p-1.5 md:p-2 text-stone-400 hover:text-rose-500 transition-colors">
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
                    <Link to="/profile" className="block px-4 py-2.5 hover:bg-stone-50 text-stone-700 uppercase tracking-wider">个人中心</Link>
                    <Link to="/orders" className="block px-4 py-2.5 hover:bg-stone-50 text-stone-700 uppercase tracking-wider">我的订单</Link>
                    <Link to="/favorites" className="block px-4 py-2.5 hover:bg-stone-50 text-stone-700 uppercase tracking-wider">我的收藏</Link>
                    <Link to="/addresses" className="block px-4 py-2.5 hover:bg-stone-50 text-stone-700 uppercase tracking-wider">收货地址</Link>
                    {(user.level === 'admin' || user.level === 'staff') && (
                      <Link to="/admin" className="block px-4 py-2.5 hover:bg-stone-50 text-stone-900 font-medium uppercase tracking-wider">管理后台</Link>
                    )}
                    <hr className="my-1 border-stone-100" />
                    <button onClick={() => { logout(); navigate('/'); }} className="w-full text-left px-4 py-2.5 hover:bg-stone-50 text-stone-400 uppercase tracking-wider">退出登录</button>
                  </div>
                )}
              </div>
            ) : (
              <Link to="/login" className="btn-primary text-xs py-1.5 px-3 md:py-2 md:px-5">登录</Link>
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
              <input value={searchKeyword} onChange={e => setSearchKeyword(e.target.value)} placeholder="搜索..." className="flex-1 pl-3 pr-3 py-2 border-b border-stone-300 text-xs uppercase" />
              <button type="submit" className="btn-primary text-xs py-2 px-4">搜索</button>
            </form>
            <Link to="/" onClick={() => setMenuOpen(false)} className="text-stone-700">首页</Link>
            {settings.feature_ai_quiz === '1' && (
              <Link to="/quiz" onClick={() => setMenuOpen(false)} className="text-rose-500 font-medium flex items-center gap-1">
                <Sparkles size={12} /> AI测肤
              </Link>
            )}
            <Link to="/products" onClick={() => setMenuOpen(false)} className="text-stone-700">全部商品</Link>
            {settings.feature_company_intro === '1' && (
              <Link to="/brand-story" onClick={() => setMenuOpen(false)} className="text-stone-700">品牌与技术</Link>
            )}
            {settings.feature_articles === '1' && (
              <Link to="/articles" onClick={() => setMenuOpen(false)} className="text-stone-700">护肤研究所</Link>
            )}
            {user && (
              <>
                <Link to="/favorites" onClick={() => setMenuOpen(false)} className="text-stone-700">我的收藏</Link>
                <Link to="/orders" onClick={() => setMenuOpen(false)} className="text-stone-700">我的订单</Link>
              </>
            )}
            <div className="border-t border-stone-100 pt-4 flex gap-4">
              <button onClick={() => { i18n.changeLanguage('zh'); setMenuOpen(false); window.location.reload(); }} className={`text-xs ${i18n.language === 'zh' ? 'text-rose-500 font-bold' : 'text-stone-500'}`}>中文</button>
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
          <p className="text-stone-200 font-bold tracking-widest text-sm mb-4">{settings.footer_text || 'TRASOCHY · 传诗奇'}</p>
          <p className="mb-2">{settings.site_slogan || '高端护肤 · 臻致美肌'}</p>
          <div className="flex justify-center gap-8 mb-6">
            <Link to="/about" className="text-stone-500 hover:text-stone-300 transition-colors">关于我们</Link>
            {settings.feature_company_intro === '1' && (
              <Link to="/brand-story" className="text-stone-500 hover:text-stone-300 transition-colors">品牌与技术</Link>
            )}
            <Link to="/contact" className="text-stone-500 hover:text-stone-300 transition-colors">联系方式</Link>
            <Link to="/delivery" className="text-stone-500 hover:text-stone-300 transition-colors">配送说明</Link>
            <Link to="/privacy" className="text-stone-500 hover:text-stone-300 transition-colors">隐私政策</Link>
          </div>
          <p className="text-stone-600">© {new Date().getFullYear()} TRASOCHY. All rights reserved.</p>
        </div>
      </footer>
      {settings.feature_ai_chatbot === '1' && <AIChatbot />}
    </div>
  );
}
