import { useState, useEffect } from 'react';
import { ArrowLeft, ShoppingCart, Plus, Minus, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useTranslation } from "react-i18next";

interface StoryProductLayoutProps {
  product: any;
  settings?: any;
  onAddToCart: (quantity: number) => Promise<void>;
  adding: boolean;
}

export default function StoryProductLayout({ product, settings, onAddToCart, adding }: StoryProductLayoutProps) {
    const { t } = useTranslation();
  const navigate = useNavigate();
  const [quantity, setQuantity] = useState(1);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const price = product.price ?? product.base_price;
  const oldPrice = product.price && product.price < product.base_price ? product.base_price : null;

  // 整理图片：主图 + 轮播图 + 详情图
  const images = [];
  if (product.main_image) images.push(product.main_image);
  if (product.images) {
    try {
      const parsed = JSON.parse(product.images);
      if (Array.isArray(parsed)) images.push(...parsed);
    } catch (e) {}
  }
  
  const beforeAfterImages = [];
  if (product.before_after_images) {
    try {
      const parsed = JSON.parse(product.before_after_images);
      if (Array.isArray(parsed)) beforeAfterImages.push(...parsed);
    } catch (e) {}
  }

  return (
    <div className="bg-black text-stone-100 min-h-screen font-serif tracking-wide pb-32">
      {/* 顶部透明导航 */}
      <nav className={`fixed top-0 w-full z-50 transition-colors duration-500 ${scrolled ? 'bg-black/80 backdrop-blur-md border-b border-white/10' : 'bg-transparent'}`}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="text-white/80 hover:text-white transition-colors flex items-center gap-2">
            <ArrowLeft size={20} />
            <span className="text-xs uppercase tracking-[0.2em]">Back</span>
          </button>
          <div className="text-sm font-semibold tracking-[0.3em] uppercase text-white/90">
            {product.name}
          </div>
          <div className="w-10"></div>
        </div>
      </nav>

      {/* 首屏大视觉 */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img src={images[0] || ''} alt={product.name} className="w-full h-full object-cover opacity-60 scale-105 animate-[pulse_10s_ease-in-out_infinite_alternate]" style={{ filter: 'brightness(0.7)' }} />
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black"></div>
        </div>
        <div className="relative z-10 text-center max-w-4xl px-6">
          <p className="text-rose-400 text-sm md:text-base tracking-[0.4em] mb-4 uppercase">The Signature Collection</p>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-light mb-6 leading-tight">
            {product.name}
          </h1>
          <p className="text-lg md:text-xl text-white/70 font-sans font-light max-w-2xl mx-auto leading-relaxed">
            {product.description}
          </p>
        </div>
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce text-white/50">
          <span className="block text-xs uppercase tracking-widest mb-2">Discover</span>
          <div className="w-[1px] h-10 bg-white/50 mx-auto"></div>
        </div>
      </section>

      {/* 视差滚动详情区 */}
      <section className="max-w-5xl mx-auto px-6 py-24 md:py-32 space-y-32">
        {/* 产品介绍 */}
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <div className="order-2 md:order-1 space-y-8">
            <h2 className="text-3xl md:text-4xl font-light leading-tight">{t('auto_storyproductlayout_361', t('auto_storyproductlayout_361', '科学与艺术的巧妙融合'))}</h2>
            <div className="w-12 h-[1px] bg-rose-500"></div>
            <div 
              className="text-white/60 font-sans leading-relaxed space-y-4 text-sm md:text-base prose prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: product.detail || product.description }}
            />
          </div>
          <div className="order-1 md:order-2">
            <div className="aspect-[4/5] overflow-hidden rounded-sm">
              <img src={images[1] || images[0]} alt="" className="w-full h-full object-cover hover:scale-105 transition-transform duration-700" />
            </div>
          </div>
        </div>

        {/* 核心成分展示 */}
        {settings?.feature_ingredient_glossary === '1' && product.ingredients && product.ingredients.length > 0 && (
          <div className="text-center space-y-12">
            <h2 className="text-3xl font-light">{t('auto_storyproductlayout_362', t('auto_storyproductlayout_362', '匠心凝萃 · 核心力量'))}</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
              {product.ingredients.map((ing: any, i: number) => (
                <div key={ing.id} className="bg-white/5 border border-white/10 p-8 hover:bg-white/10 transition-colors">
                  <div className="w-10 h-10 border border-rose-400/50 flex items-center justify-center rounded-full mb-6 text-rose-400">
                    {i + 1}
                  </div>
                  <h3 className="text-xl font-medium mb-1">{ing.name}</h3>
                  {ing.inci_name && <p className="text-xs text-rose-400/80 mb-3 font-mono">{ing.inci_name}</p>}
                  <p className="text-sm text-white/50 font-sans leading-relaxed">
                    {ing.description || ing.benefits || t('auto_storyproductlayout_365', '深入肌底，唤醒肌肤原生力。')}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 使用效果对比 (如果有) */}
        {beforeAfterImages.length > 0 && (
          <div className="space-y-12">
             <div className="text-center">
              <h2 className="text-3xl font-light mb-4">{t('auto_storyproductlayout_363', t('auto_storyproductlayout_363', '真实见证的焕变'))}</h2>
              <p className="text-white/50 font-sans">{t('auto_storyproductlayout_364', t('auto_storyproductlayout_364', '坚持使用，感受肌肤的细微改善'))}</p>
             </div>
             <div className="grid md:grid-cols-2 gap-8">
               {beforeAfterImages.map((img: string, idx: number) => (
                 <div key={idx} className="aspect-video relative overflow-hidden group">
                   <img src={img} alt="Before & After" className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" />
                   <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors"></div>
                   <div className="absolute bottom-4 left-4 bg-black/50 backdrop-blur-sm px-3 py-1 text-xs uppercase tracking-widest text-white">
                     Day {idx * 14 + 14}
                   </div>
                 </div>
               ))}
             </div>
          </div>
        )}
      </section>

      {/* 底部固定购买栏 */}
      <div className="fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur-xl border-t border-white/10 z-50 transform translate-y-0 transition-transform">
        <div className="max-w-7xl mx-auto px-6 h-24 flex items-center justify-between">
          <div className="flex-1 hidden md:block">
            <h3 className="font-semibold tracking-widest uppercase text-sm">{product.name}</h3>
            <p className="text-xs text-white/50 mt-1">{product.description?.substring(0, 50)}...</p>
          </div>
          
          <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end">
            <div className="text-right">
              <div className="flex items-baseline gap-2 justify-end">
                <span className="text-2xl font-light">¥{price.toFixed(2)}</span>
                {oldPrice && (
                  <span className="text-sm text-white/40 line-through">¥{oldPrice.toFixed(2)}</span>
                )}
              </div>
              <p className="text-[10px] text-white/40 tracking-widest uppercase mt-1">Free Shipping Included</p>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center border border-white/20 rounded-full overflow-hidden">
                <button 
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="px-4 py-3 text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <Minus size={14} />
                </button>
                <span className="w-8 text-center text-sm font-sans">{quantity}</span>
                <button 
                  onClick={() => setQuantity(quantity + 1)}
                  className="px-4 py-3 text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <Plus size={14} />
                </button>
              </div>

              <button
                onClick={() => onAddToCart(quantity)}
                disabled={adding || product.stock <= 0}
                className="bg-white text-black px-8 py-3.5 rounded-full text-xs font-semibold uppercase tracking-widest hover:bg-stone-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {adding ? 'PROCESSING...' : product.stock > 0 ? 'ADD TO CART' : 'SOLD OUT'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
