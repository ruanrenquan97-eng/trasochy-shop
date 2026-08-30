import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuthStore } from '../contexts/authStore';
import { useTranslation } from 'react-i18next';
import api from '../utils/api';
import { CheckCircle, XCircle, Loader } from 'lucide-react';

export default function RegisterPage() {
  const { register, isLoading } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const query = new URLSearchParams(location.search);
  const initialRef = query.get('ref') || localStorage.getItem('referralCode') || '';

  const [form, setForm] = useState({
    username: '',
    name: '',
    password: '',
    confirmPassword: '',
    referralCode: initialRef,
  });

  // 用户名可用性检查状态
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');
  const [usernameMsg, setUsernameMsg] = useState('');

  // 防抖检查用户名
  const checkUsername = useCallback(async (val: string) => {
    const u = val.toLowerCase().trim();
    if (!u) { setUsernameStatus('idle'); setUsernameMsg(''); return; }
    if (!/^[a-z0-9_]{4,20}$/.test(u)) {
      setUsernameStatus('invalid');
      setUsernameMsg('只能包含字母、数字和下划线，长度 4-20 位');
      return;
    }
    setUsernameStatus('checking');
    try {
      const res: any = await api.get(`/auth/check-username?u=${encodeURIComponent(u)}`);
      setUsernameStatus(res.available ? 'available' : 'taken');
      setUsernameMsg(res.reason || '');
    } catch {
      setUsernameStatus('idle');
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => checkUsername(form.username), 500);
    return () => clearTimeout(timer);
  }, [form.username, checkUsername]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      toast.error('两次输入的密码不一致');
      return;
    }
    if (usernameStatus !== 'available') {
      toast.error('请先确保用户名可用');
      return;
    }
    try {
      await register({
        username: form.username.toLowerCase().trim(),
        name: form.name.trim() || undefined,
        password: form.password,
        referralCode: form.referralCode || undefined,
      });
      toast.success('账号创建成功！');
      navigate('/');
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const usernameIcon = () => {
    if (usernameStatus === 'checking') return <Loader size={14} className="animate-spin text-stone-400" />;
    if (usernameStatus === 'available') return <CheckCircle size={14} className="text-emerald-500" />;
    if (usernameStatus === 'taken' || usernameStatus === 'invalid') return <XCircle size={14} className="text-red-400" />;
    return null;
  };

  return (
    <div className="max-w-sm mx-auto px-4 py-16">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-extralight text-stone-900 tracking-tight mb-3">
          {t('auth.register_title', 'Create Account')}
        </h1>
        <p className="text-stone-400 text-xs tracking-widest uppercase">
          {t('auth.register_subtitle', 'Join the TRASOCHY family')}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="card p-8 space-y-5">

        {/* 用户名 */}
        <div>
          <label className="text-xs text-stone-400 mb-2 block tracking-widest uppercase">
            用户名 *
          </label>
          <div className="relative">
            <input
              type="text"
              value={form.username}
              onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
              required
              placeholder="4-20位字母、数字或下划线"
              autoComplete="username"
              className={`w-full border px-4 py-3 pr-10 text-sm focus:outline-none focus:border-stone-900 ${
                usernameStatus === 'available' ? 'border-emerald-400' :
                usernameStatus === 'taken' || usernameStatus === 'invalid' ? 'border-red-300' :
                'border-stone-300'
              }`}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2">
              {usernameIcon()}
            </span>
          </div>
          {usernameMsg && (
            <p className={`text-xs mt-1 ${usernameStatus === 'available' ? 'text-emerald-500' : 'text-red-400'}`}>
              {usernameStatus === 'available' ? '✓ 该用户名可以使用' : usernameMsg}
            </p>
          )}
          {usernameStatus === 'idle' && form.username === '' && (
            <p className="text-xs mt-1 text-stone-400">用于登录，注册后不可更改</p>
          )}
        </div>

        {/* 昵称 */}
        <div>
          <label className="text-xs text-stone-400 mb-2 block tracking-widest uppercase">
            {t('auth.name', 'Nickname')} <span className="normal-case">(可选，留空则使用用户名)</span>
          </label>
          <input
            type="text"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="您的显示名称"
            className="w-full border border-stone-300 px-4 py-3 text-sm focus:outline-none focus:border-stone-900"
          />
        </div>

        {/* 密码 */}
        <div>
          <label className="text-xs text-stone-400 mb-2 block tracking-widest uppercase">
            {t('auth.password_register', 'Password * (min. 6 chars)')}
          </label>
          <input
            type="password"
            value={form.password}
            onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
            required
            minLength={6}
            autoComplete="new-password"
            className="w-full border border-stone-300 px-4 py-3 text-sm focus:outline-none focus:border-stone-900"
          />
        </div>

        {/* 确认密码 */}
        <div>
          <label className="text-xs text-stone-400 mb-2 block tracking-widest uppercase">
            {t('auth.confirm_password', 'Confirm Password *')}
          </label>
          <input
            type="password"
            value={form.confirmPassword}
            onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))}
            required
            autoComplete="new-password"
            className={`w-full border px-4 py-3 text-sm focus:outline-none focus:border-stone-900 ${
              form.confirmPassword && form.confirmPassword !== form.password ? 'border-red-300' : 'border-stone-300'
            }`}
          />
          {form.confirmPassword && form.confirmPassword !== form.password && (
            <p className="text-xs text-red-400 mt-1">两次密码不一致</p>
          )}
        </div>

        {/* 推荐码 */}
        <div>
          <label className="text-xs text-stone-400 mb-2 block tracking-widest uppercase">
            {t('auth.referral', 'Referral Code (Optional)')}
          </label>
          <input
            type="text"
            value={form.referralCode}
            onChange={e => setForm(f => ({ ...f, referralCode: e.target.value }))}
            placeholder={t('auth.placeholder_referral', 'If someone invited you')}
            className="w-full border border-stone-300 px-4 py-3 text-sm focus:outline-none focus:border-stone-900"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading || usernameStatus !== 'available'}
          className="w-full btn-primary mt-2 disabled:opacity-50"
        >
          {isLoading ? t('auth.creating', 'Creating...') : t('auth.create_account', 'Create Account')}
        </button>

        <p className="text-center text-xs text-stone-400 tracking-wider">
          {t('auth.have_account', 'Have an account?')}{' '}
          <Link to="/login" className="text-stone-900 hover:underline uppercase tracking-wider">
            {t('auth.sign_in', 'Sign In')}
          </Link>
        </p>
      </form>
    </div>
  );
}
