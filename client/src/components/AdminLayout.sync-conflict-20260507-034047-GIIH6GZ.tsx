import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, Package, ShoppingBag, Settings, LogOut, ChevronRight, ShieldCheck, BookOpen, Megaphone, Bot } from 'lucide-react';
import { useAuthStore } from '../contexts/authStore';
import { useQuery } from '@tanstack/react-query';
import api from '../utils/api';
const allNavItems = [
  { to: '/admin', label: '仪表盘', icon: LayoutDashboard, exact: true, permission: null },
  { to: '/admin/staff', label: '员工管理', icon: ShieldCheck, permission: 'staff' }, // 仅 admin 可见
  { to: '/admin/users', label: '用户管理', icon: Users, permission: 'users' },
  { to: '/admin/products', label: '商品管理', icon: Package, permission: 'products' },
  { to: '/admin/orders', label: '订单管理', icon: ShoppingBag, permission: 'orders' },
  { to: '/admin/marketing', label: '营销管理', icon: Megaphone, permission: 'marketing' },
  { to: '/admin/articles', label: '内容管理', icon: BookOpen, permission: 'articles' },
  { to: '/admin/ai', label: 'AI管理', icon: Bot, permission: 'ai' },
  { to: '/admin/settings', label: '网站设置', icon: Settings, permission: 'settings' },
];

export default function AdminLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.get('/settings'),
  }) as any;

  // 根据 role 和 permissions 和 settings 过滤导航
  const visibleNavItems = allNavItems.filter(item => {
    if (item.label === '成分百科' && settings?.feature_ingredient_glossary !== '1') return false;

    if (!item.permission) return true; // 仪表盘始终显示
    if (user?.level === 'admin') return true; // admin 全部可见
    if (user?.level === 'staff') {
      // staff：员工管理永远不显示，其他看 permissions
      if (item.permission === 'staff') return false;
      const perms = user.permissions || [];
      return perms.includes(item.permission);
    }
    return false;
  });

  return (
    <div className="flex h-screen bg-stone-50">
      {/* 侧边栏 - 黑色极简 */}
      <aside className="w-56 bg-stone-950 flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-stone-800">
          <a href="/" target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-white tracking-widest">TRASOCHY</a>
          <span className="ml-2 text-xs text-stone-500 tracking-wider">管理后台</span>
        </div>
        <nav className="flex-1 py-6 px-3">
          {visibleNavItems.map(item => {
            const Icon = item.icon;
            const active = item.exact ? location.pathname === item.to : location.pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 px-3 py-2.5 mb-1 text-xs tracking-wider transition-colors ${active ? 'bg-stone-800 text-white' : 'text-stone-400 hover:text-white'}`}
              >
                <Icon size={16} />
                {item.label}
                {active && <ChevronRight size={12} className="ml-auto" />}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-stone-800">
          <div className="text-xs text-stone-400 mb-3">
            <p className="font-medium text-stone-200">{user?.name}</p>
            <p className="text-stone-500 tracking-wider">{user?.email}</p>
            <p className="text-stone-600 mt-1">{user?.level === 'admin' ? '超级管理员' : '员工'}</p>
          </div>
          <button
            onClick={() => { logout(); navigate('/'); }}
            className="flex items-center gap-2 text-xs text-stone-500 hover:text-white transition-colors tracking-wider"
          >
            <LogOut size={12} /> 退出登录
          </button>
        </div>
      </aside>

      {/* 内容区 */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
