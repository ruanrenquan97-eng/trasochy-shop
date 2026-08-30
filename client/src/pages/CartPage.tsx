import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Trash2, Plus, Minus, ShoppingBag, Check, Gift, ClipboardList } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import type { CartItem } from '../types';
import { useTranslation } from 'react-i18next';

export default function CartPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const [updating, setUpdating] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

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
      setSelectedIds(prev => { const next = new Set(prev); next.delete(itemId); return next; });
      toast.success('Removed');
    } catch (e: any) { toast.error(e.message); }
  };

  const items: CartItem[] = cartData?.items || [];
  const total: number = cartData?.total || 0;
  const subtotal: number = cartData?.subtotal || total;
  const promoDiscount: number = cartData?.promoDiscount || 0;

  const selectedItems = useMemo(
    () => items.filter(i => selectedIds.has(i.id)),
    [items, selectedIds]
  );

  const selectedSubtotal = useMemo(
    () => selectedItems.reduce((sum, i) => sum + i.subtotal, 0),
    [selectedItems]
  );

  // 按比例分配 promoDiscount
  const selectedTotal = useMemo(() => {
    if (subtotal === 0) return 0;
    const ratio = selectedSubtotal / subtotal;
    const allocatedDiscount = promoDiscount * ratio;
    return Math.max(0, selectedSubtotal - allocatedDiscount);
  }, [selectedSubtotal, subtotal, promoDiscount]);

  const allSelected = items.length > 0 && selectedIds.size === items.length;

  const toggleItem = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map(i => i.id)));
    }
  };

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
        <p className="text-xs text-stone-400 mt-1 tracking-wider uppercase">
          {selectedItems.length} / {items.length} {items.length === 1 ? t('cart.item', 'item') : t('cart.items', 'items')}
        </p>
      </div>

      <div className="grid md:grid-cols-[1fr_320px] gap-8">
        {/* 商品列表 */}
        <div className="space-y-4">
          {/* 全选栏 */}
          <div className="flex items-center gap-3 px-2 mb-1">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                allSelected ? 'bg-stone-900 border-stone-900' : 'border-stone-300 hover:border-stone-500'
              }`}>
                {allSelected && <Check size={12} className="text-white" />}
              </div>
              <input type="checkbox" checked={allSelected} onChange={toggleAll} className="hidden" />
              <span className="text-xs text-stone-500 tracking-wider uppercase">
                {allSelected ? '取消全选' : '全选'}
              </span>
            </label>
          </div>

          {items.map(item => {
            const isSelected = selectedIds.has(item.id);
            return (
              <div key={item.id} className={`card p-5 flex gap-4 transition-colors ${isSelected ? 'border-stone-300' : 'border-stone-200 bg-stone-50/50'}`}>
                {/* 勾选框 */}
                <div className="flex items-center flex-shrink-0">
                  <label className="cursor-pointer">
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                      isSelected ? 'bg-stone-900 border-stone-900' : 'border-stone-300 hover:border-stone-500'
                    }`}>
                      {isSelected && <Check size={12} className="text-white" />}
                    </div>
                    <input type="checkbox" checked={isSelected} onChange={() => toggleItem(item.id)} className="hidden" />
                  </label>
                </div>

                {/* 商品图片 */}
                <div className="w-24 h-24 bg-stone-50 overflow-hidden flex-shrink-0">
                  {item.main_image ? (
                    <img src={item.main_image} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-stone-200 text-2xl">◆</div>
                  )}
                </div>

                {/* 商品信息 */}
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
            );
          })}
        </div>

        {/* 结算卡片 */}
        <div>
          <div className="card p-6 sticky top-20">
            <h2 className="text-xs font-semibold text-stone-900 mb-5 tracking-widest uppercase">{t('cart.summary', 'Order Summary')}</h2>

            {/* 选中的商品列表 */}
            <div className="space-y-3 text-xs mb-5">
              {selectedItems.length === 0 ? (
                <p className="text-stone-400 text-xs italic">请勾选需要结算的商品</p>
              ) : (
                selectedItems.map(item => (
                  <div key={item.id} className="flex justify-between text-stone-500">
                    <span className="line-clamp-1 flex-1 mr-3 tracking-wider uppercase">{item.name} ×{item.quantity}</span>
                    <span className="tracking-wider">¥{item.subtotal.toFixed(2)}</span>
                  </div>
                ))
              )}
            </div>

            {/* 金额统计 */}
            <div className="border-t border-stone-200 pt-4 mb-5 space-y-2">
              <div className="flex justify-between items-baseline">
                <span className="text-xs text-stone-400 tracking-widest uppercase">
                  {t('cart.subtotal', 'Subtotal')} ({selectedItems.length} 件)
                </span>
                <span className="text-sm font-medium text-stone-600">¥{selectedSubtotal.toFixed(2)}</span>
              </div>
              {promoDiscount > 0 && selectedItems.length > 0 && (
                <div className="flex justify-between items-baseline">
                  <span className="text-xs text-rose-500 tracking-widest uppercase">{t('cart.promo_discount', 'Promotion Discount')}</span>
                  <span className="text-sm font-medium text-rose-500">-¥{(promoDiscount * selectedSubtotal / subtotal).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between items-baseline pt-2 border-t border-stone-100">
                <span className="text-xs text-stone-400 tracking-widest uppercase">{t('cart.total', 'Total')}</span>
                <span className="text-xl font-semibold text-stone-900">¥{selectedTotal.toFixed(2)}</span>
              </div>
            </div>

            {/* 瑞士苏黎世大学调研领券提示卡片 */}
            <div className={`mb-4 rounded-xl p-4 text-left border transition-all ${
              items.length >= 2 && items.length <= 3
                ? 'bg-emerald-50/90 border-emerald-300 ring-2 ring-emerald-400/30'
                : 'bg-gradient-to-br from-amber-50 to-orange-50/60 border-amber-200/80'
            }`}>
              <div className="flex items-center justify-between gap-1.5 text-xs mb-1.5">
                <span className={`font-semibold flex items-center gap-1.5 ${
                  items.length >= 2 && items.length <= 3 ? 'text-emerald-800' : 'text-amber-800'
                }`}>
                  <Gift className={`w-4 h-4 shrink-0 ${items.length >= 2 && items.length <= 3 ? 'text-emerald-600' : 'text-amber-600'}`} />
                  <span>苏黎世大学学术实验专享福利</span>
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  items.length >= 2 && items.length <= 3
                    ? 'bg-emerald-200/80 text-emerald-900'
                    : 'bg-amber-200/70 text-amber-900'
                }`}>
                  已挑选 {items.length} 款商品
                </span>
              </div>

              <p className={`text-[11px] leading-relaxed mb-3 ${
                items.length >= 2 && items.length <= 3 ? 'text-emerald-900 font-medium' : 'text-amber-900/80'
              }`}>
                {items.length >= 2 && items.length <= 3
                  ? '🎯 恭喜！您已成功挑选 2~3 款心仪产品，已达成实验任务要求！请点击下方按钮填写体验问卷，立领专属代金券！'
                  : items.length === 1
                  ? '💡 实验提示：建议挑选 2~3 款心仪产品加入购物车（当前已加购 1 款）。选品完成后即可点击下方按钮完成问卷。'
                  : '已选好商品？完成购物体验调查问卷，立领<b>专属代金券</b>直接抵扣本单！'}
              </p>

              <button
                type="button"
                onClick={() => navigate('/survey')}
                className={`w-full py-2.5 px-3 font-bold rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm ${
                  items.length >= 2 && items.length <= 3
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white animate-bounce-short'
                    : 'bg-amber-500 hover:bg-amber-400 text-stone-950'
                }`}
              >
                <ClipboardList size={14} /> 完成问卷调查，领取专属代金券 →
              </button>
            </div>

            <button
              onClick={() => {
                if (selectedItems.length === 0) {
                  toast.error('请至少勾选一件商品');
                  return;
                }
                navigate('/checkout', {
                  state: {
                    selectedIds: Array.from(selectedIds),
                  }
                });
              }}
              className="w-full btn-primary"
            >
              {t('cart.checkout', 'Checkout')} ({selectedItems.length})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
