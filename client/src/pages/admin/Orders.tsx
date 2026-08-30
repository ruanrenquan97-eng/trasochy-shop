import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, RotateCcw, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import { ORDER_STATUS_LABELS } from '../../types';

const STATUS_TABS = [
  { value: 'all', label: '全部' },
  { value: 'pending', label: '待付款' },
  { value: 'paid', label: '已付款' },
  { value: 'processing', label: '处理中' },
  { value: 'shipped', label: '已发货' },
  { value: 'delivered', label: '已收货' },
  { value: 'refund_requested', label: '退款申请' },
  { value: 'cancelled', label: '已取消' },
  { value: 'refunded', label: '已退款' },
];

const STATUS_ACTIONS: Record<string, Array<{ value: string; label: string }>> = {
  paid: [
    { value: 'processing', label: '标记处理中' },
    { value: 'ship_modal', label: '发货 / 制单' },
  ],
  processing: [{ value: 'ship_modal', label: '发货 / 制单' }],
  shipped: [{ value: 'delivered', label: '标记已收货' }],
  cancelled: [{ value: 'delete', label: '删除订单' }],
};

export default function AdminOrders() {
  const [statusFilter, setStatusFilter] = useState('all');
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [refunding, setRefunding] = useState<number | null>(null);
  const [showDetail, setShowDetail] = useState<number | null>(null);
  const [shippingOrder, setShippingOrder] = useState<number | null>(null);
  const [trackingCompany, setTrackingCompany] = useState('顺丰速运');
  const [trackingNumber, setTrackingNumber] = useState('');
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-orders', statusFilter, keyword, page],
    queryFn: () => api.get(`/admin/orders?${new URLSearchParams({ status: statusFilter, keyword, page: String(page), limit: '20' }).toString()}`),
  }) as any;

  const updateStatus = async (orderId: number, status: string) => {
    try {
      await api.put(`/admin/orders/${orderId}/status`, { status });
      qc.invalidateQueries({ queryKey: ['admin-orders'] });
      toast.success('状态已更新');
    } catch (e: any) { toast.error(e.message); }
  };

  const handleRefund = async (orderNo: string, orderId: number) => {
    if (!confirm(`确认对订单 ${orderNo} 进行退款？此操作不可撤销。`)) return;

    const reason = prompt('请输入退款原因（可选）：') || '管理员操作退款';
    setRefunding(orderId);
    try {
      const result: any = await api.post(`/payment/refund/${orderNo}`, { reason });
      if (result.success) {
        toast.success('退款成功');
        qc.invalidateQueries({ queryKey: ['admin-orders'] });
      } else {
        toast.error(result.message || '退款失败');
      }
    } catch (e: any) {
      toast.error(e.message || '退款失败');
    } finally {
      setRefunding(null);
    }
  };

  const handleShipOrder = async () => {
    if (!shippingOrder) return;
    if (!trackingCompany.trim() || !trackingNumber.trim()) {
      toast.error('请输入物流公司和运单号');
      return;
    }

    try {
      await api.put(`/admin/orders/${shippingOrder}/ship`, { trackingCompany, trackingNumber });
      qc.invalidateQueries({ queryKey: ['admin-orders'] });
      toast.success('发货成功！');
      setShippingOrder(null);
    } catch (e: any) {
      toast.error(e.message || '发货失败');
    }
  };

  const handleDeleteOrder = async (orderId: number, orderNo: string) => {
    if (!confirm(`确定要永久删除订单 ${orderNo} 吗？\n此操作不可恢复，相关的商品明细也会被一并删除！`)) return;
    
    try {
      await api.delete(`/admin/orders/${orderId}`);
      toast.success('订单已删除');
      qc.invalidateQueries({ queryKey: ['admin-orders'] });
    } catch (e: any) {
      toast.error(e.message || '删除失败');
    }
  };

  const totalPages = Math.ceil((data?.total || 0) / 20);

  const formatTime = (ts: number | null) => {
    if (!ts) return '-';
    return new Date(ts).toLocaleString('zh-CN');
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-medium text-stone-700">订单管理</h1>
        <span className="text-sm text-stone-400">共 {data?.total || 0} 条订单</span>
      </div>

      {/* 状态标签 */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-5">
        {STATUS_TABS.map(tab => (
          <button
            key={tab.value}
            onClick={() => { setStatusFilter(tab.value); setPage(1); }}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs transition-colors ${statusFilter === tab.value ? 'bg-rose-400 text-white' : 'bg-white border border-stone-200 text-stone-600 hover:border-rose-300'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="relative max-w-xs mb-5">
        <Search size={14} className="absolute left-3 top-2.5 text-stone-400" />
        <input value={keyword} onChange={e => { setKeyword(e.target.value); setPage(1); }} placeholder="搜索订单号/收件人" className="w-full pl-8 pr-4 py-2 text-sm border border-stone-200 rounded-xl focus:outline-none focus:border-rose-300" />
      </div>

      {/* 订单列表 */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="text-center py-8 text-stone-400">加载中...</div>
        ) : data?.orders?.map((order: any) => (
          <div key={order.id} className="card p-4">
            <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
              <div>
                <span className="font-medium text-stone-700 text-sm">{order.order_no}</span>
                <span className="text-xs text-stone-400 ml-2">{formatTime(order.created_at)}</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  order.status === 'delivered' ? 'bg-green-50 text-green-600' :
                  order.status === 'refund_requested' ? 'bg-orange-50 text-orange-600' :
                  order.status === 'refunded' ? 'bg-orange-50 text-orange-600' :
                  order.status === 'cancelled' ? 'bg-stone-100 text-stone-400' :
                  order.status === 'shipped' ? 'bg-blue-50 text-blue-600' :
                  order.status === 'paid' ? 'bg-teal-50 text-teal-600' :
                  'bg-amber-50 text-amber-600'
                }`}>
                  {ORDER_STATUS_LABELS[order.status]}
                </span>
                {STATUS_ACTIONS[order.status]?.map(action => (
                  <button key={action.value} onClick={() => {
                    if (action.value === 'ship_modal') {
                      setShippingOrder(order.id);
                      setTrackingCompany('顺丰速运');
                      setTrackingNumber('');
                    } else if (action.value === 'delete') {
                      handleDeleteOrder(order.id, order.order_no);
                    } else {
                      updateStatus(order.id, action.value);
                    }
                  }} className={`text-xs px-2 py-0.5 rounded-lg transition-colors ${
                    action.value === 'delete'
                      ? 'bg-red-50 text-red-500 hover:bg-red-100 border border-red-200'
                      : 'bg-stone-50 hover:bg-rose-50 hover:text-rose-500 text-stone-500 border border-stone-200'
                  }`}>
                    {action.label}
                  </button>
                ))}
                {/* 退款按钮 - 已付款/处理中/已发货可退款 */}
                {['paid', 'processing', 'shipped', 'delivered'].includes(order.status) && (
                  <button
                    onClick={() => handleRefund(order.order_no, order.id)}
                    disabled={refunding === order.id}
                    className="text-xs bg-orange-50 hover:bg-orange-100 text-orange-600 border border-orange-200 px-2 py-0.5 rounded-lg transition-colors flex items-center gap-1 disabled:opacity-50"
                  >
                    <RotateCcw size={10} className={refunding === order.id ? 'animate-spin' : ''} />
                    {refunding === order.id ? '退款中...' : '线上退款'}
                  </button>
                )}
                {order.status === 'refund_requested' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleRefund(order.order_no, order.id)}
                      disabled={refunding === order.id}
                      className="text-xs bg-orange-50 hover:bg-orange-100 text-orange-600 border border-orange-200 px-2 py-0.5 rounded-lg transition-colors flex items-center gap-1 disabled:opacity-50"
                    >
                      <RotateCcw size={10} className={refunding === order.id ? 'animate-spin' : ''} />
                      {refunding === order.id ? '退款中...' : '线上原路退款'}
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`确认这笔订单 ${order.order_no} 已经通过线下渠道完成了退款，并将其标记为退款完成？`)) {
                          updateStatus(order.id, 'refunded');
                        }
                      }}
                      className="text-xs bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 px-2 py-0.5 rounded-lg transition-colors"
                    >
                      完成线下退款
                    </button>
                  </div>
                )}
                {/* 展开详情 */}
                <button
                  onClick={() => setShowDetail(showDetail === order.id ? null : order.id)}
                  className="text-xs text-stone-400 hover:text-stone-700 transition-colors"
                >
                  {showDetail === order.id ? '收起' : '详情'}
                </button>
              </div>
            </div>

            <div className="text-xs text-stone-500 mb-2">
              <span>用户：{order.user_name}</span>
              <span className="ml-3">收件：{order.recipient_name} {order.recipient_phone}</span>
              <span className="ml-3">地址：{order.address}</span>
            </div>

            <div className="flex flex-wrap gap-2 mb-2">
              {order.items?.map((item: any) => (
                <span key={item.id} className="text-xs bg-stone-50 text-stone-500 px-2 py-0.5 rounded">
                  {item.product_name} x{item.quantity}
                </span>
              ))}
            </div>

            <div className="flex items-center justify-between">
              <div className="text-right">
                <span className="font-semibold text-rose-500">¥{order.pay_amount?.toFixed(2)}</span>
                <span className="text-xs text-stone-400 ml-2">
                  {order.pay_method === 'wechat' ? '微信' : order.pay_method === 'alipay' ? '支付宝' : '待支付'}
                </span>
              </div>
            </div>

            {/* 展开的支付详情 */}
            {showDetail === order.id && (
              <div className="mt-3 pt-3 border-t border-stone-100 text-xs text-stone-400 space-y-1">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-stone-300">支付方式：</span>
                    <span>{order.pay_method === 'wechat' ? '微信支付' : order.pay_method === 'alipay' ? '支付宝' : '-'}</span>
                  </div>
                  <div>
                    <span className="text-stone-300">支付时间：</span>
                    <span>{formatTime(order.pay_time)}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-stone-300">交易号：</span>
                    <span className="font-mono">{order.trade_no || '-'}</span>
                  </div>
                  <div>
                    <span className="text-stone-300">订单金额：</span>
                    <span>¥{order.total_amount?.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-stone-300">实付金额：</span>
                    <span>¥{order.pay_amount?.toFixed(2)}</span>
                  </div>
                  {order.status === 'shipped' || order.status === 'delivered' ? (
                    <>
                      <div>
                        <span className="text-stone-300">物流公司：</span>
                        <span>{order.tracking_company || '-'}</span>
                      </div>
                      <div>
                        <span className="text-stone-300">物流单号：</span>
                        <span className="font-mono">{order.tracking_number || '-'}</span>
                      </div>
                    </>
                  ) : null}
                </div>
              </div>
            )}
          </div>
        ))}

        {!isLoading && data?.orders?.length === 0 && (
          <div className="text-center py-10 text-stone-400">暂无订单数据</div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-5">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <button key={p} onClick={() => setPage(p)} className={`w-8 h-8 rounded-lg text-xs ${p === page ? 'bg-rose-400 text-white' : 'border border-stone-200 text-stone-600'}`}>{p}</button>
          ))}
        </div>
      )}

      {/* 发货弹窗 */}
      {shippingOrder && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-medium text-stone-800 mb-4">订单发货</h3>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs text-stone-500 mb-1">物流公司</label>
                <input 
                  type="text" 
                  value={trackingCompany} 
                  onChange={(e) => setTrackingCompany(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-200 rounded-xl focus:border-rose-400 focus:outline-none text-sm"
                  placeholder="如: 顺丰速运、中通快递"
                  list="tracking_companies"
                />
                <datalist id="tracking_companies">
                  <option value="顺丰速运" />
                  <option value="京东物流" />
                  <option value="中通快递" />
                  <option value="圆通速递" />
                  <option value="申通快递" />
                  <option value="韵达速递" />
                  <option value="极兔速递" />
                  <option value="邮政EMS" />
                </datalist>
              </div>
              
              <div>
                <label className="block text-xs text-stone-500 mb-1">物流单号</label>
                <input 
                  type="text" 
                  value={trackingNumber} 
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-200 rounded-xl focus:border-rose-400 focus:outline-none text-sm font-mono"
                  placeholder="输入快递运单号"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => setShippingOrder(null)}
                className="flex-1 py-2 text-sm text-stone-600 border border-stone-200 rounded-xl hover:bg-stone-50 transition-colors"
              >
                取消
              </button>
              <button 
                onClick={handleShipOrder}
                className="flex-1 py-2 text-sm text-white bg-rose-500 rounded-xl hover:bg-rose-600 transition-colors"
              >
                确认发货
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
