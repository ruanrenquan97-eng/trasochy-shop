import { useState } from 'react';
import { useAuthStore } from '../contexts/authStore';
import { LEVEL_LABELS, LEVEL_COLORS, ORDER_STATUS_LABELS } from '../types';
import { useQuery } from '@tanstack/react-query';
import api from '../utils/api';
import { Crown, Package, ShoppingBag, Heart, MapPin, Settings, Share2, CalendarSync, Camera, Trash2 } from 'lucide-react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useTranslation } from "react-i18next";
import copy from 'copy-to-clipboard';
import { ErrorBoundary } from './SkinAnalysisPro';

export default function ProfilePage() {
    const { t } = useTranslation();
  const { user } = useAuthStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const tab = searchParams.get('tab') || 'orders';

  const TABS = [
    { key: 'orders', label: t('profile.tabs.orders', '最近订单'), icon: Package },
    { key: 'favorites', label: t('profile.tabs.favorites', t('auto_shoplayout_346', '我的收藏')), icon: Heart },
    { key: 'address', label: t('profile.tabs.address', t('auto_shoplayout_336', '收货地址')), icon: MapPin },
    { key: 'referrals', label: t('profile.tabs.referrals', '我的推荐'), icon: Share2 },
    { key: 'skin_records', label: '测肤报告', icon: Camera },
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

  const { data: skinRecordsData, refetch: refetchSkinRecords } = useQuery({
    queryKey: ['skin-records'],
    queryFn: () => api.get('/skin/my-records'),
    enabled: !!user && tab === 'skin_records',
  }) as any;

  const [expandedRecordId, setExpandedRecordId] = useState<number | null>(null);

  if (!user) return null;

  const levelBenefits: Record<string, string[]> = {
    member: [t('profile.benefits.member.discount', '9折专属价'), t('profile.benefits.member.points', '消费积分'), t('profile.benefits.member.birthday', '生日礼券')],
    silver: [t('profile.benefits.silver.discount', '8折专属价'), t('profile.benefits.silver.cs', '优先客服'), t('profile.benefits.silver.points', '1.5倍积分'), t('profile.benefits.silver.shipping', '满额包邮')],
    gold: [t('profile.benefits.gold.discount', '7折专属价'), t('profile.benefits.gold.cs', 'VIP客服'), t('profile.benefits.gold.new', '新品优先购'), t('profile.benefits.gold.shipping', '免运费')],
    diamond: [t('profile.benefits.diamond.discount', '6折专属价'), t('profile.benefits.diamond.cs', '钻石客服'), t('profile.benefits.diamond.new', '极速发货'), t('profile.benefits.diamond.shipping', '尊享免邮')],
  };

  const activeTabs = settings?.feature_subscriptions === '1' 
    ? [...TABS, { key: 'subscriptions', label: t('profile.tabs.subscriptions', '我的订阅'), icon: CalendarSync }] 
    : TABS;

  return (
    <div className="max-w-5xl mx-auto px-4 py-4 md:py-8">
      <h1 className="text-xl font-medium text-stone-700 mb-4 md:mb-6">{t('profile.title', t('auto_shoplayout_333', '个人中心'))}</h1>
      <div className="flex flex-col md:grid md:grid-cols-[280px_1fr] gap-4 md:gap-6">
        
        {/* 左侧：用户信息 (移动端置顶，电脑端左上) */}
        <div className="card p-5 text-center order-1 md:col-start-1 md:row-start-1 h-fit">
          <div className="w-20 h-20 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-3 text-3xl">
            {user.name.slice(0, 1)}
          </div>
          <h2 className="font-semibold text-stone-700">{user.name}</h2>
          <p className="text-xs text-stone-400 mb-3">{user.email}</p>
          <span className={`text-sm px-3 py-1 rounded-full font-medium ${LEVEL_COLORS[user.level]}`}>
            <Crown size={12} className="inline mr-1" />{t(`profile.levels.${user.level}`, LEVEL_LABELS[user.level])}
          </span>
        </div>

        {/* 左侧：会员权益 (移动端置底，电脑端左下) */}
        <div className="card p-5 order-3 md:col-start-1 md:row-start-2 h-fit">
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
            <p className="mt-1">积分：<span className="text-stone-600 font-medium">{user.points}</span></p>
          </div>
        </div>

        {/* 右侧内容 (移动端居中，电脑端右侧跨行) */}
        <div className="order-2 md:col-start-2 md:row-start-1 md:row-span-2 min-w-0">
          {/* 标签页 */}
          <div className="flex flex-wrap gap-2 mb-4 md:mb-5">
            {activeTabs.map(t => (
              <button key={t.key} onClick={() => setSearchParams({ tab: t.key })}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm transition-colors rounded-lg whitespace-nowrap ${
                  tab === t.key ? 'bg-stone-900 text-white shadow-sm' : 'text-stone-500 hover:text-stone-900 hover:bg-stone-100 bg-stone-50/50'
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
                <h3 className="font-medium text-stone-700">{t('profile.favorites.title', t('auto_shoplayout_346', '我的收藏'))}</h3>
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
                  <Link to="/products" className="text-rose-400 text-sm hover:underline mt-1 block">{t('profile.favorites.discover', t('auto_favoritespage_120', '去发现好物'))}</Link>
                </div>
              )}
            </div>
          )}

          {/* 收货地址 */}
          {tab === 'address' && (
            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-stone-700">{t('profile.address.title', t('auto_shoplayout_336', '收货地址'))}</h3>
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
                            <span className="text-xs bg-stone-900 text-white px-1.5 py-0.5">{t('profile.address.default', t('auto_addresspage_13', '默认'))}</span>
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
                          const rDiamond = settings?.partner_rebate_diamond ? parseFloat(settings.partner_rebate_diamond) : 0.30;
                          const rGold = settings?.partner_rebate_gold ? parseFloat(settings.partner_rebate_gold) : 0.25;
                          const rSuper = settings?.partner_rebate_super ? parseFloat(settings.partner_rebate_super) : 0.20;
                          const rAdv = settings?.partner_rebate_advanced ? parseFloat(settings.partner_rebate_advanced) : 0.15;
                          const rDef = settings?.partner_rebate_default ? parseFloat(settings.partner_rebate_default) : 0.10;

                          const tAdv = settings?.partner_threshold_advanced ? parseInt(settings.partner_threshold_advanced) : 10;
                          const tSup = settings?.partner_threshold_super ? parseInt(settings.partner_threshold_super) : 50;
                          const tGold = settings?.partner_threshold_gold ? parseInt(settings.partner_threshold_gold) : 100;
                          const tDia = settings?.partner_threshold_diamond ? parseInt(settings.partner_threshold_diamond) : 500;
                          if (user?.partner_tier === 'diamond') return `${Math.round(rDiamond * 100)}%`;
                          if (user?.partner_tier === 'gold') return `${Math.round(rGold * 100)}%`;
                          if (user?.partner_tier === 'super') return `${Math.round(rSuper * 100)}%`;
                          if (user?.partner_tier === 'advanced') return `${Math.round(rAdv * 100)}%`;
                          
                          if (c >= tDia) return `${Math.round(rDiamond * 100)}%`;
                          if (c >= tGold) return `${Math.round(rGold * 100)}%`;
                          if (c >= tSup) return `${Math.round(rSuper * 100)}%`;
                          if (c >= tAdv) return `${Math.round(rAdv * 100)}%`;
                          return `${Math.round(rDef * 100)}%`;
                        })()}
                      </p>
                    </div>
                  </div>
                  
                  {/* 进度条 */}
                  {(() => {
                    const c = referrals?.invited?.length || 0;
                    const rDiamond = settings?.partner_rebate_diamond ? parseFloat(settings.partner_rebate_diamond) : 0.30;
                    const rGold = settings?.partner_rebate_gold ? parseFloat(settings.partner_rebate_gold) : 0.25;
                    const rSuper = settings?.partner_rebate_super ? parseFloat(settings.partner_rebate_super) : 0.20;
                    const rAdv = settings?.partner_rebate_advanced ? parseFloat(settings.partner_rebate_advanced) : 0.15;

                    const tAdv = settings?.partner_threshold_advanced ? parseInt(settings.partner_threshold_advanced) : 10;
                    const tSup = settings?.partner_threshold_super ? parseInt(settings.partner_threshold_super) : 50;
                    const tGold = settings?.partner_threshold_gold ? parseInt(settings.partner_threshold_gold) : 100;
                    const tDia = settings?.partner_threshold_diamond ? parseInt(settings.partner_threshold_diamond) : 500;
                    
                    let max = tAdv;
                    let nextTierName = t('profile.referrals.senior_partner', `高级合伙人 (${Math.round(rAdv * 100)}%)`);
                    let currentTier = t('profile.referrals.normal', '普通合伙人');
                    let isMaxed = false;

                    // 优先检查手动指定等级
                    if (user?.partner_tier) {
                      isMaxed = true;
                      if (user.partner_tier === 'diamond') currentTier = t('profile.referrals.diamond', '钻石合伙人 (特权)');
                      else if (user.partner_tier === 'gold') currentTier = t('profile.referrals.gold', '金牌合伙人 (特权)');
                      else if (user.partner_tier === 'super') currentTier = t('profile.referrals.super', '超级合伙人 (特权)');
                      else if (user.partner_tier === 'advanced') currentTier = t('profile.referrals.senior', '高级合伙人 (特权)');
                    } else {
                      if (c >= tDia) {
                        max = tDia;
                        nextTierName = t('profile.referrals.max_tier', '已达到最高阶');
                        currentTier = t('profile.referrals.diamond', '钻石合伙人');
                        isMaxed = true;
                      } else if (c >= tGold) {
                        max = tDia;
                        nextTierName = t('profile.referrals.diamond_partner', `钻石合伙人 (${Math.round(rDiamond * 100)}%)`);
                        currentTier = t('profile.referrals.gold', '金牌合伙人');
                      } else if (c >= tSup) {
                        max = tGold;
                        nextTierName = t('profile.referrals.gold_partner', `金牌合伙人 (${Math.round(rGold * 100)}%)`);
                        currentTier = t('profile.referrals.super', '超级合伙人');
                      } else if (c >= tAdv) {
                        max = tSup;
                        nextTierName = t('profile.referrals.super_partner', `超级合伙人 (${Math.round(rSuper * 100)}%)`);
                        currentTier = t('profile.referrals.senior', '高级合伙人');
                      }
                    }

                    const percent = isMaxed ? 100 : Math.min(100, Math.floor((c / max) * 100));
                    const diff = max - c;
                    return (
                      <div>
                        <div className="h-2 w-full bg-stone-200 rounded-full overflow-hidden mb-2">
                          <div className="h-full bg-rose-400 transition-all duration-1000" style={{ width: `${percent}%` }}></div>
                        </div>
                        <div className="flex justify-between text-[10px] text-stone-500">
                          <span>{currentTier}</span>
                          <span>{isMaxed ? t('profile.referrals.all_unlocked', '您已解锁所有阶段或受后台保护') : t('profile.referrals.to_next_tier', '距离 {{tier}} 还差 {{count}} 人', { tier: nextTierName, count: diff })}</span>
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
                    id="referral-link-input"
                    readOnly
                    value={`${window.location.origin}/register?ref=${user.referral_code || ''}`}
                    className="flex-1 px-3 py-2 text-sm bg-white border border-rose-200 rounded outline-none"
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                  />
                  <button
                    onClick={() => {
                      const textToCopy = `${window.location.origin}/register?ref=${user.referral_code || ''}`;
                      if (copy(textToCopy)) {
                        toast.success(t('profile.referrals.copy_success', '邀请链接已复制'));
                      } else {
                        toast.error('复制失败，您的浏览器不支持自动复制');
                      }
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

          {/* 测肤报告 */}
          {tab === 'skin_records' && (
            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-stone-700">我的测肤报告</h3>
                <Link to="/skin-analysis" className="text-sm text-blue-500 hover:underline flex items-center gap-1">
                  <Camera size={14} /> 新建测肤
                </Link>
              </div>
              
              {skinRecordsData?.records?.length > 0 ? (
                <div className="space-y-4">
                  {skinRecordsData.records.map((record: any) => {
                    let parsedData = null;
                    let concerns: string[] = [];
                    let r: any = null;
                    let isProRecord = false;
                    try {
                      parsedData = JSON.parse(record.result_data);
                      
                      r = parsedData.result?.result || parsedData.result || parsedData;
                      isProRecord = record.type === 'pro' || !!r?.score_info;
                      
                      // 简单提取核心问题用于缩略展示
                      if (r.acne && String(r.acne.value) === '1') concerns.push('祛痘');
                      if (r.dark_circle && String(r.dark_circle.value) === '1') concerns.push('黑眼圈');
                      if (
                        (r.pores_forehead && String(r.pores_forehead.value) === '1') ||
                        (r.pores_left_cheek && String(r.pores_left_cheek.value) === '1') ||
                        (r.pores_right_cheek && String(r.pores_right_cheek.value) === '1') ||
                        (r.pores_jaw && String(r.pores_jaw.value) === '1')
                      ) {
                        concerns.push('收缩毛孔');
                      }
                      if (r.skin_spot && String(r.skin_spot.value) === '1') concerns.push('淡斑/美白');
                      
                      if (concerns.length === 0) concerns.push('日常护理');
                    } catch (e) {}

                    return (
                      <div key={record.id} className="border border-stone-100 rounded-xl p-4 hover:shadow-sm transition-shadow">
                        <div className="flex gap-4">
                          <img 
                            src={record.image_url} 
                            alt="测肤照片" 
                            className="w-20 h-20 rounded-lg object-cover bg-stone-100 border border-stone-100"
                            onError={(e) => { (e.target as HTMLImageElement).src = '/images/default-avatar.png'; }}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <h4 className="font-medium text-stone-800">DermiVue 皮肤检测分析</h4>
                                <p className="text-xs text-stone-400 mt-0.5">
                                  {new Date(typeof record.created_at === 'number' && String(record.created_at).length === 10 ? record.created_at * 1000 : record.created_at).toLocaleString()}
                                </p>
                              </div>
                            </div>
                            
                            <div className="flex flex-wrap gap-1.5 mb-3">
                              {concerns.map((c, i) => (
                                <span key={i} className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
                                  {c}
                                </span>
                              ))}
                            </div>

                            <div className="flex flex-wrap items-center gap-2 mt-2">
                              {isProRecord ? (
                                <button 
                                  onClick={() => navigate(`/skin-analysis-pro/report/${record.id}`)}
                                  className="text-sm text-stone-600 hover:text-stone-900 border border-stone-200 px-3 py-1 rounded-full transition-colors bg-stone-50"
                                >
                                  查看瑞士皮肤中心专属报告
                                </button>
                              ) : (
                                <button 
                                  onClick={() => setExpandedRecordId(expandedRecordId === record.id ? null : record.id)}
                                  className="text-sm text-stone-600 hover:text-stone-900 border border-stone-200 px-3 py-1 rounded-full transition-colors"
                                >
                                  {expandedRecordId === record.id ? '收起详情' : '查看完整报告'}
                                </button>
                              )}
                              <button
                                onClick={async () => {
                                  if (confirm('确定要删除这条测肤记录吗？此操作无法恢复。')) {
                                    try {
                                      await api.delete(`/skin/my-records/${record.id}`);
                                      toast.success('记录已删除');
                                      refetchSkinRecords();
                                    } catch(e: any) {
                                      toast.error(e.message || '删除失败');
                                    }
                                  }
                                }}
                                className="text-sm text-rose-500 hover:text-white hover:bg-rose-500 hover:border-rose-500 border border-rose-200 px-3 py-1 rounded-full transition-colors flex items-center gap-1"
                              >
                                <Trash2 size={14} /> 删除
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* 展开详情 */}
                        {expandedRecordId === record.id && parsedData && (
                          <div className="mt-4 pt-4 border-t border-stone-100 animate-in fade-in slide-in-from-top-2">
                            <ErrorBoundary>
                            {(() => {
                              const r = parsedData.result?.result || parsedData.result || parsedData;
                              
                              const renderDetail = (label: string, valueStr: string | null) => {
                                if (!valueStr) return null;
                                return (
                                  <div className="flex justify-between items-center text-sm py-2 border-b border-stone-50 last:border-0">
                                    <span className="text-stone-500">{label}</span>
                                    <span className="font-medium text-stone-800">{valueStr}</span>
                                  </div>
                                );
                              };

                              const getBool = (val: any, t: string, f: string) => {
                                if (!val) return null;
                                return String(val.value) === '1' ? t : f;
                              };
                              
                              const getSkinType = (val: any) => {
                                if (!val) return null;
                                const t = val.skin_type !== undefined ? val.skin_type : (val.value !== undefined ? val.value : val);
                                if (t === 0) return '油性皮肤';
                                if (t === 1) return '干性皮肤';
                                if (t === 2) return '中性皮肤';
                                if (t === 3) return '混合性皮肤';
                                return null;
                              };

                              const isPro = !!r.score_info;

                              if (isPro) {
                                return (
                                  <div className="bg-white rounded-xl border border-neutral-100 shadow-sm mt-4 p-6 text-center text-stone-500 text-sm">
                                    专业版报告已转移至独立查看页面，请点击上方的「查看瑞士皮肤中心专属报告」按钮。
                                  </div>
                                );
                              }

                              return (
                                <div className="grid md:grid-cols-2 gap-x-8 gap-y-1">
                                  {renderDetail('肤质分析', getSkinType(r.skin_type))}
                                  {renderDetail('痘痘检测', getBool(r.acne, '有痘痘风险', '状态良好'))}
                                  {renderDetail('黑头检测', getBool(r.blackhead, '有黑头', '状态良好'))}
                                  {renderDetail('色斑检测', getBool(r.skin_spot, '有色斑/色素沉积', '状态良好'))}
                                  {renderDetail('细纹/皱纹检测', 
                                    getBool(r.forehead_wrinkle, '是', '否') === '是' || 
                                    getBool(r.glabella_wrinkle, '是', '否') === '是' || 
                                    getBool(r.crows_feet, '是', '否') === '是' || 
                                    getBool(r.eye_finelines, '是', '否') === '是' || 
                                    getBool(r.nasolabial_fold, '是', '否') === '是' 
                                    ? '检测到皱纹/细纹' : '状态良好'
                                  )}
                                  {renderDetail('黑眼圈检测', getBool(r.dark_circle, '有黑眼圈', '状态良好'))}
                                  {renderDetail('毛孔状态', 
                                    getBool(r.pores_forehead, '是', '否') === '是' || 
                                    getBool(r.pores_left_cheek, '是', '否') === '是' || 
                                    getBool(r.pores_right_cheek, '是', '否') === '是' || 
                                    getBool(r.pores_jaw, '是', '否') === '是' 
                                    ? '局部毛孔粗大' : '状态良好'
                                  )}
                                </div>
                              );
                            })()}
                            </ErrorBoundary>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-10 text-stone-400">
                  <Camera size={32} className="mx-auto mb-2 text-stone-200" />
                  <p className="text-sm">暂无测肤记录</p>
                  <Link to="/skin-analysis" className="text-blue-500 text-sm hover:underline mt-2 inline-block">
                    去体验 DermiVue 图像测肤
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
