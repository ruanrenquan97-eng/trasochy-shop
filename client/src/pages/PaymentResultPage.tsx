import { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { CheckCircle2, XCircle, Loader2, ShoppingBag, ArrowLeft } from 'lucide-react';
import api from '../utils/api';
import { pollPaymentResult } from '../utils/usePayment';
import { useTranslation } from "react-i18next";

type PayStatus = 'loading' | 'success' | 'failed' | 'timeout';

export default function PaymentResultPage() {
    const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const orderNo = searchParams.get('orderNo') || location.state?.orderNo || '';
  const [status, setStatus] = useState<PayStatus>('loading');
  const [order, setOrder] = useState<any>(null);
  const pollRef = useRef<{ stop: () => void } | null>(null);

  useEffect(() => {
    if (!orderNo) {
      setStatus('failed');
      return;
    }

    // 启动轮询
    const poll = pollPaymentResult(
      orderNo,
      () => {
        setStatus('success');
        // 获取订单详情
        fetchOrderDetail();
      },
      () => {
        // 超时或失败 - 再检查一次数据库
        fetchOrderDetail();
      },
      15,  // 最多15次
      2000 // 每2秒
    );
    pollRef.current = poll;

    return () => {
      poll.stop();
    };
  }, [orderNo]);

  const fetchOrderDetail = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setStatus('timeout');
        return;
      }
      const res = await api.get(`/orders/${orderNo}`);
      const data = res as any;
      setOrder(data);
      if (data.status === 'paid') {
        setStatus('success');
      } else if (data.status === 'cancelled') {
        setStatus('failed');
      }
    } catch {
      setStatus('timeout');
    }
  };

  // 获取当前域名
  const baseUrl = window.location.origin;

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        {/* 状态卡片 */}
        <div className="card p-8 text-center">
          {/* Loading */}
          {status === 'loading' && (
            <>
              <div className="w-16 h-16 mx-auto mb-6 flex items-center justify-center">
                <Loader2 size={40} className="text-stone-400 animate-spin" />
              </div>
              <h1 className="text-xl font-light text-stone-900 tracking-tight mb-2">{t('auto_paymentresultpage_176', t('auto_paymentresultpage_176', '等待支付结果'))}</h1>
              <p className="text-sm text-stone-400">{t('auto_paymentresultpage_177', t('auto_paymentresultpage_177', '正在确认支付状态，请稍候...'))}</p>
              <div className="mt-6 flex justify-center gap-1">
                {[0, 1, 2].map(i => (
                  <div key={i} className="w-2 h-2 rounded-full bg-stone-300 animate-bounce"
                    style={{ animationDelay: `${i * 0.2}s` }} />
                ))}
              </div>
            </>
          )}

          {/* Success */}
          {status === 'success' && (
            <>
              <div className="w-16 h-16 mx-auto mb-6 flex items-center justify-center rounded-full bg-green-50">
                <CheckCircle2 size={40} className="text-green-600" />
              </div>
              <h1 className="text-xl font-light text-stone-900 tracking-tight mb-2">{t('auto_paymentresultpage_178', t('auto_paymentresultpage_178', '支付成功'))}</h1>
              <p className="text-sm text-stone-400 mb-4">订单号：{orderNo}</p>
              {order && (
                <div className="text-left bg-stone-50 rounded-lg p-4 mb-6 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-stone-400">{t('auto_paymentresultpage_179', t('auto_paymentresultpage_179', '支付金额'))}</span>
                    <span className="text-stone-900 font-semibold">¥{order.pay_amount?.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-stone-400">{t('auto_paymentresultpage_180', t('auto_paymentresultpage_180', '支付方式'))}</span>
                    <span className="text-stone-700">{order.pay_method === 'wechat' ? t('auto_paymentresultpage_192', '微信支付') : order.pay_method === 'alipay' ? t('auto_paymentresultpage_193', '支付宝') : '-'}</span>
                  </div>
                  {order.trade_no && (
                    <div className="flex justify-between text-sm">
                      <span className="text-stone-400">{t('auto_paymentresultpage_181', t('auto_paymentresultpage_181', '交易号'))}</span>
                      <span className="text-stone-700 text-xs font-mono">{order.trade_no}</span>
                    </div>
                  )}
                </div>
              )}
              <div className="flex gap-3">
                <button onClick={() => navigate('/orders')}
                  className="flex-1 btn-primary flex items-center justify-center gap-2">
                  <ShoppingBag size={16} /> {t('auto_paymentresultpage_189', '查看订单')}
                </button>
                <button onClick={() => navigate('/')}
                  className="flex-1 border border-stone-200 text-stone-700 py-2.5 text-sm hover:bg-stone-50 transition-colors">
                  {t('auto_paymentresultpage_183', '继续购物')}
                </button>
              </div>
            </>
          )}

          {/* Failed */}
          {status === 'failed' && (
            <>
              <div className="w-16 h-16 mx-auto mb-6 flex items-center justify-center rounded-full bg-red-50">
                <XCircle size={40} className="text-red-500" />
              </div>
              <h1 className="text-xl font-light text-stone-900 tracking-tight mb-2">{t('auto_paymentresultpage_184', t('auto_paymentresultpage_184', '支付未完成'))}</h1>
              <p className="text-sm text-stone-400 mb-6">订单号：{orderNo}</p>
              <div className="flex gap-3">
                <button onClick={() => navigate('/cart')}
                  className="flex-1 btn-primary">
                  {t('auto_paymentresultpage_185', '重新下单')}
                </button>
                <button onClick={() => navigate('/orders')}
                  className="flex-1 border border-stone-200 text-stone-700 py-2.5 text-sm hover:bg-stone-50 transition-colors flex items-center justify-center gap-2">
                  <ArrowLeft size={14} /> {t('auto_shoplayout_347', '我的订单')}
                </button>
              </div>
            </>
          )}

          {/* Timeout */}
          {status === 'timeout' && (
            <>
              <div className="w-16 h-16 mx-auto mb-6 flex items-center justify-center rounded-full bg-amber-50">
                <Loader2 size={40} className="text-amber-500" />
              </div>
              <h1 className="text-xl font-light text-stone-900 tracking-tight mb-2">{t('auto_paymentresultpage_187', t('auto_paymentresultpage_187', '支付确认中'))}</h1>
              <p className="text-sm text-stone-400 mb-6">
                {t('auto_paymentresultpage_188', '支付结果确认超时，请前往订单页面查看支付状态。')}
              </p>
              <div className="flex gap-3">
                <button onClick={() => navigate('/orders')}
                  className="flex-1 btn-primary flex items-center justify-center gap-2">
                  <ShoppingBag size={16} /> {t('auto_paymentresultpage_189', '查看订单')}
                </button>
                <button onClick={() => navigate('/')}
                  className="flex-1 border border-stone-200 text-stone-700 py-2.5 text-sm hover:bg-stone-50 transition-colors">
                  {t('auto_quizpage_269', '返回首页')}
                </button>
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  );
}
