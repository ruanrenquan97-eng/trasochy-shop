import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuthStore } from '../contexts/authStore';
import { useTranslation } from 'react-i18next';
import api from '../utils/api';

export default function RegisterPage() {
  const { register, isLoading } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const query = new URLSearchParams(location.search);
  const initialRef = query.get('ref') || localStorage.getItem('referralCode') || '';
  const [regMethod, setRegMethod] = useState<'phone' | 'email'>('phone');
  const [form, setForm] = useState({ email: '', password: '', confirmPassword: '', name: '', phone: '', captchaCode: '', captchaToken: '', referralCode: initialRef });
  const [captchaSvg, setCaptchaSvg] = useState('');

  const fetchCaptcha = async () => {
    try {
      const res: any = await api.get('/auth/captcha');
      setForm(f => ({ ...f, captchaToken: res.token, captchaCode: '' }));
      setCaptchaSvg(res.svg);
    } catch (e: any) {
      toast.error('获取验证码失败');
    }
  };

  useEffect(() => {
    if (regMethod === 'phone') {
      fetchCaptcha();
    }
  }, [regMethod]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) { toast.error('Passwords do not match'); return; }
    try {
      const payload: any = { 
        password: form.password, 
        name: form.name, 
        referralCode: form.referralCode 
      };
      if (regMethod === 'phone') {
        payload.phone = form.phone;
        payload.captchaCode = form.captchaCode;
        payload.captchaToken = form.captchaToken;
      } else {
        payload.email = form.email;
      }
      
      await register(payload);
      toast.success('Account created!');
      navigate('/');
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="max-w-sm mx-auto px-4 py-16">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-extralight text-stone-900 tracking-tight mb-3">{t('auth.register_title', 'Create Account')}</h1>
        <p className="text-stone-400 text-xs tracking-widest uppercase">{t('auth.register_subtitle', 'Join the TRASOCHY family')}</p>
      </div>
      <form onSubmit={handleSubmit} className="card p-8 space-y-5">
        <div className="flex bg-stone-100 p-1 rounded-lg mb-6">
          <button type="button" onClick={() => setRegMethod('phone')} className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${regMethod === 'phone' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}>
            手机号注册
          </button>
          <button type="button" onClick={() => setRegMethod('email')} className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${regMethod === 'email' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}>
            邮箱注册
          </button>
        </div>

        <div>
          <label className="text-xs text-stone-400 mb-2 block tracking-widest uppercase">{t('auth.name', 'Name *')}</label>
          <input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} required className="w-full border border-stone-300 px-4 py-3 text-sm focus:outline-none focus:border-stone-900" />
        </div>
        
        {regMethod === 'phone' ? (
          <>
            <div>
              <label className="text-xs text-stone-400 mb-2 block tracking-widest uppercase">{t('auth.phone', 'Phone *')}</label>
              <input type="tel" value={form.phone} onChange={e => setForm(f => ({...f, phone: e.target.value}))} required className="w-full border border-stone-300 px-4 py-3 text-sm focus:outline-none focus:border-stone-900" />
            </div>
            <div>
              <label className="text-xs text-stone-400 mb-2 block tracking-widest uppercase">图形验证码 *</label>
              <div className="flex gap-2">
                <input type="text" value={form.captchaCode} onChange={e => setForm(f => ({...f, captchaCode: e.target.value}))} required className="flex-1 border border-stone-300 px-4 py-3 text-sm focus:outline-none focus:border-stone-900" placeholder="请输入右侧验证码" />
                <div 
                  className="w-28 h-12 border border-stone-300 bg-stone-50 cursor-pointer overflow-hidden flex items-center justify-center shrink-0" 
                  onClick={fetchCaptcha}
                  dangerouslySetInnerHTML={{ __html: captchaSvg }}
                  title="点击刷新"
                ></div>
              </div>
            </div>
          </>
        ) : (
          <div>
            <label className="text-xs text-stone-400 mb-2 block tracking-widest uppercase">{t('auth.email', 'Email *')}</label>
            <input type="email" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} required className="w-full border border-stone-300 px-4 py-3 text-sm focus:outline-none focus:border-stone-900" />
          </div>
        )}
        <div>
          <label className="text-xs text-stone-400 mb-2 block tracking-widest uppercase">{t('auth.password_register', 'Password * (min. 6 chars)')}</label>
          <input type="password" value={form.password} onChange={e => setForm(f => ({...f, password: e.target.value}))} required minLength={6} className="w-full border border-stone-300 px-4 py-3 text-sm focus:outline-none focus:border-stone-900" />
        </div>
        <div>
          <label className="text-xs text-stone-400 mb-2 block tracking-widest uppercase">{t('auth.confirm_password', 'Confirm Password *')}</label>
          <input type="password" value={form.confirmPassword} onChange={e => setForm(f => ({...f, confirmPassword: e.target.value}))} required className="w-full border border-stone-300 px-4 py-3 text-sm focus:outline-none focus:border-stone-900" />
        </div>
        <div>
          <label className="text-xs text-stone-400 mb-2 block tracking-widest uppercase">{t('auth.referral', 'Referral Code (Optional)')}</label>
          <input type="text" value={form.referralCode} onChange={e => setForm(f => ({...f, referralCode: e.target.value}))} placeholder={t('auth.placeholder_referral', 'If someone invited you')} className="w-full border border-stone-300 px-4 py-3 text-sm focus:outline-none focus:border-stone-900" />
        </div>
        <button type="submit" disabled={isLoading} className="w-full btn-primary mt-2 disabled:opacity-50">
          {isLoading ? t('auth.creating', 'Creating...') : t('auth.create_account', 'Create Account')}
        </button>
        <p className="text-center text-xs text-stone-400 tracking-wider">
          {t('auth.have_account', 'Have an account?')} <Link to="/login" className="text-stone-900 hover:underline uppercase tracking-wider">{t('auth.sign_in', 'Sign In')}</Link>
        </p>
      </form>
    </div>
  );
}
