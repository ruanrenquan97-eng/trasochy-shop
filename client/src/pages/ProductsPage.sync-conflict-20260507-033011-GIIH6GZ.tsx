import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '../utils/api';
import { useAuthStore } from '../contexts/authStore';
import type { Product, Category } from '../types';
import { Filter, Sparkles, Droplets } from 'lucide-react';

const SKIN_TYPES = ['干性', '油性', '中性', '混合性', '敏感肌'];
const CONCERNS = ['抗老', '美白', '保湿', '祛痘', '修护', '提亮', '舒缓'];

function ProductCard({ product }: { product: Product }) {
  const { t } = useTranslation();
  return (
    <Link to={`/products/${product.slug}`} className="card hover:shadow-lg transition-all duration-300 group cursor-pointer">
      <div className="aspect-square bg-stone-50 overflow-hidden">
        {product.main_image ? (
          <img src={product.main_image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-stone-200 text-4xl">◆</div>
        )}
      </div>
      <div className="p-5">
        <p className="text-xs text-stone-400 mb-2 tracking-widest uppercase">{product.category_name}</p>
        <h3 className="text-sm font-medium text-stone-800 line-clamp-2 leading-snug mb-3">{product.name}</h3>
        <div className="flex items-center justify-between">
          <span className="text-stone-900 font-semibold">¥{product.price.toFixed(2)}</span>
          {product.stock === 0 && <span className="text-xs text-stone-400 uppercase tracking-wider">{t('products.sold_out', 'Sold Out')}</span>}
          {product.stock > 0 && product.stock < 10 && <span className="text-xs text-amber-500 uppercase tracking-wider">{t('products.low_stock', 'Low Stock')}</span>}
        </div>
      </div>
    </Link>
  );
}

export default function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuthStore();
  const [page, setPage] = useState(1);
  const { t } = useTranslation();

  const category = searchParams.get('category') || '';
  const keyword = searchParams.get('keyword') || '';
  const isBundle = searchParams.get('bundle') || '';
  const skinType = searchParams.get('skinType') || '';
  const concern = searchParams.get('concern') || '';
  const sort = searchParams.get('sort') || 'sort_order';

  const { data: settings } = useQuery({
    queryKey: ['site-settings'],
    queryFn: () => api.get('/settings'),
  }) as any;
  const isFilterEnabled = settings?.feature_skin_concern_filter === '1';

  const { data: productsData, isLoading } = useQuery({
    queryKey: ['products', category, isBundle, skinType, concern, keyword, sort, page, user?.level],
    queryFn: () => {
      const params: any = { category, bundle: isBundle, keyword, sort, page: String(page), limit: '12' };
      if (skinType) params.skinType = skinType;
      if (concern) params.concern = concern;
      return api.get(`/products?${new URLSearchParams(params).toString()}`);
    },
  }) as any;

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get('/products/categories/list'),
  }) as any;

  const totalPages = Math.ceil((productsData?.total || 0) / 12);

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <div className="grid md:grid-cols-[180px_1fr] gap-10">
        {/* 侧边过滤器 */}
        <aside>
          <h3 className="text-xs font-semibold text-stone-900 mb-5 tracking-widest uppercase flex items-center gap-2">
            <Filter size={14} /> {t('products.categories', 'Categories')}
          </h3>
          <div className="flex flex-col gap-1">
            <button
              onClick={() => { setSearchParams({}); setPage(1); }}
              className={`text-xs px-3 py-2.5 text-left tracking-wider uppercase transition-colors ${!category ? 'bg-stone-900 text-white' : 'text-stone-500 hover:text-stone-900'}`}
            >
              {t('products.all', 'All')}
            </button>
            {categories?.map((cat: Category) => (
              <button
                key={cat.slug}
                onClick={() => { setSearchParams({ category: cat.slug }); setPage(1); }}
                className={`text-xs px-3 py-2.5 text-left tracking-wider uppercase transition-colors ${category === cat.slug ? 'bg-stone-900 text-white' : 'text-stone-500 hover:text-stone-900'}`}
              >
                {cat.name}
              </button>
            ))}
            <button
              onClick={() => { setSearchParams({ bundle: '1' }); setPage(1); }}
              className={`text-xs px-3 py-2.5 text-left tracking-wider uppercase transition-colors ${isBundle === '1' ? 'bg-stone-900 text-white' : 'text-stone-500 hover:text-stone-900'}`}
            >
              {t('products.bundle', '组合套装')}
            </button>
          </div>

          {isFilterEnabled && (
            <>
              <h3 className="text-xs font-semibold text-stone-900 mb-3 mt-8 tracking-widest uppercase flex items-center gap-2">
                <Droplets size={14} /> {t('products.skin_type', 'Skin Type')}
              </h3>
              <div className="flex flex-wrap gap-2 mb-6">
                {SKIN_TYPES.map(type => (
                  <button
                    key={type}
                    onClick={() => {
                      const p = new URLSearchParams(searchParams);
                      if (skinType === type) p.delete('skinType'); else p.set('skinType', type);
                      setSearchParams(p);
                      setPage(1);
                    }}
                    className={`text-xs px-3 py-1.5 border rounded-full transition-colors ${skinType === type ? 'bg-stone-900 text-white border-stone-900' : 'text-stone-600 border-stone-200 hover:border-stone-400'}`}
                  >
                    {t(`skin_type.${type}`, type)}
                  </button>
                ))}
              </div>

              <h3 className="text-xs font-semibold text-stone-900 mb-3 mt-4 tracking-widest uppercase flex items-center gap-2">
                <Sparkles size={14} /> {t('products.concerns', 'Concerns')}
              </h3>
              <div className="flex flex-wrap gap-2">
                {CONCERNS.map(type => (
                  <button
                    key={type}
                    onClick={() => {
                      const p = new URLSearchParams(searchParams);
                      if (concern === type) p.delete('concern'); else p.set('concern', type);
                      setSearchParams(p);
                      setPage(1);
                    }}
                    className={`text-xs px-3 py-1.5 border rounded-full transition-colors ${concern === type ? 'bg-stone-900 text-white border-stone-900' : 'text-stone-600 border-stone-200 hover:border-stone-400'}`}
                  >
                    {t(`concern.${type}`, type)}
                  </button>
                ))}
              </div>
            </>
          )}
        </aside>

        {/* 主内容 */}
        <div>
          {/* 工具栏 */}
          <div className="flex items-center justify-between mb-8 pb-4 border-b border-stone-200">
            <div className="text-xs text-stone-400 tracking-wider uppercase">
              {keyword && <span>{t('products.search_results', 'Search "{{keyword}}" — ', { keyword })}</span>}
              {t('products.count', '{{count}} products', { count: productsData?.total || 0 })}
            </div>
            <select
              value={sort}
              onChange={e => setSearchParams(prev => { const p = new URLSearchParams(prev); p.set('sort', e.target.value); return p; })}
              className="text-xs border border-stone-300 px-3 py-2 focus:outline-none focus:border-stone-900 tracking-wider uppercase bg-white"
            >
              <option value="sort_order">{t('products.sort_default', 'Default')}</option>
              <option value="newest">{t('products.sort_newest', 'Newest')}</option>
              <option value="price_asc">{t('products.sort_price_asc', 'Price: Low to High')}</option>
              <option value="price_desc">{t('products.sort_price_desc', 'Price: High to Low')}</option>
            </select>
          </div>

          {/* 商品网格 */}
          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
              {Array(6).fill(0).map((_, i) => (
                <div key={i} className="card animate-pulse">
                  <div className="aspect-square bg-stone-100" />
                  <div className="p-5 space-y-3">
                    <div className="h-2 bg-stone-100 rounded w-1/3" />
                    <div className="h-4 bg-stone-100 rounded" />
                    <div className="h-3 bg-stone-100 rounded w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : productsData?.items?.length > 0 ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
                {productsData.items.map((product: Product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
              {/* 分页 */}
              {totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-12">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`w-8 h-8 text-xs tracking-wider uppercase transition-colors ${p === page ? 'bg-stone-900 text-white' : 'border border-stone-300 text-stone-500 hover:border-stone-900'}`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-24 text-stone-400">
              <p className="text-sm uppercase tracking-widest">{t('products.no_products', 'No products found')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
