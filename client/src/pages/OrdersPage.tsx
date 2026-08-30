import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ShoppingBag, Star, X, Loader2, CreditCard, Wallet, RotateCcw, Check } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { isWechatBrowser, submitAlipayForm } from '../utils/usePayment';
import { useAuthStore } from '../contexts/authStore';
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
    { value: 'refund_requested', label: t('orders.tabs.refund_requested', '退款中') },
    { value: 'cancelled', label: t('orders.tabs.cancelled', '已取消') },
  ];

  const [statusFilter, setStatusFilter] = useState('all');
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [refundingId, setRefundingId] = useState<string | null>(null);
  const [payingOrderNo, setPayingOrderNo] = useState<string | null>(null);
  const [payMethod, setPayMethod] = useState<'wechat' | 'alipay' | 'visa' | 'paypal'>('wechat');
  const [isPaying, setIsPaying] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  
  // QR Code Payment Modal State
  const [showQr, setShowQr] = useState(false);
  const [qrData, setQrData] = useState('');
  const [qrOrderNo, setQrOrderNo] = useState('');
  
  const navigate = useNavigate();
  const { refreshUser } = useAuthStore();
  const queryClient = useQueryClient();

  // Poll for payment status when QR code is showing
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (showQr && qrOrderNo) {
      interval = setInterval(async () => {
        try {
          const res: any = await api.get(`/payment/query/${qrOrderNo}`);
          if (res.status === 'paid') {
            setShowQr(false);
            queryClient.invalidateQueries({ queryKey: ['my-orders'] });
            refreshUser();
            toast.success(t('orders.pay_success', '支付成功！'));
            setPayingOrderNo(null);
          }
        } catch (e) {
          // ignore polling errors
        }
      }, 3000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [showQr, qrOrderNo, queryClient, refreshUser, t]);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['my-orders', statusFilter],
    queryFn: () => api.get(`/orders/my?status=${statusFilter}&limit=20`),
  }) as any;

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.get('/settings'),
  }) as any;

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

  const handleRefundRequest = async (orderNo: string) => {
    const reason = prompt(t('orders.refund_reason', '请输入退款原因（可选）'));
    if (reason === null) return;
    setRefundingId(orderNo);
    try {
      await api.post(`/orders/${orderNo}/refund-request`, { reason });
      toast.success(t('orders.refund_request_success', '退款申请已提交'));
      refetch();
    } catch (e: any) { toast.error(e.message); }
    finally { setRefundingId(null); }
  };

  const executePayment = async () => {
    if (!payingOrderNo) return;
    setIsPaying(true);
    try {
      const paymentResult: any = await api.post('/payment/create', {
        orderNo: payingOrderNo,
        channel: payMethod,
        returnUrl: `${window.location.origin}/payment/result?orderNo=${payingOrderNo}`,
      });

      if (!paymentResult.success) {
        toast.error(paymentResult.error || t('orders.pay_failed', '创建支付失败'));
        setIsPaying(false);
        return;
      }

      const { type, data } = paymentResult;

      if (type === 'mock') {
        await api.post(`/payment/mock/${payingOrderNo}`);
        queryClient.invalidateQueries({ queryKey: ['cart'] });
        refreshUser();
        toast.success(t('orders.pay_success', '支付成功！'));
        navigate('/payment/result', { state: { orderNo: payingOrderNo } });
        return;
      }

      if (type === 'h5_url') {
        window.location.href = data;
        setIsPaying(false);
        return;
      }

      if (type === 'form') {
        submitAlipayForm(data);
        setIsPaying(false);
        return;
      }

      if (type === 'native_qrcode') {
        // 微信 Native 支付，显示二维码
        setQrData(data);
        setQrOrderNo(payingOrderNo);
        setShowQr(true);
        setIsPaying(false);
        setPayingOrderNo(null); // 关闭选择支付方式的弹窗
        return;
      }

      if (type === 'jsapi') {
        toast.loading(t('orders.wechat_paying', '正在唤起微信支付...'), { duration: 2000 });
        setIsPaying(false);
        return;
      }
      setIsPaying(false);
    } catch (e: any) {
      const errMsg = e?.response?.data?.error || e?.message || t('orders.pay_error', '支付失败');
      toast.error(errMsg);
      setIsPaying(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-xl font-medium text-stone-700 mb-6">{t('orders.title', t('auto_shoplayout_347', '我的订单'))}</h1>

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
        <div className="text-center text-stone-400 py-10">{t('orders.loading', t('auto_staticpage_313', '加载中...'))}</div>
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
                  order.status === 'refund_requested' ? 'bg-orange-50 text-orange-600' :
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

              {/* 退款追踪流程 (Refund tracking process) */}
              {['refund_requested', 'refunded'].includes(order.status) && (
                <div className="mb-4 p-4 bg-orange-50/40 rounded-xl border border-orange-100/60">
                  <h4 className="text-xs font-semibold text-orange-800 mb-4 flex items-center gap-1">
                    <RotateCcw size={12} className="text-orange-600" /> {t('orders.refund_tracking', '退款追踪流程')}
                  </h4>
                  <div className="flex items-center justify-between text-xs relative max-w-md mx-auto py-2">
                    {/* Line Background */}
                    <div className="absolute left-[10%] right-[10%] top-[19px] h-0.5 bg-stone-100 -z-10" />
                    <div className={`absolute left-[10%] top-[19px] h-0.5 bg-orange-500 transition-all duration-500 -z-10`} 
                      style={{ width: order.status === 'refunded' ? '80%' : '40%' }} 
                    />

                    {/* Step 1: Submit */}
                    <div className="flex flex-col items-center flex-1">
                      <div className="w-7 h-7 rounded-full bg-orange-500 text-white flex items-center justify-center shadow-sm border-2 border-white">
                        <Check size={12} strokeWidth={3} />
                      </div>
                      <span className="mt-2 font-medium text-stone-700 scale-95">{t('orders.refund_step_submit', '提交申请')}</span>
                      <span className="text-[9px] text-stone-400 mt-0.5">已提交</span>
                    </div>

                    {/* Step 2: Review */}
                    <div className="flex flex-col items-center flex-1">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center shadow-sm border-2 border-white font-medium ${
                        order.status === 'refunded' 
                          ? 'bg-orange-500 text-white' 
                          : 'bg-amber-400 text-white animate-pulse'
                      }`}>
                        {order.status === 'refunded' ? <Check size={12} strokeWidth={3} /> : '2'}
                      </div>
                      <span className="mt-2 font-medium text-stone-700 scale-95">{t('orders.refund_step_review', '商家审核')}</span>
                      <span className="text-[9px] text-stone-400 mt-0.5">
                        {order.status === 'refunded' ? '审核通过' : '进行中'}
                      </span>
                    </div>

                    {/* Step 3: Completed */}
                    <div className="flex flex-col items-center flex-1">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center shadow-sm border-2 border-white font-medium ${
                        order.status === 'refunded' 
                          ? 'bg-orange-500 text-white' 
                          : 'bg-stone-100 text-stone-400'
                      }`}>
                        {order.status === 'refunded' ? <Check size={12} strokeWidth={3} /> : '3'}
                      </div>
                      <span className="mt-2 font-medium text-stone-700 scale-95">{t('orders.refund_step_complete', '退款完成')}</span>
                      <span className="text-[9px] text-stone-400 mt-0.5">
                        {order.status === 'refunded' ? '已入账' : '等待中'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between border-t border-stone-100 pt-3">
                <span className="text-sm text-stone-500">{t('orders.recipient', '收货：')}{order.recipient_name} {order.recipient_phone}</span>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-rose-500">¥{order.pay_amount?.toFixed(2)}</span>
                  {order.status === 'pending' && (
                    <button
                      onClick={() => handleCancel(order.order_no)}
                      disabled={cancellingId === order.order_no}
                      className="text-xs text-stone-400 hover:text-rose-500 transition-colors border border-stone-200 px-2 py-1 rounded-lg"
                    >
                      {t('orders.cancel_btn', '取消订单')}
                    </button>
                  )}
                  {['paid', 'processing', 'shipped', 'delivered'].includes(order.status) && (
                    <button
                      onClick={() => handleRefundRequest(order.order_no)}
                      disabled={refundingId === order.order_no}
                      className="text-xs text-orange-600 hover:text-orange-700 transition-colors border border-orange-200 bg-orange-50 px-2 py-1 rounded-lg flex items-center gap-1 disabled:opacity-50"
                    >
                      <RotateCcw size={12} className={refundingId === order.order_no ? 'animate-spin' : ''} />
                      {refundingId === order.order_no ? t('orders.refund_requesting', '提交中...') : t('orders.refund_request_btn', '申请退款')}
                    </button>
                  )}
                  {order.status === 'pending' && (
                    <button
                      onClick={() => {
                        setPayingOrderNo(order.order_no);
                        setPaymentAmount(order.pay_amount);
                        setPayMethod((order.pay_method as any) || 'wechat');
                      }}
                      className="text-xs text-white bg-rose-500 hover:bg-rose-600 transition-colors px-3 py-1 rounded-lg"
                    >
                      {t('orders.pay_btn', '去付款')}
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

      {/* 支付弹窗 */}
      {payingOrderNo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-stone-100">
              <h3 className="font-semibold text-stone-800">{t('orders.select_payment', '选择支付方式')}</h3>
              <button onClick={() => setPayingOrderNo(null)} className="text-stone-400 hover:text-stone-600 transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-5">
              <div className="text-center mb-6">
                <p className="text-sm text-stone-500 mb-1">{t('orders.pay_amount', '支付金额')}</p>
                <p className="text-3xl font-semibold text-rose-500">¥{paymentAmount.toFixed(2)}</p>
              </div>
              <div className="space-y-3">
                {[
                  { value: 'wechat' as const, label: t('checkout.wechat_pay', 'WeChat Pay'), icon: Wallet, color: 'text-green-600' },
                  { value: 'alipay' as const, label: t('checkout.alipay', 'Alipay'), icon: CreditCard, color: 'text-blue-600' },
                  { value: 'visa' as const, label: t('checkout.visa', 'Visa / Credit Card'), icon: CreditCard, color: 'text-blue-800' },
                  { value: 'paypal' as const, label: t('checkout.paypal', 'PayPal'), icon: Wallet, color: 'text-sky-600' },
                ].filter(m => {
                  if (!settings) return true;
                  if (m.value === 'wechat') return settings.wechat_enabled !== '0';
                  if (m.value === 'alipay') return settings.alipay_enabled !== '0';
                  if (m.value === 'visa') return settings.stripe_enabled !== '0';
                  if (m.value === 'paypal') return settings.paypal_enabled !== '0';
                  return true;
                }).map(m => (
                  <label key={m.value} className={`flex items-center gap-3 p-4 border rounded-xl cursor-pointer transition-colors ${payMethod === m.value ? 'border-rose-500 bg-rose-50/50' : 'border-stone-200 hover:border-stone-400'}`}>
                    <input type="radio" name="payMethod" value={m.value} checked={payMethod === m.value} onChange={() => setPayMethod(m.value)} className="sr-only" />
                    <m.icon size={20} className={m.color} />
                    <span className="text-sm font-medium text-stone-700 tracking-wider flex-1">{m.label}</span>
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${payMethod === m.value ? 'border-rose-500' : 'border-stone-300'}`}>
                      {payMethod === m.value && <div className="w-2 h-2 bg-rose-500 rounded-full" />}
                    </div>
                  </label>
                ))}
              </div>
              {isWechatBrowser() && (
                <p className="text-xs text-stone-400 mt-3 text-center">
                  {t('checkout.wechat_browser_notice', 'WeChat Browser detected, will use JSAPI payment')}
                </p>
              )}
            </div>
            <div className="p-4 border-t border-stone-100 bg-stone-50">
              <button
                onClick={executePayment}
                disabled={isPaying}
                className="w-full py-3 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isPaying && <Loader2 size={16} className="animate-spin" />}
                {isPaying ? t('orders.processing', '处理中...') : t('orders.confirm_pay', '确认支付')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 微信支付二维码弹窗 */}
      {showQr && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl relative">
            <button 
              onClick={() => {
                setShowQr(false);
                toast.success(t('checkout.qr_close_notice', '您可以在订单详情页继续支付'));
              }}
              className="absolute top-4 right-4 text-stone-400 hover:text-stone-900"
            >
              <X size={24} />
            </button>
            <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <Wallet size={24} className="text-green-600" />
            </div>
            <h3 className="text-lg font-medium text-stone-900 mb-2">{t('checkout.wechat_scan', '微信扫码支付')}</h3>
            <p className="text-sm text-stone-500 mb-6">{t('checkout.wechat_scan_desc', '请使用微信扫一扫完成支付')}</p>
            <div className="bg-white p-4 border border-stone-200 rounded-xl inline-block mb-6 shadow-sm">
              <QRCodeSVG value={qrData} size={200} level="H" includeMargin={false} />
            </div>
            <div className="flex items-center justify-center gap-2 text-sm text-stone-600">
              <Loader2 size={16} className="animate-spin text-stone-400" />
              {t('checkout.waiting_payment', '等待支付中...')}
            </div>
            <div className="mt-6 text-xs text-stone-400">
              {t('checkout.order_no', '订单号:')} {qrOrderNo}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
