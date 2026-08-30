export type UserLevel = 'guest' | 'member' | 'silver' | 'gold' | 'diamond' | 'staff' | 'admin';

export interface User {
  id: number;
  email: string;
  name: string;
  phone?: string;
  created_at: string;
  avatar?: string;
  level: UserLevel;
  permissions?: string[] | null;
  points: number;
  total_spend: number;
  referral_code?: string;
  partner_tier?: string;
}

// 后台权限模块
export const PERMISSION_MODULES = [
  { key: 'users', label: '用户管理' },
  { key: 'products', label: '商品管理' },
  { key: 'orders', label: '订单管理' },
  { key: 'marketing', label: '营销管理' },
  { key: 'articles', label: '内容管理' },
  { key: 'ai', label: 'AI管理' },
  { key: 'settings', label: '网站设置' },
] as const;

export interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string;
  image?: string;
}

export interface Product {
  id: number;
  name: string;
  slug: string;
  description?: string;
  main_image?: string;
  images?: string[];
  base_price: number;
  stock: number;
  unit: string;
  category_name?: string;
  category_slug?: string;
  price: number;           // 当前用户等级价格
  discount: number;
  prices?: Record<string, { price: number; discount: number }>;
  userLevel?: UserLevel;
}

export interface CartItem {
  id: number;
  product_id: number;
  quantity: number;
  name: string;
  slug: string;
  main_image?: string;
  stock: number;
  unit: string;
  unit_price: number;
  subtotal: number;
}

export interface Order {
  id: number;
  order_no: string;
  user_id: number;
  user_level: string;
  status: string;
  total_amount: number;
  pay_amount: number;
  pay_method?: string;
  pay_time?: number;
  recipient_name: string;
  recipient_phone: string;
  address: string;
  remark?: string;
  created_at: number;
  items: OrderItem[];
}

export interface OrderItem {
  id: number;
  product_id: number;
  product_name: string;
  product_image?: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export const LEVEL_LABELS: Record<string, string> = {
  guest: '游客',
  member: '普通会员',
  silver: '银卡会员',
  gold: '金卡会员',
  diamond: '钻石会员',
  admin: '管理员',
  staff: '员工',
};

export const LEVEL_COLORS: Record<string, string> = {
  guest: 'bg-stone-100 text-stone-600',
  member: 'bg-blue-100 text-blue-700',
  silver: 'bg-slate-100 text-slate-600',
  gold: 'bg-amber-100 text-amber-700',
  diamond: 'bg-indigo-100 text-indigo-700',
  admin: 'bg-purple-100 text-purple-700',
  staff: 'bg-cyan-100 text-cyan-700',
};

export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: '待付款',
  paid: '已付款',
  processing: '处理中',
  shipped: '已发货',
  delivered: '已收货',
  refund_requested: '退款处理中',
  cancelled: '已取消',
  refunded: '已退款',
};

export interface Address {
  id: number;
  user_id: number;
  name: string;
  phone: string;
  province: string;
  city: string;
  district: string;
  address: string;
  is_default: boolean;
}

export interface Review {
  id: number;
  user_id: number;
  product_id: number;
  order_id: number;
  rating: number;
  content: string;
  user_name?: string;
  user_level?: string;
  created_at: number;
}
