import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../utils/api';
import { useAuthStore } from '../contexts/authStore';
import type { Product, Category } from '../types';
import {
  ShieldCheck, Star, Leaf, Droplets, Sparkles, Award,
  ArrowRight, ChevronRight, Heart, ShoppingBag, X
} from 'lucide-react';

/* ──────────── 滚动触发动画 Hook ──────────── */
function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('visible');
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return ref;
}

function RevealSection({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const ref = useReveal();
  return <div ref={ref} className={`reveal ${className}`}>{children}</div>;
}

/* ──────────── 商品卡片 ──────────── */
function ProductCard({ product, index }: { product: Product; index?: number }) {
  const [liked, setLiked] = useState(false);
  const delay = index ? `animation-delay: ${index * 0.1}s` : '';
  return (
    <Link
      to={`/products/${product.slug}`}
      className="card group cursor-pointer animate-fade-up"
      style={{ opacity: 0, animationFillMode: 'forwards', animationDelay: `${(index || 0) * 0.1}s` }}
    >
      {/* 图片区 */}
      <div className="aspect-[3/4] bg-gradient-to-b from-stone-100 to-stone-50 relative img-zoom">
        {product.main_image ? (
          <img
            src={product.main_image}
            alt={product.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Droplets size={48} className="text-stone-200" />
          </div>
        )}
        {/* 悬浮操作 */}
        <div className="absolute top-3 right-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
          <button
            onClick={(e) => { e.preventDefault(); setLiked(!liked); }}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${liked ? 'bg-rose-500 text-white' : 'bg-white/90 text-stone-500 hover:text-rose-500 hover:bg-white'}`}
          >
            <Heart size={15} fill={liked ? 'currentColor' : 'none'} />
          </button>
          <button
            onClick={(e) => e.preventDefault()}
            className="w-9 h-9 rounded-full bg-white/90 text-stone-500 hover:text-stone-900 hover:bg-white flex items-center justify-center transition-all"
          >
            <ShoppingBag size={15} />
          </button>
        </div>
        {/* 分类标签 */}
        {product.category_name && (
          <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm px-3 py-1 text-[10px] font-medium text-stone-600 tracking-widest uppercase">
            {product.category_name}
          </div>
        )}
      </div>
      {/* 信息区 */}
      <div className="p-5">
        <h3 className="text-sm font-medium text-stone-800 line-clamp-2 leading-snug mb-3 group-hover:text-stone-950 transition-colors">
          {product.name}
        </h3>
        <div className="flex items-center justify-between">
          <div>
            <span className="text-stone-900 font-semibold text-base">¥{product.price.toFixed(2)}</span>
            {product.discount < 1 && product.base_price > product.price && (
              <span className="text-xs text-stone-400 line-through ml-2">¥{product.base_price.toFixed(2)}</span>
            )}
          </div>
          <span className="w-7 h-7 rounded-full border border-stone-300 flex items-center justify-center text-stone-400 group-hover:bg-stone-900 group-hover:border-stone-900 group-hover:text-white transition-all duration-300">
            <ArrowRight size={12} />
          </span>
        </div>
      </div>
    </Link>
  );
}

/* ──────────── 分类卡片 ──────────── */
function CategoryCard({ cat, index }: { cat: Category; index: number }) {
  const gradients = [
    'from-rose-100 to-rose-50',
    'from-amber-100 to-amber-50',
    'from-sky-100 to-sky-50',
    'from-emerald-100 to-emerald-50',
    'from-violet-100 to-violet-50',
    'from-orange-100 to-orange-50',
  ];
  const icons = ['✿', '◎', '◇', '❋', '✦', '◈'];
  const linkTo = cat.slug === 'bundle' ? '/products?bundle=1' : `/products?category=${cat.slug}`;
  return (
    <Link
      to={linkTo}
      className="group relative bg-gradient-to-br rounded-lg p-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 cursor-pointer animate-fade-up"
      style={{ opacity: 0, animationFillMode: 'forwards', animationDelay: `${index * 0.1}s` }}
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${gradients[index % gradients.length]} opacity-60 group-hover:opacity-100 transition-opacity`} />
      <div className="relative z-10">
        <span className="text-3xl mb-3 block">{icons[index % icons.length]}</span>
        <h3 className="text-sm font-semibold text-stone-800 mb-1 tracking-wide">{cat.name}</h3>
        <p className="text-[11px] text-stone-500 flex items-center gap-1 group-hover:text-stone-700 transition-colors">
          <ChevronRight size={11} />
        </p>
      </div>
    </Link>
  );
}

/* ──────────── 统计数字 ──────────── */
function StatItem({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center px-6 py-5">
      <div className="text-2xl md:text-3xl font-light text-gradient-gold mb-1">{value}</div>
      <div className="text-[10px] text-stone-400 tracking-[0.2em] uppercase">{label}</div>
    </div>
  );
}

/* ──────────── 主页 ──────────── */
export default function HomePage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const { data: productsData } = useQuery({
    queryKey: ['home-products', user?.level],
    queryFn: () => api.get('/products?limit=8&sort=sort_order'),
  }) as any;

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get('/products/categories/list'),
  }) as any;

  // 读取网站设置
  const { data: settingsData } = useQuery({
    queryKey: ['site-settings-public'],
    queryFn: () => api.get('/settings'),
  }) as any;

  const settings: Record<string, string> = settingsData || {};

  const products = productsData?.items || [];

  const [showPromoModal, setShowPromoModal] = useState(false);
  useEffect(() => {
    if (settings.promo_modal_active === '1' && !sessionStorage.getItem('promoModalSeen')) {
      const timer = setTimeout(() => setShowPromoModal(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [settings.promo_modal_active]);

  const closePromoModal = () => {
    setShowPromoModal(false);
    sessionStorage.setItem('promoModalSeen', 'true');
  };

  return (
    <div className="overflow-hidden">
      {/* ═══════ 顶部促销公告栏 ═══════ */}
      {settings.promo_bar_active === '1' && settings.promo_bar_text && (
        <div 
          className="bg-stone-900 text-amber-400 text-xs py-2.5 px-4 text-center cursor-pointer hover:bg-stone-800 transition-colors relative z-20" 
          onClick={() => navigate(settings.promo_bar_link || '/products')}
        >
          <div className="flex items-center justify-center gap-2 max-w-7xl mx-auto">
            <Sparkles size={14} className="animate-pulse text-amber-500" />
            <span className="font-medium tracking-widest">{settings.promo_bar_text}</span>
            <ArrowRight size={14} className="text-amber-500 ml-1" />
          </div>
        </div>
      )}
      {/* ═══════ Hero 区域 ═══════ */}
      <section className="relative min-h-[90vh] flex items-center bg-stone-950 overflow-hidden">
        {/* 装饰背景 */}
        <div className="absolute inset-0">
          {/* 渐变光晕 */}
          <div className="absolute top-1/4 right-1/4 w-[500px] h-[500px] bg-gradient-radial rounded-full opacity-20"
               style={{ background: 'radial-gradient(circle, rgba(201,168,76,0.4) 0%, transparent 70%)' }} />
          <div className="absolute bottom-0 left-1/3 w-[400px] h-[400px] bg-gradient-radial rounded-full opacity-10"
               style={{ background: 'radial-gradient(circle, rgba(201,168,76,0.3) 0%, transparent 70%)' }} />
          {/* 网格纹理 */}
          <div className="absolute inset-0 opacity-[0.03]"
               style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
          {/* 浮动装饰 */}
          <div className="absolute top-20 right-20 w-32 h-32 border border-white/10 rounded-full animate-float" />
          <div className="absolute bottom-32 right-40 w-16 h-16 border border-amber-400/20 rounded-full animate-float" style={{ animationDelay: '1s' }} />
          <div className="absolute top-40 left-20 w-20 h-20 border border-white/5 rounded-full animate-float" style={{ animationDelay: '2s' }} />
        </div>

        <div className="max-w-7xl mx-auto px-6 w-full relative z-10 py-20">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            {/* 左侧文案 */}
            <div>
              <div className="animate-fade-up">
                <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass text-[11px] text-stone-300 tracking-widest uppercase mb-8">
                  <Sparkles size={12} className="text-amber-400" />
                  Premium Skincare
                </span>
              </div>

              <h1 className="animate-fade-up-delay-1 text-5xl md:text-7xl font-extralight text-white mb-4 leading-[1.05] tracking-tight"
                  dangerouslySetInnerHTML={{ __html: settings.hero_title ? settings.hero_title.replace(/<br\s*\/?>/gi, '<br/>').replace(/\n/g, '<br/>') : '发现<br/><span class="text-gradient-gold font-light">臻致美肌</span><br/>之力' }}
                />
              <p className="animate-fade-up-delay-2 text-stone-400 text-sm md:text-base leading-relaxed max-w-md mb-10 tracking-wide">
                {settings.hero_subtitle || '传诗奇——中国院线护肤专家，科学配方与天然成分的完美融合。从深层修护到焕颜抗衰，为每一寸肌肤带来高端定制护理体验。'}
              </p>

              <div className="animate-fade-up-delay-3 flex flex-wrap gap-4">
                <button onClick={() => navigate('/products')} className="btn-gold btn-shimmer px-8 py-3.5 text-xs tracking-widest">
                  {t('home.explore_all', '探索全部商品')}
                </button>
                {!user && (
                  <button onClick={() => navigate('/register')} className="glass text-white px-8 py-3.5 text-xs tracking-widest uppercase hover:bg-white/15 transition-all cursor-pointer rounded-sm">
                    {t('home.join_member', '立即加入会员')}
                  </button>
                )}
              </div>

              {/* 信任指标 */}
              <div className="animate-fade-up-delay-3 mt-14 flex items-center gap-8 text-stone-500 text-[11px] tracking-wider">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={14} className="text-amber-500/70" />
                  <span>正品保障</span>
                </div>
                <div className="flex items-center gap-2">
                  <Leaf size={14} className="text-amber-500/70" />
                  <span>天然成分</span>
                </div>
                <div className="flex items-center gap-2">
                  <Star size={14} className="text-amber-500/70" />
                  <span>万人好评</span>
                </div>
              </div>
            </div>

            {/* 右侧Banner图片 */}
            <div className="hidden md:block relative">
              <div className="animate-scale-in relative w-full aspect-square max-w-lg ml-auto">
                <img
                  src={settings.hero_banner ? (settings.hero_banner.startsWith('http') ? settings.hero_banner : `/uploads/products/hero_banner.jpeg`) : '/uploads/products/hero_banner.jpeg'}
                  alt={settings.site_name || '传诗奇'}
                  className="w-full h-full object-cover rounded-lg shadow-2xl"
                />
                {/* 底部玻璃卡片 */}
                <div className="absolute -bottom-4 -left-8 w-52 glass rounded-lg p-4">
                  <p className="text-[10px] text-stone-400 tracking-wider uppercase mb-1">院线专供</p>
                  <p className="text-white text-sm font-light">传诗奇护肤系列</p>
                  <div className="flex gap-1 mt-2">
                    {[1,2,3,4,5].map(i => <Star key={i} size={10} className="text-amber-400" fill="currentColor" />)}
                  </div>
                </div>
                <div className="absolute -top-4 -right-4 glass rounded-lg px-4 py-3">
                  <p className="text-[10px] text-stone-400 tracking-wider uppercase">用户满意度</p>
                  <p className="text-amber-400 text-xl font-light">98.6%</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 底部渐变过渡 */}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#fafaf8] to-transparent" />
      </section>

      {/* ═══════ 品牌标语跑马灯 ═══════ */}
      <section className="bg-stone-900 py-4 overflow-hidden">
        <div className="animate-marquee whitespace-nowrap flex">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="flex items-center gap-8 mx-4">
              {['科学配方', '天然成分', '高端品质', '焕颜修护', '温和亲肤', '品牌保障'].map(text => (
                <span key={`${text}-${i}`} className="text-[11px] text-stone-500 tracking-[0.3em] uppercase flex items-center gap-8">
                  <span>{text}</span>
                  <span className="text-amber-600/40">◆</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* ═══════ 品牌特色 ═══════ */}
      <RevealSection>
        <section className="max-w-7xl mx-auto px-6 py-20">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { icon: ShieldCheck, title: '全球独创透皮科技', desc: '第三代生物透皮技术，突破大分子吸收壁垒' },
              { icon: Award, title: '多项国际专利', desc: '中国及美国发明专利加持，FDA cGMP认证' },
              { icon: Droplets, title: '百万案例验证', desc: '1,000,000+ 肌肤管理案例，真实有效' },
              { icon: Sparkles, title: '真科研 真有效', desc: '中科大教授团队11年深耕，科学护肤方案' },
            ].map((f, i) => (
              <div
                key={f.title}
                className="text-center group py-8 px-4 hover:bg-white rounded-lg transition-all duration-300"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <div className="w-14 h-14 mx-auto mb-5 rounded-full bg-stone-100 group-hover:bg-amber-50 flex items-center justify-center transition-colors duration-300">
                  <f.icon size={22} className="text-stone-400 group-hover:text-amber-600 transition-colors duration-300" />
                </div>
                <h3 className="text-xs font-semibold text-stone-800 tracking-wider mb-2">{f.title}</h3>
                <p className="text-[11px] text-stone-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </RevealSection>

      {/* ═══════ 分类导航 ═══════ */}
      {categories?.length > 0 && (
        <RevealSection>
          <section className="max-w-7xl mx-auto px-6 pb-20">
            <div className="flex items-end justify-between mb-8">
              <div>
                <p className="text-[10px] text-stone-400 tracking-[0.3em] uppercase mb-2">Collections</p>
                <h2 className="text-2xl md:text-3xl font-light text-stone-900 tracking-tight">{t('home.explore_collections', '探索系列')}</h2>
              </div>
              <Link to="/products" className="hidden md:flex items-center gap-1 text-xs text-stone-400 hover:text-stone-900 tracking-wider transition-colors group">
                {t('common.view_all', '查看全部')} <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {categories.slice(0, 5).map((cat: Category, i: number) => (
                <CategoryCard key={cat.id} cat={cat} index={i} />
              ))}
              <CategoryCard key="bundle" cat={{ id: 999, name: '组合套装', slug: 'bundle' } as any} index={categories.length > 5 ? 5 : categories.length} />
            </div>
          </section>
        </RevealSection>
      )}

      {/* ═══════ 精选商品 ═══════ */}
      <RevealSection>
        <section className="bg-stone-100/50 py-20 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-end justify-between mb-10">
              <div>
                <p className="text-[10px] text-stone-400 tracking-[0.3em] uppercase mb-2">Best Sellers</p>
                <h2 className="text-2xl md:text-3xl font-light text-stone-900 tracking-tight">{t('home.best_sellers', '热销精选')}</h2>
              </div>
              <Link to="/products" className="hidden md:flex items-center gap-1 text-xs text-stone-400 hover:text-stone-900 tracking-wider transition-colors group">
                {t('common.view_more', '查看更多')} <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
            {products.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-5 md:gap-6">
                {products.slice(0, 8).map((product: Product, i: number) => (
                  <ProductCard key={product.id} product={product} index={i} />
                ))}
              </div>
            ) : (
              <div className="text-center py-20">
                <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-stone-200 flex items-center justify-center">
                  <Droplets size={20} className="text-stone-400" />
                </div>
                <p className="text-stone-400 text-sm tracking-wider">商品正在上架中...</p>
              </div>
            )}
          </div>
        </section>
      </RevealSection>

      {/* ═══════ 品牌故事 Banner ═══════ */}
      <RevealSection>
        <section className="max-w-7xl mx-auto px-6 py-20">
          <div className="relative bg-stone-900 rounded-xl overflow-hidden">
            {/* 品牌故事Banner图 */}
            {settings.brand_story_banner && (
              <img
                src={settings.brand_story_banner.startsWith('http') ? settings.brand_story_banner : `/uploads/products/${settings.brand_story_banner.replace(/^\/uploads\/products\//, '')}`}
                alt="品牌故事"
                className="absolute inset-0 w-full h-full object-cover opacity-30"
              />
            )}
            {/* 装饰 */}
            <div className="absolute top-0 right-0 w-1/2 h-full opacity-10"
                 style={{ background: 'radial-gradient(ellipse at right center, rgba(201,168,76,0.5) 0%, transparent 70%)' }} />
            <div className="absolute inset-0 opacity-[0.02]"
                 style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

            <div className="relative z-10 grid md:grid-cols-2 gap-12 p-10 md:p-16 items-center">
              <div>
                <p className="text-[10px] text-amber-400/60 tracking-[0.4em] uppercase mb-6">Our Philosophy</p>
                <h2 className="text-3xl md:text-4xl font-extralight text-white leading-relaxed mb-6 tracking-tight"
                  dangerouslySetInnerHTML={{ __html: settings.brand_story_title ? settings.brand_story_title.replace(/<br\s*\/?>/gi, '<br/>').replace(/\n/g, '<br/>') : '美丽不是追求完美，<br/><span class="text-gradient-gold">而是善待每一寸肌肤</span>' }}
                />
                <p className="text-stone-400 text-sm leading-relaxed mb-8">
                  {settings.brand_story_text || '传诗奇相信，真正的美丽源于科学的配方与自然的馈赠。我们甄选全球优质原料，融合尖端生物科技，为不同肤质量身定制护肤方案。每一款产品都经过严格测试，只为带给你安心、有效的护肤体验。'}
                </p>
                <button onClick={() => navigate('/products')} className="btn-gold btn-shimmer px-8 py-3 text-xs tracking-widest">
                  了解更多
                </button>
              </div>

              {/* 右侧统计数据 */}
              <div className="grid grid-cols-2 gap-4">
                <StatItem value="50+" label="优质产品" />
                <StatItem value="10万+" label="满意客户" />
                <StatItem value="98.6%" label="好评率" />
                <StatItem value="15+" label="独家专利" />
              </div>
            </div>
          </div>
        </section>
      </RevealSection>

      {/* ═══════ 会员专区 CTA ═══════ */}
      {!user && (
        <RevealSection>
          <section className="max-w-7xl mx-auto px-6 pb-20">
            <div className="relative bg-gradient-to-r from-amber-50 via-white to-rose-50 rounded-xl p-10 md:p-16 text-center border border-amber-100/50">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-40 bg-amber-200/20 rounded-full blur-3xl" />
              <div className="relative z-10">
                <Sparkles size={28} className="mx-auto text-amber-500/60 mb-6" />
                <h2 className="text-2xl md:text-3xl font-light text-stone-900 tracking-tight mb-3">
                  {settings.member_cta_title || '加入传诗奇，尊享会员特权'}
                </h2>
                <p className="text-stone-500 text-sm leading-relaxed max-w-lg mx-auto mb-8">
                  {settings.member_cta_text || '注册即享专属折扣、积分奖励、新品优先体验等多重会员权益。不同等级解锁更多惊喜，让美丽投资更有价值。'}
                </p>
                <div className="flex flex-wrap justify-center gap-6 text-xs text-stone-600 mb-10">
                  {[
                    { level: '普通会员', color: 'bg-blue-100 text-blue-700', discount: '95折' },
                    { level: '银卡会员', color: 'bg-slate-100 text-slate-600', discount: '9折' },
                    { level: '金卡会员', color: 'bg-amber-100 text-amber-700', discount: '85折' },
                  ].map(item => (
                    <div key={item.level} className="flex items-center gap-2">
                      <span className={`px-2.5 py-0.5 rounded text-[10px] font-medium ${item.color}`}>{item.level}</span>
                      <span className="text-stone-400">享{item.discount}优惠</span>
                    </div>
                  ))}
                </div>
                <button onClick={() => navigate('/register')} className="btn-gold btn-shimmer px-10 py-3.5 text-xs tracking-widest">
                  免费注册
                </button>
              </div>
            </div>
          </section>
        </RevealSection>
      )}

      {/* ═══════ 最近浏览/引导 ═══════ */}
      <RevealSection>
        <section className="max-w-7xl mx-auto px-6 pb-20">
          <div className="text-center py-12 border-t border-stone-200">
            <p className="text-[10px] text-stone-400 tracking-[0.3em] uppercase mb-3">Ready to Start?</p>
            <h2 className="text-xl font-light text-stone-800 tracking-tight mb-6">开启你的美肌之旅</h2>
            <button onClick={() => navigate('/products')} className="btn-primary btn-shimmer px-10 py-3.5 text-xs tracking-widest">
              浏览全部商品
            </button>
          </div>
        </section>
      </RevealSection>

      {/* ═══════ 首页大弹窗 ═══════ */}
      {showPromoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl overflow-hidden animate-scale-in">
            <button 
              onClick={closePromoModal}
              className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center bg-black/20 hover:bg-black/40 text-white rounded-full backdrop-blur-md transition-colors z-10"
            >
              <X size={18} />
            </button>
            <div className="cursor-pointer" onClick={() => { closePromoModal(); navigate(settings.promo_modal_link || '/products'); }}>
              {settings.promo_modal_image ? (
                <img 
                  src={settings.promo_modal_image.startsWith('http') ? settings.promo_modal_image : `${import.meta.env.VITE_API_URL || ''}${settings.promo_modal_image}`} 
                  alt="促销活动" 
                  className="w-full h-auto object-cover" 
                />
              ) : (
                <div className="p-12 text-center bg-gradient-to-br from-amber-50 to-rose-50">
                  <Sparkles size={48} className="mx-auto text-amber-500 mb-4" />
                  <h3 className="text-2xl font-semibold text-stone-800 mb-2">限时特惠活动</h3>
                  <p className="text-sm text-stone-500 mb-6">点击查看更多活动详情</p>
                  <button className="btn-gold px-8 py-2.5 text-sm rounded-full shadow-lg shadow-amber-500/20">立即前往</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
