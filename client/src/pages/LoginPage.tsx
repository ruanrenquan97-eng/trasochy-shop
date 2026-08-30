import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuthStore } from '../contexts/authStore';
import { useTranslation } from 'react-i18next';

export default function LoginPage() {
  const { login, isLoading } = useAuthStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect');
  const { t } = useTranslation();
  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(account, password);
      toast.success('登录成功！');
      const currentUser = useAuthStore.getState().user;
      if (redirect) {
        navigate(redirect);
      } else if (currentUser?.level === 'admin' || currentUser?.level === 'staff') {
        navigate('/admin');
      } else {
        navigate('/');
      }
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="max-w-sm mx-auto px-4 py-20">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-extralight text-stone-900 tracking-tight mb-3">
          {t('auth.login_title', 'Sign In')}
        </h1>
        <p className="text-stone-400 text-xs tracking-widest uppercase">
          {t('auth.login_subtitle', 'Welcome to TRASOCHY')}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="card p-8 space-y-5">
        <div>
          <label className="text-xs text-stone-400 mb-2 block tracking-widest uppercase">
            用户名 / 邮箱 / 手机号
          </label>
          <input
            type="text"
            value={account}
            onChange={e => setAccount(e.target.value)}
            required
            placeholder="输入您的账号"
            autoComplete="username"
            className="w-full border border-stone-300 px-4 py-3 text-sm focus:outline-none focus:border-stone-900"
          />
        </div>

        <div>
          <label className="text-xs text-stone-400 mb-2 block tracking-widest uppercase">
            {t('auth.password', 'Password')}
          </label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            placeholder="••••••"
            autoComplete="current-password"
            className="w-full border border-stone-300 px-4 py-3 text-sm focus:outline-none focus:border-stone-900"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full btn-primary mt-2 disabled:opacity-50"
        >
          {isLoading ? t('auth.signing_in', 'Signing in...') : t('auth.sign_in', 'Sign In')}
        </button>

        {/* 老用户提示 */}
        <div className="bg-stone-50 border border-stone-100 rounded-xl px-4 py-3 text-xs text-stone-500 leading-relaxed">
          <span className="font-medium text-stone-700">老用户提示：</span>
          如果您之前用邮箱或手机号注册，可以直接继续用原有邮箱或手机号登录，无需重新注册。
        </div>

        <p className="text-center text-xs text-stone-400 tracking-wider">
          {t('auth.no_account', 'No account?')}{' '}
          <Link to="/register" className="text-stone-900 hover:underline uppercase tracking-wider">
            {t('auth.join_us', 'Join Us')}
          </Link>
        </p>
      </form>
    </div>
  );
}
