import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuthStore } from '../contexts/authStore';
import { useTranslation } from 'react-i18next';

export default function LoginPage() {
  const { login, isLoading } = useAuthStore();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(email, password);
      toast.success('Welcome back!');
      navigate('/');
    } catch (e: any) {
      toast.error(e.message);
    }
  };


  return (
    <div className="max-w-sm mx-auto px-4 py-20">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-extralight text-stone-900 tracking-tight mb-3">{t('auth.login_title', 'Sign In')}</h1>
        <p className="text-stone-400 text-xs tracking-widest uppercase">{t('auth.login_subtitle', 'Welcome to TRASOCHY')}</p>
      </div>
      <form onSubmit={handleSubmit} className="card p-8 space-y-5">
        <div>
          <label className="text-xs text-stone-400 mb-2 block tracking-widest uppercase">{t('auth.email', 'Email')}</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="your@email.com" className="w-full border border-stone-300 px-4 py-3 text-sm focus:outline-none focus:border-stone-900" />
        </div>
        <div>
          <label className="text-xs text-stone-400 mb-2 block tracking-widest uppercase">{t('auth.password', 'Password')}</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••" className="w-full border border-stone-300 px-4 py-3 text-sm focus:outline-none focus:border-stone-900" />
        </div>
        <button type="submit" disabled={isLoading} className="w-full btn-primary mt-2 disabled:opacity-50">
          {isLoading ? t('auth.signing_in', 'Signing in...') : t('auth.sign_in', 'Sign In')}
        </button>
        <p className="text-center text-xs text-stone-400 tracking-wider">
          {t('auth.no_account', 'No account?')} <Link to="/register" className="text-stone-900 hover:underline uppercase tracking-wider">{t('auth.join_us', 'Join Us')}</Link>
        </p>
      </form>
    </div>
  );
}
