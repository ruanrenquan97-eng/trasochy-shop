import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ShoppingBag, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { ORDER_STATUS_LABELS } from '../types';
import type { Order } from '../types';
import { useTranslation } from 'react-i18next';

export default function OrdersPage() {
  const { t } = useTranslation();
  
  const STATUS_TABS = [
    { value: 'all', label: t('orders.tabs.all', '全部') },
    { value: 'pending', label: t('orders.tabs.pending', '待付款') },
    { value: 'paid', label: t('orders.tabs.paid', '已付款') },
    { value: 'shipped', label: t('orders.tabs.shipped', '已发货') },
    { value: 'delivered', label: t('orders.tabs.delivered', '已收货') },
    { value: 'cancelled', label: t('orders.tabs.cancelled', '已取消') },
  ];

  const [statusFilter, setStatusFilter] = useState('all');
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['my-orders', statusFilter],
    queryFn: () => api.get(`/orders/my?status=${statusFilter}&limit=20`),
  }) as any;

  const queryClient = useQueryClient();

  const handleCancel = async (orderNo: string) => {
    if (!confirm(t('orders.confirm_cancel', '确认取消此订单？'))) return;
    setCancellingId(orderNo);
    try {
      await api.post(`/orders/${orderNo}/cancel`);
      toast.success(t('orders.cancel_success', '订单已取消'));
      refetch();
    } catch (e: any) { toast.error(e.message); }
    finally { setCancellingId(null); }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-xl font-medium text-stone-700 mb-6">{t('orders.title', '我的订单')}</h1>

      {/* 状态筛选标签 */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-5">
        {STATUS_TABS.map(tab => (
          <button
            key={tab.value}
            onClick={() => setStatusFilter(tab.value)}
            className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm transition-colors ${statusFilter === tab.value ? 'bg-stone-900 text-white' : 'bg-white border border-stone-200 text-stone-600 hover:border-stone-400'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="text-center text-stone-400 py-10">{t('orders.loading', '加载中...')}</div>
      ) : data?.orders?.length > 0 ? (
        <div className="space-y-4">
          {data.orders.map((order: Order) => (
            <div key={order.id} className="card p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <span className="text-sm font-medium text-stone-700">{order.order_no}</span>
                  <span className="text-xs text-stone-400 ml-3">{new Date(order.created_at).toLocaleString('zh-CN')}</span>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                  order.status === 'delivered' ? 'bg-green-50 text-green-600' :
                  order.status === 'cancelled' ? 'bg-stone-100 text-stone-500' :
                  order.status === 'shipped' ? 'bg-blue-50 text-blue-600' :
                  'bg-amber-50 text-amber-600'
                }`}>
                  {t(`profile.orders.status.${order.status}`, ORDER_STATUS_LABELS[order.status])}
                </span>
              </div>

              {/* 商品列表 */}
              <div className="space-y-2 mb-3">
                {order.items?.map(item => (
                  <div key={item.id} className="flex items-center gap-3 text-sm">
                    <div className="w-10 h-10 bg-stone-50 rounded-lg overflow-hidden flex-shrink-0">
                      {item.product_image ? (
                        <img src={item.product_image} alt={item.product_name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-stone-200">◆</div>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-stone-700 line-clamp-1">{item.product_name}</p>
                      <p className="text-stone-400 text-xs">¥{item.unit_price.toFixed(2)} x {item.quantity}</p>
                    </div>
                    <span className="text-stone-600">¥{item.subtotal.toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between border-t border-stone-100 pt-3">
                <span className="text-sm text-stone-500">{t('orders.recipient', '收货：')}{order.recipient_name} {order.recipient_phone}</span>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-rose-500">¥{order.pay_amount?.toFixed(2)}</span>
                  {['pending', 'paid'].includes(order.status) && (
                    <button
                      onClick={() => handleCancel(order.order_no)}
                      disabled={cancellingId === order.order_no}
                      className="text-xs text-stone-400 hover:text-rose-500 transition-colors border border-stone-200 px-2 py-1 rounded-lg"
                    >
                      {t('orders.cancel_btn', '取消订单')}
                    </button>
                  )}
                  {order.status === 'delivered' && (
                    <Link to={`/products/${order.items?.[0]?.product_id || ''}`}
                      className="text-xs text-stone-400 hover:text-stone-900 transition-colors border border-stone-200 px-2 py-1 rounded-lg flex items-center gap-1">
                      <Star size={12} /> {t('orders.review', '去评价')}
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 text-stone-400">
          <ShoppingBag size={40} className="mx-auto mb-3 text-stone-200" />
          <p>{t('orders.empty', '暂无订单记录')}</p>
          <Link to="/products" className="text-rose-400 text-sm hover:underline mt-2 block">{t('orders.shop', '去选购商品')}</Link>
        </div>
      )}
    </div>
  );
}
