import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Trash2, Plus, Minus, ShoppingBag } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import type { CartItem } from '../types';
import { useTranslation } from 'react-i18next';

export default function CartPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const [updating, setUpdating] = useState<number | null>(null);

  const { data: cartData, isLoading } = useQuery({
    queryKey: ['cart'],
    queryFn: () => api.get('/cart'),
  }) as any;

  const updateQty = async (itemId: number, quantity: number) => {
    setUpdating(itemId);
    try {
      await api.put(`/cart/${itemId}`, { quantity });
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    } catch (e: any) { toast.error(e.message); }
    finally { setUpdating(null); }
  };

  const removeItem = async (itemId: number) => {
    try {
      await api.delete(`/cart/${itemId}`);
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      toast.success('Removed');
    } catch (e: any) { toast.error(e.message); }
  };

  const items: CartItem[] = cartData?.items || [];
  const total: number = cartData?.total || 0;
  const subtotal: number = cartData?.subtotal || total;
  const promoDiscount: number = cartData?.promoDiscount || 0;

  if (isLoading) return <div className="max-w-5xl mx-auto px-6 py-24 text-center text-stone-400 text-xs tracking-widest uppercase">{t('common.loading', 'Loading...')}</div>;

  if (items.length === 0) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-32 text-center">
        <ShoppingBag size={48} className="mx-auto text-stone-200 mb-6" />
        <p className="text-stone-500 text-sm mb-2 tracking-wider uppercase">{t('cart.empty', 'Your cart is empty')}</p>
        <button onClick={() => navigate('/products')} className="btn-primary mt-4">{t('cart.browse', 'Browse Collection')}</button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <div className="mb-8 border-b border-stone-200 pb-4">
        <h1 className="text-2xl font-light text-stone-900 tracking-tight">{t('cart.title', 'Shopping Bag')}</h1>
        <p className="text-xs text-stone-400 mt-1 tracking-wider uppercase">{items.length} {items.length === 1 ? t('cart.item', 'item') : t('cart.items', 'items')}</p>
      </div>

      <div className="grid md:grid-cols-[1fr_320px] gap-8">
        {/* 商品列表 */}
        <div className="space-y-4">
          {items.map(item => (
            <div key={item.id} className="card p-5 flex gap-5">
              <div className="w-24 h-24 bg-stone-50 overflow-hidden flex-shrink-0">
                {item.main_image ? (
                  <img src={item.main_image} alt={item.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-stone-200 text-2xl">◆</div>
                )}
              </div>
              <div className="flex-1 min-w-0 flex flex-col justify-between">
                <div>
                  <p className="text-sm font-medium text-stone-800 line-clamp-1">{item.name}</p>
                  <p className="text-stone-900 font-semibold mt-1">¥{item.unit_price.toFixed(2)}</p>
                </div>
                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center border border-stone-300">
                    <button
                      onClick={() => updateQty(item.id, item.quantity - 1)}
                      disabled={item.quantity <= 1 || updating === item.id}
                      className="px-3 py-1.5 hover:bg-stone-50 text-stone-500 disabled:opacity-40"
                    >
                      <Minus size={12} />
                    </button>
                    <span className="w-10 text-center text-sm">{item.quantity}</span>
                    <button
                      onClick={() => updateQty(item.id, item.quantity + 1)}
                      disabled={item.quantity >= item.stock || updating === item.id}
                      className="px-3 py-1.5 hover:bg-stone-50 text-stone-500 disabled:opacity-40"
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-semibold text-stone-900">¥{item.subtotal.toFixed(2)}</span>
                    <button onClick={() => removeItem(item.id)} className="text-stone-300 hover:text-red-500 transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 结算卡片 */}
        <div>
          <div className="card p-6 sticky top-20">
            <h2 className="text-xs font-semibold text-stone-900 mb-5 tracking-widest uppercase">{t('cart.summary', 'Order Summary')}</h2>
            <div className="space-y-3 text-xs mb-5">
              {items.map(item => (
                <div key={item.id} className="flex justify-between text-stone-500">
                  <span className="line-clamp-1 flex-1 mr-3 tracking-wider uppercase">{item.name} ×{item.quantity}</span>
                  <span className="tracking-wider">¥{item.subtotal.toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-stone-200 pt-4 mb-5 space-y-2">
              <div className="flex justify-between items-baseline">
                <span className="text-xs text-stone-400 tracking-widest uppercase">{t('cart.subtotal', 'Subtotal')}</span>
                <span className="text-sm font-medium text-stone-600">¥{subtotal.toFixed(2)}</span>
              </div>
              {promoDiscount > 0 && (
                <div className="flex justify-between items-baseline">
                  <span className="text-xs text-rose-500 tracking-widest uppercase">{t('cart.promo_discount', 'Promotion Discount')}</span>
                  <span className="text-sm font-medium text-rose-500">-¥{promoDiscount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between items-baseline pt-2 border-t border-stone-100">
                <span className="text-xs text-stone-400 tracking-widest uppercase">{t('cart.total', 'Total')}</span>
                <span className="text-xl font-semibold text-stone-900">¥{total.toFixed(2)}</span>
              </div>
            </div>
            <button
              onClick={() => navigate('/checkout', { state: { items: items.map(i => ({ productId: i.product_id, quantity: i.quantity })), subtotal, promoDiscount, total } })}
              className="w-full btn-primary"
            >
              {t('cart.checkout', 'Checkout')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
