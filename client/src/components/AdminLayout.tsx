import { useState } from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Users, Package, ShoppingBag, Settings, LogOut, 
  ChevronRight, ChevronDown, ShieldCheck, BookOpen, Megaphone, Bot, 
  FolderTree, FileText, FlaskConical, Gift, Sparkles, Tag, Award, ToggleRight, ClipboardList 
} from 'lucide-react';
import { useAuthStore } from '../contexts/authStore';
import { useQuery } from '@tanstack/react-query';
import api from '../utils/api';
import BackToTop from './BackToTop';

interface NavSubItem {
  to: string;
  label: string;
  icon?: any;
}

interface NavItem {
  to?: string;
  label: string;
  icon: any;
  exact?: boolean;
  permission: string | null;
  children?: NavSubItem[];
}

const allNavItems: NavItem[] = [
  { to: '/admin', label: '仪表盘', icon: LayoutDashboard, exact: true, permission: null },
  { to: '/admin/categories', label: '分类管理', icon: FolderTree, permission: 'products' },
  { to: '/admin/products', label: '商品管理', icon: Package, permission: 'products' },
  {
    to: '/admin/marketing',
    label: '营销管理',
    icon: Megaphone,
    permission: 'marketing',
    children: [
      { to: '/admin/marketing?tab=promo', label: '促销活动', icon: Sparkles },
      { to: '/admin/marketing?tab=coupons', label: '代金券管理', icon: Gift },
      { to: '/admin/marketing?tab=surveys', label: '调研问卷库', icon: ClipboardList },
      { to: '/admin/marketing?tab=points', label: '积分与推荐', icon: Award },
      { to: '/admin/marketing?tab=pages', label: '页面内容管理', icon: FileText },
      { to: '/admin/marketing?tab=features', label: '功能开关', icon: ToggleRight },
      { to: '/admin/marketing?tab=ingredients', label: '成分百科', icon: BookOpen },
      { to: '/admin/marketing?tab=brand_story', label: '品牌技术配置', icon: Sparkles },
    ],
  },
  { to: '/admin/ai', label: 'AI管理', icon: Bot, permission: 'ai' },
  { to: '/admin/orders', label: '订单管理', icon: ShoppingBag, permission: 'orders' },
  { to: '/admin/research-institute', label: '研究院管理', icon: FlaskConical, permission: 'articles' },
  { to: '/admin/users', label: '用户管理', icon: Users, permission: 'users' },
  { to: '/admin/staff', label: '员工管理', icon: ShieldCheck, permission: 'staff' }, // 仅 admin 可见
  { to: '/admin/settings', label: '网站设置', icon: Settings, permission: 'settings' },
];

export default function AdminLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({ '营销管理': true });

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.get('/settings'),
  }) as any;

  // 判断子菜单是否处于活跃状态
  const isChildActive = (childTo: string) => {
    const [childPath, childQuery] = childTo.split('?');
    if (location.pathname !== childPath) return false;
    if (childQuery) {
      const params = new URLSearchParams(childQuery);
      const targetTab = params.get('tab');
      const currentTab = new URLSearchParams(location.search).get('tab') || 'pages';
      return targetTab === currentTab;
    }
    return true;
  };

  // 根据 role 和 permissions 和 settings 过滤导航
  const visibleNavItems = allNavItems.filter(item => {
    if (item.label === '成分百科' && settings?.feature_ingredient_glossary !== '1') return false;

    if (!item.permission) return true; // 仪表盘始终显示
    if (user?.level === 'admin') return true; // admin 全部可见
    if (user?.level === 'staff') {
      if (item.permission === 'staff') return false;
      const perms = user.permissions || [];
      return perms.includes(item.permission);
    }
    return false;
  });

  const toggleGroup = (groupLabel: string) => {
    setOpenGroups(prev => ({ ...prev, [groupLabel]: !prev[groupLabel] }));
  };

  return (
    <div className="flex h-screen bg-stone-50">
      {/* 侧边栏 - 黑色极简 */}
      <aside className="w-56 bg-stone-950 flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-stone-800">
          <a href="/" target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-white tracking-widest">TRASOCHY</a>
          <span className="ml-2 text-xs text-stone-500 tracking-wider">管理后台</span>
        </div>
        <nav className="flex-1 py-6 px-3 overflow-y-auto">
          {visibleNavItems.map(item => {
            const Icon = item.icon;

            // 具有子菜单的分组（如营销管理）
            if (item.children && item.children.length > 0) {
              const isGroupActive = location.pathname.startsWith('/admin/marketing');
              const isOpen = openGroups[item.label] ?? true;

              return (
                <div key={item.label} className="mb-1">
                  <div className="flex items-center">
                    <Link
                      to={item.to || '#'}
                      className={`flex-1 flex items-center gap-3 px-3 py-2.5 text-xs tracking-wider transition-colors rounded-l-lg ${
                        isGroupActive ? 'text-white font-medium bg-stone-900/80' : 'text-stone-400 hover:text-white hover:bg-stone-900/40'
                      }`}
                    >
                      <Icon size={16} className={isGroupActive ? 'text-rose-400' : ''} />
                      <span>{item.label}</span>
                    </Link>
                    <button
                      type="button"
                      onClick={() => toggleGroup(item.label)}
                      title={isOpen ? '收起子菜单' : '展开子菜单'}
                      className={`px-2 py-2.5 text-stone-500 hover:text-white transition-colors rounded-r-lg ${
                        isGroupActive ? 'bg-stone-900/80' : 'hover:bg-stone-900/40'
                      }`}
                    >
                      {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </button>
                  </div>

                  {isOpen && (
                    <div className="mt-1 ml-3 pl-3 border-l border-stone-800 space-y-1">
                      {item.children.map(sub => {
                        const SubIcon = sub.icon || ChevronRight;
                        const active = isChildActive(sub.to);
                        return (
                          <Link
                            key={sub.to}
                            to={sub.to}
                            className={`flex items-center gap-2.5 px-2.5 py-2 text-xs tracking-wider transition-colors rounded-lg ${
                              active
                                ? 'bg-stone-800 text-white font-medium shadow-sm'
                                : 'text-stone-400 hover:text-white hover:bg-stone-900/40'
                            }`}
                          >
                            <SubIcon size={13} className={active ? 'text-rose-400' : 'text-stone-500'} />
                            <span>{sub.label}</span>
                            {active && <ChevronRight size={11} className="ml-auto text-stone-400" />}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            // 单个导航项
            const active = item.exact ? location.pathname === item.to : (item.to ? location.pathname.startsWith(item.to) : false);
            return (
              <Link
                key={item.to || item.label}
                to={item.to || '#'}
                className={`flex items-center gap-3 px-3 py-2.5 mb-1 text-xs tracking-wider transition-colors rounded-lg ${active ? 'bg-stone-800 text-white font-medium' : 'text-stone-400 hover:text-white'}`}
              >
                <Icon size={16} />
                <span>{item.label}</span>
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
      <BackToTop />
    </div>
  );
}
