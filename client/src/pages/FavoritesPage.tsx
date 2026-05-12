import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Heart, Trash2, ShoppingBag } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../contexts/authStore';
import { useTranslation } from "react-i18next";

export default function FavoritesPage() {
    const { t } = useTranslation();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const { data: favorites, isLoading } = useQuery({
    queryKey: ['favorites'],
    queryFn: () => api.get('/favorites'),
    enabled: !!user,
  }) as any;

  const handleRemove = async (productId: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await api.delete(`/favorites/${productId}`);
      toast.success(t('auto_productdetailpage_232', '已取消收藏'));
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-xl font-medium text-stone-700 mb-6 flex items-center gap-2">
        <Heart size={20} className="text-rose-400" /> {t('auto_shoplayout_346', '我的收藏')}
      </h1>

      {isLoading ? (
        <div className="text-center py-10 text-stone-400">{t('auto_staticpage_313', t('auto_staticpage_313', '加载中...'))}</div>
      ) : favorites?.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
          {favorites.map((item: any) => (
            <Link to={`/products/${item.slug}`} key={item.favorite_id} className="card hover:shadow-lg transition-all duration-300 group relative">
              <button
                onClick={(e) => handleRemove(item.id, e)}
                className="absolute top-3 right-3 z-10 w-8 h-8 bg-white/80 backdrop-blur-sm flex items-center justify-center rounded-full text-rose-400 hover:text-rose-600 hover:bg-white shadow-sm transition-all"
              >
                <Heart size={16} fill="currentColor" />
              </button>
              <div className="aspect-square bg-stone-50 overflow-hidden">
                {item.main_image ? (
                  <img src={item.main_image} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-stone-200 text-4xl">◆</div>
                )}
              </div>
              <div className="p-4">
                <p className="text-xs text-stone-400 mb-1.5 tracking-widest uppercase">{item.category_name}</p>
                <h3 className="text-sm font-medium text-stone-800 line-clamp-2 leading-snug mb-2">{item.name}</h3>
                <div className="flex items-center justify-between">
                  <span className="text-stone-900 font-semibold text-sm">¥{item.price.toFixed(2)}</span>
                  {item.stock === 0 && <span className="text-xs text-stone-400">{t('auto_productdetailpage_240', t('auto_productdetailpage_240', '已售罄'))}</span>}
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 text-stone-400">
          <Heart size={40} className="mx-auto mb-3 text-stone-200" />
          <p className="text-sm mb-1">{t('auto_favoritespage_119', t('auto_favoritespage_119', '暂无收藏商品'))}</p>
          <Link to="/products" className="text-rose-400 text-sm hover:underline mt-2 block">
            {t('auto_favoritespage_120', '去发现好物')}
          </Link>
        </div>
      )}
    </div>
  );
}
