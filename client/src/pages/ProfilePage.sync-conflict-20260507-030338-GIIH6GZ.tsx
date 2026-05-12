import { useState } from 'react';
import { useAuthStore } from '../contexts/authStore';
import { LEVEL_LABELS, LEVEL_COLORS, ORDER_STATUS_LABELS } from '../types';
import { useQuery } from '@tanstack/react-query';
import api from '../utils/api';
import { Crown, Package, ShoppingBag, Heart, MapPin, Settings, Share2, CalendarSync } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

export default function ProfilePage() {
  const { user } = useAuthStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') || 'orders';
  const { t } = useTranslation();

  const TABS = [
    { key: 'orders', label: t('profile.tabs.orders', '最近订单'), icon: Package },
    { key: 'favorites', label: t('profile.tabs.favorites', '我的收藏'), icon: Heart },
    { key: 'address', label: t('profile.tabs.address', '收货地址'), icon: MapPin },
    { key: 'referrals', label: t('profile.tabs.referrals', '我的推荐'), icon: Share2 },
  ];

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.get('/settings'),
  }) as any;

  const { data: ordersData } = useQuery({
    queryKey: ['my-orders', user?.id],
    queryFn: () => api.get('/orders/my?limit=5'),
    enabled: !!user && tab === 'orders',
  }) as any;

  const { data: favorites } = useQuery({
    queryKey: ['favorites'],
    queryFn: () => api.get('/favorites'),
    enabled: !!user && tab === 'favorites',
  }) as any;

  const { data: addresses } = useQuery({
    queryKey: ['addresses'],
    queryFn: () => api.get('/addresses'),
    enabled: !!user && tab === 'address',
  }) as any;

  const { data: referrals } = useQuery({
    queryKey: ['referrals'],
    queryFn: () => api.get('/auth/me/referrals'),
    enabled: !!user && tab === 'referrals',
  }) as any;

  const { data: subscriptionsData, refetch: refetchSubscriptions } = useQuery({
    queryKey: ['subscriptions'],
    queryFn: () => api.get('/orders/subscriptions'),
    enabled: !!user && tab === 'subscriptions' && settings?.feature_subscriptions === '1',
  }) as any;

  if (!user) return null;

  const levelBenefits: Record<string, string[]> = {
    member: [t('profile.benefits.member.discount', '9折优惠'), t('profile.benefits.member.cs', '优先客服')],
    silver: [t('profile.benefits.silver.discount', '8折优惠'), t('profile.benefits.silver.shipping', '优先发货'), t('profile.benefits.silver.gift', '生日礼品')],
    gold: [t('profile.benefits.gold.discount', '7折专属价'), t('profile.benefits.gold.cs', 'VIP客服'), t('profile.benefits.gold.new', '新品优先购'), t('profile.benefits.gold.shipping', '免运费')],
  };

  const activeTabs = settings?.feature_subscriptions === '1' 
    ? [...TABS, { key: 'subscriptions', label: t('profile.tabs.subscriptions', '我的订阅'), icon: CalendarSync }] 
    : TABS;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-xl font-medium text-stone-700 mb-6">{t('profile.title', '个人中心')}</h1>
      <div className="grid md:grid-cols-[280px_1fr] gap-6">
        {/* 左侧用户信息 */}
        <div className="space-y-4">
          <div className="card p-5 text-center">
            <div className="w-20 h-20 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-3 text-3xl">
              {user.name.slice(0, 1)}
            </div>
            <h2 className="font-semibold text-stone-700">{user.name}</h2>
            <p className="text-xs text-stone-400 mb-3">{user.email}</p>
            <span className={`text-sm px-3 py-1 rounded-full font-medium ${LEVEL_COLORS[user.level]}`}>
              <Crown size={12} className="inline mr-1" />{t(`profile.levels.${user.level}`, LEVEL_LABELS[user.level])}
            </span>
          </div>

          <div className="card p-5">
            <h3 className="font-medium text-stone-700 mb-3 text-sm">{t('profile.benefits.title', '会员权益')}</h3>
            {user.level !== 'guest' && user.level !== 'admin' && levelBenefits[user.level] ? (
              <ul className="space-y-1.5">
                {levelBenefits[user.level].map(b => (
                  <li key={b} className="flex items-center gap-2 text-sm text-stone-600">
                    <span className="text-rose-400 text-xs">✓</span>{b}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-stone-400">{t('profile.benefits.guest', '登录后查看专属权益')}</p>
            )}
            <div className="mt-4 pt-3 border-t border-stone-100 text-xs text-stone-400">
              <p>{t('profile.stats.spend', '累计消费：')}<span className="text-stone-600 font-medium">¥{(user.total_spend || 0).toFixed(2)}</span></p>
              <p className="mt-1">{t('profile.stats.points', '积分：')}<span className="text-stone-600 font-medium">{user.points}</span></p>
            </div>
          </div>
        </div>

        {/* 右侧内容 */}
        <div>
          {/* 标签页 */}
          <div className="flex gap-2 mb-5 overflow-x-auto pb-2">
            {activeTabs.map(t => (
              <button key={t.key} onClick={() => setSearchParams({ tab: t.key })}
                className={`flex items-center gap-1.5 px-4 py-2 text-sm transition-colors rounded-lg whitespace-nowrap ${
                  tab === t.key ? 'bg-stone-900 text-white' : 'text-stone-500 hover:text-stone-900 hover:bg-stone-100'
                }`}>
                <t.icon size={14} /> {t.label}
              </button>
            ))}
          </div>

          {/* 最近订单 */}
          {tab === 'orders' && (
            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-stone-700">{t('profile.orders.recent', '最近订单')}</h3>
                <Link to="/orders" className="text-sm text-rose-400 hover:underline">{t('profile.orders.all', '全部订单 →')}</Link>
              </div>
              {ordersData?.orders?.length > 0 ? (
                <div className="space-y-3">
                  {ordersData.orders.map((order: any) => (
                    <div key={order.id} className="border border-stone-100 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-stone-400">{t('profile.orders.no', '订单号：')}{order.order_no}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          order.status === 'delivered' ? 'bg-green-50 text-green-600' :
                          order.status === 'cancelled' ? 'bg-stone-100 text-stone-400' : 'bg-amber-50 text-amber-600'
                        }`}>
                          {t(`profile.orders.status.${order.status}`, ORDER_STATUS_LABELS[order.status])}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-stone-600">{t('profile.orders.items', '{{count}} 件商品', { count: order.items?.length })}</span>
                        <span className="font-semibold text-rose-500">¥{order.pay_amount?.toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 text-stone-400">
                  <ShoppingBag size={32} className="mx-auto mb-2 text-stone-200" />
                  <p className="text-sm">{t('profile.orders.empty', '暂无订单记录')}</p>
                  <Link to="/products" className="text-rose-400 text-sm hover:underline mt-1 block">{t('profile.orders.shop', '去购物')}</Link>
                </div>
              )}
            </div>
          )}

          {/* 我的收藏 */}
          {tab === 'favorites' && (
            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-stone-700">{t('profile.favorites.title', '我的收藏')}</h3>
                <Link to="/favorites" className="text-sm text-rose-400 hover:underline">{t('profile.favorites.all', '查看全部 →')}</Link>
              </div>
              {favorites?.length > 0 ? (
                <div className="space-y-2">
                  {favorites.slice(0, 5).map((item: any) => (
                    <Link key={item.favorite_id} to={`/products/${item.slug}`} className="flex items-center gap-3 p-2 rounded-lg hover:bg-stone-50 transition-colors">
                      <div className="w-12 h-12 bg-stone-50 rounded-lg overflow-hidden flex-shrink-0">
                        {item.main_image ? (
                          <img src={item.main_image} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-stone-200 text-lg">◆</div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-stone-700 truncate">{item.name}</p>
                        <p className="text-xs text-rose-500 font-medium">¥{item.price?.toFixed(2)}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 text-stone-400">
                  <Heart size={32} className="mx-auto mb-2 text-stone-200" />
                  <p className="text-sm">{t('profile.favorites.empty', '暂无收藏')}</p>
                  <Link to="/products" className="text-rose-400 text-sm hover:underline mt-1 block">{t('profile.favorites.discover', '去发现好物')}</Link>
                </div>
              )}
            </div>
          )}

          {/* 收货地址 */}
          {tab === 'address' && (
            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-stone-700">{t('profile.address.title', '收货地址')}</h3>
                <Link to="/addresses" className="text-sm text-rose-400 hover:underline">{t('profile.address.manage', '管理地址 →')}</Link>
              </div>
              {addresses?.length > 0 ? (
                <div className="space-y-2">
                  {addresses.map((addr: any) => (
                    <div key={addr.id} className="flex items-start gap-3 p-3 border border-stone-100 rounded-lg">
                      <MapPin size={14} className="text-stone-300 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-stone-700">{addr.name}</span>
                          <span className="text-xs text-stone-400">{addr.phone}</span>
                          {addr.is_default && (
                            <span className="text-xs bg-stone-900 text-white px-1.5 py-0.5">{t('profile.address.default', '默认')}</span>
                          )}
                        </div>
                        <p className="text-xs text-stone-500">{addr.province} {addr.city} {addr.district} {addr.address}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 text-stone-400">
                  <MapPin size={32} className="mx-auto mb-2 text-stone-200" />
                  <p className="text-sm">{t('profile.address.empty', '暂无地址')}</p>
                  <Link to="/addresses" className="text-rose-400 text-sm hover:underline mt-1 block">{t('profile.address.add', '添加地址')}</Link>
                </div>
              )}
            </div>
          )}

          {/* 我的订阅 */}
          {tab === 'subscriptions' && settings?.feature_subscriptions === '1' && (
            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-stone-700">{t('profile.subscriptions.title', '我的定期订阅')}</h3>
              </div>
              {subscriptionsData?.subscriptions?.length > 0 ? (
                <div className="space-y-3">
                  {subscriptionsData.subscriptions.map((sub: any) => (
                    <div key={sub.id} className="border border-stone-100 rounded-xl p-4 flex gap-4">
                      <div className="w-20 h-20 bg-stone-50 rounded-lg overflow-hidden flex-shrink-0">
                        {sub.product_image && <img src={sub.product_image} alt={sub.product_name} className="w-full h-full object-cover" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-1">
                          <h4 className="font-medium text-stone-900">{sub.product_name}</h4>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${sub.status === 'active' ? 'bg-green-50 text-green-600' : 'bg-stone-100 text-stone-500'}`}>
                            {sub.status === 'active' ? t('profile.subscriptions.active', '生效中') : sub.status === 'paused' ? t('profile.subscriptions.paused', '已暂停') : t('profile.subscriptions.cancelled', '已取消')}
                          </span>
                        </div>
                        <p className="text-xs text-stone-500 mb-2">{t('profile.subscriptions.frequency', '每 {{days}} 天配送一次 · 享 {{discount}} 折', { days: sub.frequency_days, discount: (sub.discount_percent * 10).toFixed(1) })}</p>
                        <p className="text-xs text-stone-400 mb-3">{t('profile.subscriptions.next', '下次发货时间：')}{new Date(sub.next_deliver_date).toLocaleDateString()}</p>
                        
                        {sub.status === 'active' && (
                          <button 
                            onClick={async () => {
                              if (confirm(t('profile.subscriptions.confirm_cancel', '确定要取消此订阅吗？'))) {
                                try {
                                  await api.put(`/orders/subscriptions/${sub.id}/status`, { status: 'cancelled' });
                                  toast.success(t('profile.subscriptions.cancel_success', '已取消订阅'));
                                  refetchSubscriptions();
                                } catch(e: any) {
                                  toast.error(e.message);
                                }
                              }
                            }}
                            className="text-xs text-rose-500 hover:underline"
                          >
                            {t('profile.subscriptions.cancel_btn', '取消订阅')}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 text-stone-400">
                  <CalendarSync size={32} className="mx-auto mb-2 text-stone-200" />
                  <p className="text-sm">{t('profile.subscriptions.empty', '您还没有任何定期订阅计划')}</p>
                </div>
              )}
            </div>
          )}

          {/* 我的推荐 */}
          {tab === 'referrals' && (
            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-stone-700">{t('profile.referrals.title', '我的推荐与积分')}</h3>
              </div>

              {settings?.feature_partner_tier === '1' && (
                <div className="mb-6 p-5 border border-stone-200 rounded-xl bg-gradient-to-br from-stone-50 to-stone-100">
                  <div className="flex justify-between items-end mb-4">
                    <div>
                      <h4 className="text-sm font-semibold text-stone-800 mb-1">{t('profile.referrals.partner_center', '合伙人返利中心')}</h4>
                      <p className="text-xs text-stone-500">
                        {t('profile.referrals.invited_count_label', '当前已邀请：')}<span className="font-medium text-stone-900">{referrals?.invited?.length || 0}</span> {t('profile.referrals.invited_unit', '人')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-stone-500 mb-1">{t('profile.referrals.current_rate', '当前返利比例')}</p>
                      <p className="text-2xl font-bold text-rose-500">
                        {(() => {
                          const c = referrals?.invited?.length || 0;
                          return c >= 50 ? '20%' : c >= 10 ? '15%' : '10%';
                        })()}
                      </p>
                    </div>
                  </div>
                  
                  {/* 进度条 */}
                  {(() => {
                    const c = referrals?.invited?.length || 0;
                    const max = c >= 50 ? 50 : c >= 10 ? 50 : 10;
                    const percent = Math.min(100, Math.floor((c / max) * 100));
                    const nextTierName = c >= 50 ? t('profile.referrals.max_tier', '已达到最高阶') : c >= 10 ? t('profile.referrals.super_partner', '超级合伙人 (20%)') : t('profile.referrals.senior_partner', '高级合伙人 (15%)');
                    const diff = max - c;
                    return (
                      <div>
                        <div className="h-2 w-full bg-stone-200 rounded-full overflow-hidden mb-2">
                          <div className="h-full bg-rose-400 transition-all duration-1000" style={{ width: `${percent}%` }}></div>
                        </div>
                        <div className="flex justify-between text-[10px] text-stone-500">
                          <span>{c >= 50 ? t('profile.referrals.super', '超级合伙人') : c >= 10 ? t('profile.referrals.senior', '高级合伙人') : t('profile.referrals.normal', '普通合伙人')}</span>
                          <span>{c >= 50 ? t('profile.referrals.all_unlocked', '您已解锁所有阶段') : t('profile.referrals.to_next_tier', '距离 {{tier}} 还差 {{count}} 人', { tier: nextTierName, count: diff })}</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              <div className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-lg">
                <h4 className="text-sm font-medium text-rose-800 mb-2">{t('profile.referrals.link_title', '专属邀请链接')}</h4>
                <div className="flex items-center gap-2">
                  <input
                    readOnly
                    value={`${window.location.origin}/register?ref=${user.referral_code || ''}`}
                    className="flex-1 px-3 py-2 text-sm bg-white border border-rose-200 rounded outline-none"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/register?ref=${user.referral_code || ''}`);
                      toast.success(t('profile.referrals.copy_success', '邀请链接已复制'));
                    }}
                    className="px-4 py-2 bg-rose-500 text-white text-sm rounded hover:bg-rose-600 transition-colors"
                  >
                    {t('profile.referrals.copy', '复制')}
                  </button>
                </div>
                <p className="text-xs text-rose-500 mt-2">{t('profile.referrals.desc', '好友通过您的链接注册并购买商品后，您可获得实付金额 10% 的积分奖励！(100积分=1元)')}</p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-medium text-stone-700 mb-3 border-b pb-2">{t('profile.referrals.invited_list', '邀请好友 ({{count}})', { count: referrals?.invited?.length || 0 })}</h4>
                  {referrals?.invited?.length > 0 ? (
                    <ul className="space-y-3">
                      {referrals.invited.map((friend: any) => (
                        <li key={friend.id} className="flex items-center gap-2 text-sm text-stone-600">
                          <div className="w-8 h-8 bg-stone-100 rounded-full flex items-center justify-center text-xs">
                            {friend.name.slice(0, 1)}
                          </div>
                          <div>
                            <p>{friend.name}</p>
                            <p className="text-xs text-stone-400">{new Date(friend.created_at).toLocaleDateString()}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-stone-400 py-4 text-center border border-dashed rounded-lg">{t('profile.referrals.invited_empty', '暂无成功邀请的好友')}</p>
                  )}
                </div>

                <div>
                  <h4 className="text-sm font-medium text-stone-700 mb-3 border-b pb-2">{t('profile.referrals.history', '积分流水')}</h4>
                  {referrals?.pointsHistory?.length > 0 ? (
                    <ul className="space-y-3 max-h-60 overflow-y-auto pr-2">
                      {referrals.pointsHistory.map((ph: any) => (
                        <li key={ph.id} className="text-sm text-stone-600 border-b border-stone-50 pb-2 last:border-0">
                          <div className="flex justify-between">
                            <span>{ph.description}</span>
                            <span className={`font-medium ${ph.amount > 0 ? 'text-green-500' : 'text-rose-500'}`}>
                              {ph.amount > 0 ? '+' : ''}{ph.amount}
                            </span>
                          </div>
                          <p className="text-xs text-stone-400 mt-1">{new Date(ph.created_at).toLocaleString()}</p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-stone-400 py-4 text-center border border-dashed rounded-lg">{t('profile.referrals.history_empty', '暂无积分流水记录')}</p>
                  )}
                </div>
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}
