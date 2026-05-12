import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useAuthStore } from '../contexts/authStore';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CreditCard, Wallet, MapPin, Plus, Check, Loader2, Coins } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { isWechatBrowser, submitAlipayForm, openWechatH5 } from '../utils/usePayment';
import { useTranslation } from "react-i18next";

export default function CheckoutPage() {
    const { t } = useTranslation();
  const { user, refreshUser } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { items, subtotal: stateSubtotal, promoDiscount: statePromoDiscount, total, pointsTotal } = location.state || {};

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.get('/settings'),
  }) as any;

  const isPointsRedemption = pointsTotal > 0;

  const [selectedAddrId, setSelectedAddrId] = useState<number | null>(null);
  const [useNewAddr, setUseNewAddr] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', province: '', city: '', district: '', address: '', remark: '' });
  const [payMethod, setPayMethod] = useState<'wechat' | 'alipay' | 'visa' | 'paypal'>('wechat');
  const [usePoints, setUsePoints] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [isGift, setIsGift] = useState(false);
  const [giftMessage, setGiftMessage] = useState('');
  
  // QR Code Payment Modal State
  const [showQr, setShowQr] = useState(false);
  const [qrData, setQrData] = useState('');
  const [qrOrderNo, setQrOrderNo] = useState('');

  // Poll for payment status when QR code is showing
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (showQr && qrOrderNo) {
      interval = setInterval(async () => {
        try {
          const res: any = await api.get(`/payment/query/${qrOrderNo}`);
          if (res.status === 'paid') {
            setShowQr(false);
            queryClient.invalidateQueries({ queryKey: ['cart'] });
            refreshUser();
            toast.success(t('auto_checkoutpage_111', '支付成功！'));
            navigate('/payment/result', { state: { orderNo: qrOrderNo } });
          }
        } catch (e) {
          // ignore polling errors
        }
      }, 3000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [showQr, qrOrderNo, navigate, queryClient, refreshUser, t]);

  useEffect(() => {
    if (settings) {
      const available = [];
      if (settings.wechat_enabled !== '0') available.push('wechat');
      if (settings.alipay_enabled !== '0') available.push('alipay');
      if (settings.stripe_enabled !== '0') available.push('visa');
      if (settings.paypal_enabled !== '0') available.push('paypal');
      if (available.length > 0 && !available.includes(payMethod as string)) {
        setPayMethod(available[0] as any);
      }
    }
  }, [settings, payMethod]);

  const { data: cartData } = useQuery({
    queryKey: ['cart'],
    queryFn: () => api.get('/cart'),
    enabled: !items,
  }) as any;

  const { data: samplesData } = useQuery({
    queryKey: ['samples'],
    queryFn: () => api.get('/products?isSample=1'),
    enabled: settings?.feature_free_samples === '1',
  }) as any;
  const [selectedSamples, setSelectedSamples] = useState<number[]>([]);

  const toggleSample = (id: number) => {
    setSelectedSamples(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= 2) {
        toast.error(t('auto_checkoutpage_104', '最多只能选择2件体验装'));
        return prev;
      }
      return [...prev, id];
    });
  };

  const { data: addresses } = useQuery({
    queryKey: ['addresses'],
    queryFn: () => api.get('/addresses'),
  }) as any;

  const defaultAddr = addresses?.find((a: any) => a.is_default);

  if (!useNewAddr && !selectedAddrId && defaultAddr && addresses) {
    setSelectedAddrId(defaultAddr.id);
  }

  const selectedAddr = addresses?.find((a: any) => a.id === selectedAddrId);

  const baseOrderItems = items || cartData?.items?.map((i: any) => ({ productId: i.product_id, quantity: i.quantity })) || [];
  const orderItems = [
    ...baseOrderItems,
    ...selectedSamples.map(id => ({ productId: id, quantity: 1, isSample: true }))
  ];
  
  const orderTotal = total || cartData?.total || 0;
  const orderSubtotal = stateSubtotal || cartData?.subtotal || orderTotal;
  const promoDiscount = statePromoDiscount || cartData?.promoDiscount || 0;
  
  const pointsToUseRatio = parseInt(settings?.points_to_money_ratio || '100', 10);
  const pointsToUse = parseInt(usePoints || '0', 10);
  const discountAmount = Math.floor(pointsToUse / pointsToUseRatio);
  const giftWrapFee = isGift ? 15 : 0;
  const finalAmount = isPointsRedemption ? 0 : Math.max(0, orderTotal + giftWrapFee - discountAmount);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let recipientName = '';
    let recipientPhone = '';
    let fullAddress = '';

    if (!useNewAddr && selectedAddr) {
      recipientName = selectedAddr.name;
      recipientPhone = selectedAddr.phone;
      fullAddress = `${selectedAddr.province} ${selectedAddr.city} ${selectedAddr.district} ${selectedAddr.address}`;
    } else if (useNewAddr) {
      if (!form.name || !form.phone || !form.address) {
        toast.error(t('auto_checkoutpage_105', '请填写完整收货信息'));
        return;
      }
      recipientName = form.name;
      recipientPhone = form.phone;
      fullAddress = `${form.province} ${form.city} ${form.district} ${form.address}`.trim();
    } else {
      toast.error(t('auto_checkoutpage_106', '请选择或填写收货地址'));
      return;
    }

    setSubmitting(true);
    try {
      // 1. 创建订单
      const result: any = await api.post('/orders', {
        items: orderItems,
        recipientName,
        recipientPhone,
        address: fullAddress,
        remark: form.remark,
        payMethod: isPointsRedemption ? 'points' : payMethod,
        usePoints: isPointsRedemption ? pointsTotal : pointsToUse,
        isPointsRedemption,
        isGift,
        giftMessage,
        giftWrapFee
      });

      const { orderNo } = result;

      if (!orderNo) {
        toast.error(t('auto_checkoutpage_107', '创建订单失败'));
        setSubmitting(false);
        return;
      }

      if (isPointsRedemption || finalAmount === 0) {
        // 如果是全积分兑换或抵扣后金额为0，无需调用支付接口，直接模拟支付成功或后端已处理为已支付
        queryClient.invalidateQueries({ queryKey: ['cart'] });
        refreshUser();
        toast.success(isPointsRedemption ? t('auto_checkoutpage_108', '积分兑换成功！') : t('auto_checkoutpage_111', '支付成功！'));
        navigate('/payment/result', { state: { orderNo } });
        return;
      }

      // 2. 创建预支付
      try {
        const paymentResult: any = await api.post('/payment/create', {
          orderNo,
          channel: payMethod,
          returnUrl: `${window.location.origin}/payment/result?orderNo=${orderNo}`,
        });

        if (!paymentResult.success) {
          toast.error(paymentResult.error || t('auto_checkoutpage_110', '创建支付失败'));
          setSubmitting(false);
          return;
        }

        const { type, data } = paymentResult;

        if (type === 'mock') {
          // Mock模式：直接模拟支付成功
          await api.post(`/payment/mock/${orderNo}`);
          queryClient.invalidateQueries({ queryKey: ['cart'] });
          refreshUser(); // 更新积分
          toast.success(t('auto_checkoutpage_111', '支付成功！'));
          navigate('/payment/result', { state: { orderNo } });
          return;
        }

        if (type === 'h5_url') {
          // 跳转到支付平台结账页面 (WeChat H5, Stripe, PayPal)
          window.location.href = data;
          setSubmitting(false);
          return;
        }

        if (type === 'form') {
          // 支付宝：提交表单跳转
          submitAlipayForm(data);
          setSubmitting(false);
          return;
        }

        if (type === 'native_qrcode') {
          // 微信 Native 支付，显示二维码
          setQrData(data);
          setQrOrderNo(orderNo);
          setShowQr(true);
          setSubmitting(false);
          return;
        }

        if (type === 'jsapi') {
          // 微信JSAPI支付（微信内置浏览器）
          // 需要引入WeixinJSBridge（微信自动注入）
          toast.loading(t('auto_checkoutpage_112', '正在唤起微信支付...'), { duration: 2000 });
          setSubmitting(false);
          return;
        }

        setSubmitting(false);
      } catch (payErr: any) {
        // 如果支付创建失败，订单已创建但未支付，用户可以稍后去订单页支付
        console.error(t('auto_checkoutpage_113', '预支付创建失败:'), payErr);
        const errMsg = payErr?.response?.data?.error || payErr?.message;
        toast.error(errMsg ? `支付创建失败: ${errMsg}` : t('auto_checkoutpage_114', '支付创建失败，请前往订单页面重试'));
        navigate('/orders');
      }
    } catch (e: any) {
      toast.error(e.message || t('auto_checkoutpage_115', '订单创建失败'));
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <div className="mb-8 border-b border-stone-200 pb-4">
        <h1 className="text-2xl font-light text-stone-900 tracking-tight">{t('checkout.title', 'Checkout')}</h1>
      </div>

      <form onSubmit={handleSubmit} className="grid md:grid-cols-[1fr_360px] gap-8">
        {/* 收货信息 */}
        <div className="space-y-5">
          <div className="card p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xs font-semibold text-stone-900 tracking-widest uppercase flex items-center gap-2">
                <MapPin size={14} /> {t('checkout.shipping_info', 'Shipping Information')}
              </h2>
              <button type="button" onClick={() => navigate('/profile?tab=address')}
                className="text-xs text-stone-400 hover:text-stone-900 tracking-wider uppercase flex items-center gap-1">
                <Plus size={12} /> {t('checkout.manage_addresses', 'Manage Addresses')}
              </button>
            </div>

            {/* 已保存地址列表 */}
            {addresses?.length > 0 && !useNewAddr && (
              <div className="space-y-2 mb-4">
                {addresses.map((addr: any) => (
                  <label key={addr.id}
                    className={`flex items-start gap-3 p-3 border cursor-pointer transition-colors ${
                      selectedAddrId === addr.id ? 'border-stone-900 bg-stone-50' : 'border-stone-200 hover:border-stone-400'
                    }`}>
                    <input type="radio" name="address" value={addr.id}
                      checked={selectedAddrId === addr.id}
                      onChange={() => { setSelectedAddrId(addr.id); setUseNewAddr(false); }}
                      className="mt-1 accent-stone-900" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-stone-800">{addr.name}</span>
                        <span className="text-xs text-stone-400">{addr.phone}</span>
                        {addr.is_default && (
                          <span className="text-xs bg-stone-900 text-white px-1.5 py-0.5">{t('checkout.default', 'Default')}</span>
                        )}
                      </div>
                      <p className="text-xs text-stone-500">{addr.province} {addr.city} {addr.district} {addr.address}</p>
                    </div>
                    {selectedAddrId === addr.id && <Check size={16} className="text-stone-900 flex-shrink-0" />}
                  </label>
                ))}
                <button type="button" onClick={() => { setUseNewAddr(true); setSelectedAddrId(null); }}
                  className="w-full text-center text-xs text-stone-400 hover:text-stone-900 py-2 border border-dashed border-stone-300 hover:border-stone-500 transition-colors tracking-wider uppercase">
                  {t('checkout.use_new_address', 'Use New Address')}
                </button>
              </div>
            )}

            {/* 新地址表单 */}
            {useNewAddr && (
              <div className="mb-4 p-4 border border-stone-900 bg-stone-50">
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="text-xs text-stone-400 mb-1 block tracking-wider">{t('checkout.recipient', 'Recipient *')}</label>
                    <input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} required
                      className="w-full border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:border-stone-900 bg-white" />
                  </div>
                  <div>
                    <label className="text-xs text-stone-400 mb-1 block tracking-wider">{t('checkout.phone', 'Phone *')}</label>
                    <input value={form.phone} onChange={e => setForm(f => ({...f, phone: e.target.value}))} required
                      className="w-full border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:border-stone-900 bg-white" />
                  </div>
                  <div>
                    <label className="text-xs text-stone-400 mb-1 block tracking-wider">{t('checkout.province', 'Province')}</label>
                    <input value={form.province} onChange={e => setForm(f => ({...f, province: e.target.value}))} placeholder={t('checkout.placeholder_province', 'e.g. Guangdong')}
                      className="w-full border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:border-stone-900 bg-white" />
                  </div>
                  <div>
                    <label className="text-xs text-stone-400 mb-1 block tracking-wider">{t('checkout.city', 'City')}</label>
                    <input value={form.city} onChange={e => setForm(f => ({...f, city: e.target.value}))} placeholder={t('checkout.placeholder_city', 'e.g. Shenzhen')}
                      className="w-full border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:border-stone-900 bg-white" />
                  </div>
                  <div>
                    <label className="text-xs text-stone-400 mb-1 block tracking-wider">{t('checkout.district', 'District')}</label>
                    <input value={form.district} onChange={e => setForm(f => ({...f, district: e.target.value}))}
                      className="w-full border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:border-stone-900 bg-white" />
                  </div>
                  <div>
                    <label className="text-xs text-stone-400 mb-1 block tracking-wider">{t('checkout.address_detail', 'Detailed Address *')}</label>
                    <input value={form.address} onChange={e => setForm(f => ({...f, address: e.target.value}))} required placeholder={t('checkout.placeholder_address', 'Street, building, etc.')}
                      className="w-full border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:border-stone-900 bg-white" />
                  </div>
                </div>
                <button type="button" onClick={() => setUseNewAddr(false)}
                  className="text-xs text-stone-400 hover:text-stone-900 tracking-wider">
                  {addresses?.length > 0 ? t('checkout.back_to_saved', '← Choose Saved Address') : ''}
                </button>
              </div>
            )}

            {!addresses?.length && !useNewAddr && (
              <p className="text-sm text-stone-400 mb-3">{t('checkout.no_saved_address', 'No saved addresses, please fill in a new address')}</p>
            )}

            {(!addresses?.length || useNewAddr) && !useNewAddr && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-stone-400 mb-2 block tracking-wider uppercase">{t('checkout.recipient', 'Recipient *')}</label>
                  <input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} required className="w-full border border-stone-300 px-4 py-2.5 text-sm focus:outline-none focus:border-stone-900" />
                </div>
                <div>
                  <label className="text-xs text-stone-400 mb-2 block tracking-wider uppercase">{t('checkout.phone', 'Phone *')}</label>
                  <input value={form.phone} onChange={e => setForm(f => ({...f, phone: e.target.value}))} required className="w-full border border-stone-300 px-4 py-2.5 text-sm focus:outline-none focus:border-stone-900" />
                </div>
                <div>
                  <label className="text-xs text-stone-400 mb-2 block tracking-wider uppercase">{t('checkout.province', 'Province')}</label>
                  <input value={form.province} onChange={e => setForm(f => ({...f, province: e.target.value}))} placeholder={t('checkout.placeholder_province', 'e.g. Guangdong')} className="w-full border border-stone-300 px-4 py-2.5 text-sm focus:outline-none focus:border-stone-900" />
                </div>
                <div>
                  <label className="text-xs text-stone-400 mb-2 block tracking-wider uppercase">{t('checkout.city', 'City')}</label>
                  <input value={form.city} onChange={e => setForm(f => ({...f, city: e.target.value}))} placeholder={t('checkout.placeholder_city', 'e.g. Shenzhen')} className="w-full border border-stone-300 px-4 py-2.5 text-sm focus:outline-none focus:border-stone-900" />
                </div>
                <div>
                  <label className="text-xs text-stone-400 mb-2 block tracking-wider uppercase">{t('checkout.district', 'District')}</label>
                  <input value={form.district} onChange={e => setForm(f => ({...f, district: e.target.value}))} className="w-full border border-stone-300 px-4 py-2.5 text-sm focus:outline-none focus:border-stone-900" />
                </div>
                <div>
                  <label className="text-xs text-stone-400 mb-2 block tracking-wider uppercase">{t('checkout.address_detail', 'Detailed Address *')}</label>
                  <input value={form.address} onChange={e => setForm(f => ({...f, address: e.target.value}))} required placeholder={t('checkout.placeholder_address', 'Street, building, etc.')} className="w-full border border-stone-300 px-4 py-2.5 text-sm focus:outline-none focus:border-stone-900" />
                </div>
              </div>
            )}

            <div className="mt-4">
              <label className="text-xs text-stone-400 mb-2 block tracking-wider uppercase">{t('checkout.remark', 'Order Remark')}</label>
              <textarea value={form.remark} onChange={e => setForm(f => ({...f, remark: e.target.value}))} rows={2}
                className="w-full border border-stone-300 px-4 py-2.5 text-sm focus:outline-none focus:border-stone-900"
                placeholder={t('checkout.placeholder_remark', 'Special requests...')} />
            </div>

            {/* 礼品定制 (Phase 1) */}
            {settings?.feature_gifting === '1' && !isPointsRedemption && (
              <div className="mt-6 pt-6 border-t border-stone-100">
                <label className="flex items-center gap-2 cursor-pointer group mb-3">
                  <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${isGift ? 'bg-rose-500 border-rose-500' : 'border-stone-300 group-hover:border-rose-400'}`}>
                    {isGift && <Check size={12} className="text-white" />}
                  </div>
                  <input type="checkbox" checked={isGift} onChange={e => setIsGift(e.target.checked)} className="hidden" />
                  <span className="text-xs font-medium text-stone-700 uppercase tracking-wider">{t('checkout.is_gift', 'This is a gift (+¥15 Wrapping Fee)')}</span>
                </label>
                
                {isGift && (
                  <div className="pl-6 animate-in fade-in slide-in-from-top-2 duration-300">
                    <label className="text-xs text-stone-400 mb-2 block tracking-wider uppercase">{t('checkout.gift_message', 'Free Gift Message')}</label>
                    <textarea value={giftMessage} onChange={e => setGiftMessage(e.target.value)} rows={3}
                      className="w-full border border-stone-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-rose-400 focus:ring-1 focus:ring-rose-400 bg-stone-50/50"
                      placeholder={t('checkout.placeholder_gift', 'Dear...')} />
                    <p className="text-[10px] text-stone-400 mt-1.5">{t('checkout.gift_notice', 'We will handwrite it on a card...')}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 支付方式 */}
          <div className="card p-6">
            {!isPointsRedemption && (
              <>
                <h2 className="text-xs font-semibold text-stone-900 mb-5 tracking-widest uppercase">{t('checkout.payment_method', 'Payment Method')}</h2>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: 'wechat' as const, label: t('checkout.wechat_pay', 'WeChat Pay'), icon: Wallet, color: 'text-green-600' },
                    { value: 'alipay' as const, label: t('checkout.alipay', 'Alipay'), icon: CreditCard, color: 'text-blue-600' },
                    { value: 'visa' as const, label: t('checkout.visa', 'Visa / Credit Card'), icon: CreditCard, color: 'text-blue-800' },
                    { value: 'paypal' as const, label: t('checkout.paypal', 'PayPal'), icon: Wallet, color: 'text-sky-600' },
                  ].filter(m => {
                    if (m.value === 'wechat') return settings?.wechat_enabled !== '0';
                    if (m.value === 'alipay') return settings?.alipay_enabled !== '0';
                    if (m.value === 'visa') return settings?.stripe_enabled !== '0';
                    if (m.value === 'paypal') return settings?.paypal_enabled !== '0';
                    return true;
                  }).map(m => (
                    <label key={m.value} className={`flex items-center gap-3 p-4 border cursor-pointer transition-colors ${payMethod === m.value ? 'border-stone-900 bg-stone-50' : 'border-stone-200 hover:border-stone-400'}`}>
                      <input type="radio" name="payMethod" value={m.value} checked={payMethod === m.value} onChange={() => setPayMethod(m.value)} className="sr-only" />
                      <m.icon size={20} className={m.color} />
                      <span className="text-sm font-medium text-stone-700 tracking-wider">{m.label}</span>
                    </label>
                  ))}
                </div>
                {isWechatBrowser() && (
                  <p className="text-xs text-stone-400 mt-3">
                    {t('checkout.wechat_browser_notice', 'WeChat Browser detected, will use JSAPI payment')}
                  </p>
                )}
              </>
            )}
            {isPointsRedemption && (
               <div className="p-4 bg-stone-50 border border-stone-200 rounded-lg">
                 <p className="text-sm text-stone-700 flex items-center gap-2">
                   <Coins size={16} className="text-rose-500" />
                   {t('checkout.points_redemption_notice', 'This order will be fully redeemed with points')}
                 </p>
               </div>
            )}
          </div>

          {/* 积分抵扣 */}
          {user && user.points > 0 && !isPointsRedemption && settings?.map?.points_discount_enabled === '1' && (
            <div className="card p-6 mt-5">
              <h2 className="text-xs font-semibold text-stone-900 mb-5 tracking-widest uppercase flex items-center gap-2">
                <Coins size={16} /> {t('checkout.points_discount', 'Points Discount')}
              </h2>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <p className="text-sm text-stone-700">{t('checkout.available_points', 'Available Points:')} <span className="font-semibold text-rose-500">{user.points}</span></p>
                  <p className="text-xs text-stone-400 mt-1">{t('checkout.points_exchange_rate', '{{ratio}} points = ¥1.00, up to ¥{{max}}', { ratio: pointsToUseRatio, max: Math.min(Math.floor(user.points / pointsToUseRatio), orderTotal).toFixed(2) })}</p>
                </div>
                <div>
                  <input 
                    type="number" 
                    min="0" 
                    max={Math.min(user.points, Math.ceil(orderTotal * pointsToUseRatio))}
                    step={pointsToUseRatio}
                    placeholder={t('checkout.placeholder_points', 'Enter points to use')}
                    value={usePoints}
                    onChange={(e) => {
                      let val = parseInt(e.target.value);
                      if (isNaN(val) || val < 0) val = 0;
                      if (val > user.points) val = user.points;
                      if (val > Math.ceil(orderTotal * pointsToUseRatio)) val = Math.ceil(orderTotal * pointsToUseRatio);
                      setUsePoints(e.target.value ? val.toString() : '');
                    }}
                    className="w-32 border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:border-stone-900"
                  />
                </div>
              </div>
            </div>
          )}          {/* 免费小样自选 (Phase 2) */}
          {settings?.feature_free_samples === '1' && samplesData && samplesData.length > 0 && !isPointsRedemption && (
            <div className="card p-6 mt-5 border-rose-100">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xs font-semibold text-stone-900 tracking-widest uppercase flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-rose-500 rounded-full"></span> {t('checkout.free_samples', 'Add Free Samples for ¥0')}
                </h2>
                <span className="text-xs text-stone-400">{t('checkout.selected_samples', 'Selected {{count}}/2', { count: selectedSamples.length })}</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {samplesData.map((sample: any) => {
                  const isSelected = selectedSamples.includes(sample.id);
                  return (
                    <div 
                      key={sample.id} 
                      onClick={() => toggleSample(sample.id)}
                      className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-all ${
                        isSelected ? 'border-rose-400 bg-rose-50' : 'border-stone-200 hover:border-stone-300'
                      }`}
                    >
                      <img src={sample.main_image} alt={sample.name} className="w-12 h-12 object-cover rounded-lg" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-stone-800 truncate">{sample.name}</p>
                        <p className="text-xs text-stone-400 truncate mt-0.5">{sample.description || t('checkout.sample', 'Sample')}</p>
                        <p className="text-xs font-medium text-rose-500 mt-1">¥0.00</p>
                      </div>
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center border transition-colors ${
                        isSelected ? 'bg-rose-500 border-rose-500 text-white' : 'border-stone-300 text-transparent'
                      }`}>
                        <Check size={12} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* 订单汇总 */}
        <div>
          <div className="card p-6 sticky top-20">
            <h2 className="text-xs font-semibold text-stone-900 mb-5 tracking-widest uppercase">{t('checkout.summary', 'Order Summary')}</h2>
            <div className="text-xs text-stone-400 mb-4 space-y-1">
              <p>{t('checkout.items_count', '{{count}} items', { count: orderItems.length })}</p>
            </div>
            
            <div className="space-y-3 border-t border-stone-200 pt-4 mb-5">
              {!isPointsRedemption ? (
                <>
                  <div className="flex justify-between items-baseline text-sm text-stone-600">
                    <span>{t('checkout.subtotal', 'Subtotal')}</span>
                    <span>¥{orderSubtotal.toFixed(2)}</span>
                  </div>
                  {promoDiscount > 0 && (
                    <div className="flex justify-between items-baseline text-sm text-rose-500">
                      <span>{t('checkout.promo_discount', 'Promotion Discount')}</span>
                      <span>-¥{promoDiscount.toFixed(2)}</span>
                    </div>
                  )}
                  {isGift && (
                    <div className="flex justify-between items-baseline text-sm text-stone-600">
                      <span>{t('checkout.gift_fee', 'Gift Wrapping Fee')}</span>
                      <span>+¥{giftWrapFee.toFixed(2)}</span>
                    </div>
                  )}
                  {discountAmount > 0 && (
                    <div className="flex justify-between items-baseline text-sm text-rose-500">
                      <span>{t('checkout.points_deducted', 'Points Deducted (-{{points}} points)', { points: pointsToUse })}</span>
                      <span>-¥{discountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-baseline pt-2">
                    <span className="text-xs text-stone-400 tracking-widest uppercase">{t('checkout.final_amount', 'Final Amount')}</span>
                    <span className="text-2xl font-semibold text-stone-900">¥{finalAmount.toFixed(2)}</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between items-baseline text-sm text-rose-500">
                    <span>{t('checkout.use_points_label', 'Used Points')}</span>
                    <span>-{t('checkout.points_value', '{{points}} points', { points: pointsTotal })}</span>
                  </div>
                  <div className="flex justify-between items-baseline pt-2">
                    <span className="text-xs text-stone-400 tracking-widest uppercase">{t('checkout.final_amount', 'Final Amount')}</span>
                    <span className="text-2xl font-semibold text-stone-900">¥0.00</span>
                  </div>
                </>
              )}
            </div>
            <button type="submit" disabled={submitting} className="w-full btn-primary disabled:opacity-50 flex items-center justify-center gap-2">
              {submitting && <Loader2 size={16} className="animate-spin" />}
              {submitting ? t('checkout.processing', 'Processing...') : (isPointsRedemption || finalAmount === 0 ? t('checkout.confirm_redemption', 'Confirm Redemption') : t('checkout.submit_pay', 'Submit & Pay'))}
            </button>
            <p className="text-xs text-stone-400 text-center mt-3 tracking-wider">
              {isPointsRedemption || finalAmount === 0 ? t('checkout.no_payment_needed', 'Fully deducted, no payment needed') : t('checkout.redirect_notice', 'You will be redirected to payment page')}
            </p>
          </div>
        </div>
      </form>

      {/* 微信支付二维码弹窗 */}
      {showQr && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl relative">
            <button 
              onClick={() => {
                setShowQr(false);
                toast.success(t('checkout.qr_close_notice', '您可以在订单详情页继续支付'));
                navigate('/orders');
              }}
              className="absolute top-4 right-4 text-stone-400 hover:text-stone-900"
            >
              <Plus size={24} className="rotate-45" />
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
