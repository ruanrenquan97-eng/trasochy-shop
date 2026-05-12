import { useQuery } from '@tanstack/react-query';
import { Users, Package, ShoppingBag, TrendingUp, Eye, UserCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../utils/api';
import { LEVEL_LABELS, LEVEL_COLORS, ORDER_STATUS_LABELS } from '../../types';
import toast from 'react-hot-toast';

export default function AdminDashboard() {
  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => api.get('/admin/stats'),
    refetchInterval: 30000,
  }) as any;

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.get('/settings'),
  }) as any;

  const metricCards = [
    { label: '用户总数', value: stats?.totalUsers || 0, icon: Users, color: 'text-stone-600 bg-stone-100' },
    { label: '在售商品', value: stats?.totalProducts || 0, icon: Package, color: 'text-stone-600 bg-stone-100' },
    { label: '今日访客(IP)', value: stats?.todayVisitors || 0, icon: Eye, color: 'text-stone-600 bg-stone-100' },
    { label: '今日登录会员(IP)', value: stats?.todayMembers || 0, icon: UserCheck, color: 'text-stone-600 bg-stone-100' },
    { label: '订单总数', value: stats?.totalOrders || 0, icon: ShoppingBag, color: 'text-stone-600 bg-stone-100' },
    { label: '总收入（¥）', value: (stats?.totalRevenue || 0).toFixed(0), icon: TrendingUp, color: 'text-stone-600 bg-stone-100' },
  ];

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-light text-stone-900 tracking-tight">仪表盘</h1>
          <p className="text-xs text-stone-400 mt-1 tracking-wider">传诗奇管理后台</p>
        </div>
        {settings?.feature_abandoned_cart === '1' && (
          <button 
            onClick={async () => {
              try {
                const res = await api.post('/admin/abandoned-cart/recover');
                toast.success((res as any).message || '扫描完成');
              } catch (e: any) {
                toast.error(e.message || '扫描失败');
              }
            }}
            className="px-4 py-2 bg-rose-600 text-white text-xs font-medium rounded shadow-sm hover:bg-rose-700 transition"
          >
            模拟扫描弃单并发送挽回邮件
          </button>
        )}
      </div>

      {/* 指标卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-10">
        {metricCards.map(card => (
          <div key={card.label} className="card p-6">
            <div className="w-10 h-10 border border-stone-200 flex items-center justify-center mb-4">
              <card.icon size={18} className={card.color.replace('bg-stone-100', 'text-stone-500')} />
            </div>
            <p className="text-2xl font-semibold text-stone-900">{card.value}</p>
            <p className="text-xs text-stone-400 mt-1 tracking-widest uppercase">{card.label}</p>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* 用户等级分布 */}
        <div className="card p-6">
          <h2 className="text-xs font-semibold text-stone-900 mb-5 tracking-wider">用户等级分布</h2>
          {stats?.levelDist?.length > 0 ? (
            <div className="space-y-4">
              {stats.levelDist.map((item: any) => (
                <div key={item.level} className="flex items-center gap-3">
                  <span className={`text-xs px-2.5 py-1 w-24 text-center tracking-wider uppercase ${LEVEL_COLORS[item.level] || 'bg-stone-100 text-stone-500'}`}>
                    {LEVEL_LABELS[item.level] || item.level}
                  </span>
                  <div className="flex-1 h-1.5 bg-stone-100">
                    <div
                      className="h-full bg-stone-900"
                      style={{ width: `${Math.min(100, (item.count / (stats?.totalUsers || 1)) * 100)}%` }}
                    />
                  </div>
                  <span className="text-xs text-stone-600 w-6 text-right font-medium">{item.count}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-stone-400 text-xs tracking-wider">暂无数据</p>
          )}
        </div>

        {/* 最新订单 */}
        <div className="card p-6">
          <h2 className="text-xs font-semibold text-stone-900 mb-5 tracking-wider">最新订单</h2>
          {stats?.recentOrders?.length > 0 ? (
            <div className="space-y-4">
              {stats.recentOrders.map((order: any) => (
                <div key={order.order_no} className="flex items-center justify-between text-sm pb-3 border-b border-stone-50 last:border-0 last:pb-0">
                  <div>
                    <p className="text-stone-800 text-xs">{order.user_name}</p>
                    <p className="text-xs text-stone-400 mt-0.5 tracking-wider">{order.order_no}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-stone-900 font-medium text-sm">¥{order.pay_amount?.toFixed(2)}</p>
                    <span className={`text-xs px-2 py-0.5 mt-1 inline-block ${order.status === 'paid' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-600'}`}>
                      {ORDER_STATUS_LABELS[order.status]}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-stone-400 text-xs tracking-wider">暂无订单</p>
          )}
        </div>
      </div>

      <div className="mt-6">
        {/* 待发货产品/订单 */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xs font-semibold text-stone-900 tracking-wider">待发货产品列表</h2>
            <Link to="/admin/orders" className="text-xs text-rose-500 hover:text-rose-600 font-medium transition-colors">
              去发货
            </Link>
          </div>
          
          {stats?.pendingShipmentOrders?.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-stone-100 text-xs text-stone-400 font-medium tracking-wider">
                    <th className="pb-3 pl-2">订单号 / 用户</th>
                    <th className="pb-3">待发货产品明细</th>
                    <th className="pb-3">收件信息</th>
                    <th className="pb-3 text-right pr-2">支付金额 / 时间</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-50 text-stone-700">
                  {stats.pendingShipmentOrders.map((order: any) => (
                    <tr key={order.order_no} className="hover:bg-stone-50/50 transition-colors">
                      <td className="py-3 pl-2 align-top">
                        <p className="font-medium text-stone-900 text-xs">{order.order_no}</p>
                        <p className="text-xs text-stone-400 mt-1">{order.user_name}</p>
                      </td>
                      <td className="py-3 align-top max-w-[20rem] pr-4">
                        <p className="text-xs text-stone-700 leading-relaxed font-medium">{order.products_summary}</p>
                      </td>
                      <td className="py-3 align-top max-w-[15rem] pr-4">
                        <p className="text-xs text-stone-800">{order.recipient_name} {order.recipient_phone}</p>
                        <p className="text-xs text-stone-400 mt-1 line-clamp-1">{order.recipient_address}</p>
                      </td>
                      <td className="py-3 text-right pr-2 align-top">
                        <p className="font-semibold text-rose-500 text-xs">¥{order.pay_amount?.toFixed(2)}</p>
                        <p className="text-xs text-stone-400 mt-1">{new Date(order.created_at).toLocaleString('zh-CN', {month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit'})}</p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-10">
              <Package size={32} className="mx-auto text-stone-200 mb-3" />
              <p className="text-stone-400 text-xs tracking-wider">暂无需要发货的订单</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
