import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, UserCheck, UserX } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import { LEVEL_LABELS, LEVEL_COLORS } from '../../types';

export default function AdminUsers() {
  const [keyword, setKeyword] = useState('');
  const [levelFilter, setLevelFilter] = useState('');
  const [page, setPage] = useState(1);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', keyword, levelFilter, page],
    queryFn: () => api.get(`/admin/users?${new URLSearchParams({ keyword, level: levelFilter, page: String(page), limit: '20' }).toString()}`),
  }) as any;

  const changeLevel = async (userId: number, level: string) => {
    try {
      await api.put(`/admin/users/${userId}/level`, { level });
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('等级已更新');
    } catch (e: any) { toast.error(e.message); }
  };

  const changePartnerTier = async (userId: number, partnerTier: string) => {
    try {
      await api.put(`/admin/users/${userId}/partner-tier`, { partnerTier: partnerTier || null });
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('合伙人等级已更新');
    } catch (e: any) { toast.error(e.message); }
  };

  const changeProTestLimit = async (userId: number, proTestLimit: string) => {
    try {
      await api.put(`/admin/users/${userId}/pro-test-limit`, { proTestLimit });
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('深度测肤上限已更新');
    } catch (e: any) { toast.error(e.message); }
  };

  const toggleStatus = async (userId: number, isActive: boolean) => {
    try {
      await api.put(`/admin/users/${userId}/status`, { isActive });
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success(isActive ? '已启用' : '已禁用');
    } catch (e: any) { toast.error(e.message); }
  };

  const totalPages = Math.ceil((data?.total || 0) / 20);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-medium text-stone-700">用户管理</h1>
        <span className="text-sm text-stone-400">共 {data?.total || 0} 名用户</span>
      </div>

      {/* 过滤器 */}
      <div className="flex gap-3 mb-5">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-2.5 text-stone-400" />
          <input value={keyword} onChange={e => { setKeyword(e.target.value); setPage(1); }} placeholder="搜索姓名/邮箱" className="w-full pl-8 pr-4 py-2 text-sm border border-stone-200 rounded-xl focus:outline-none focus:border-rose-300" />
        </div>
        <select value={levelFilter} onChange={e => { setLevelFilter(e.target.value); setPage(1); }} className="text-sm border border-stone-200 rounded-xl px-3 py-2 focus:outline-none focus:border-rose-300">
          <option value="">全部等级</option>
          <option value="guest">游客</option>
          <option value="member">普通会员</option>
          <option value="silver">银卡会员</option>
          <option value="gold">金卡会员</option>
          <option value="diamond">钻石会员</option>
        </select>
      </div>

      {/* 用户表格 */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 border-b border-stone-100">
              <tr>
                <th className="text-left px-4 py-3 text-stone-500 font-medium">用户</th>
                <th className="text-left px-4 py-3 text-stone-500 font-medium">等级</th>
                <th className="text-left px-4 py-3 text-stone-500 font-medium">消费与积分</th>
                <th className="text-left px-4 py-3 text-stone-500 font-medium">推荐人</th>
                <th className="text-left px-4 py-3 text-stone-500 font-medium">合伙人信息</th>
                <th className="text-left px-4 py-3 text-stone-500 font-medium">测肤剩余次数</th>
                <th className="text-left px-4 py-3 text-stone-500 font-medium">状态</th>
                <th className="text-left px-4 py-3 text-stone-500 font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50">
              {isLoading ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-stone-400">加载中...</td></tr>
              ) : data?.users?.map((user: any) => (
                <tr key={user.id} className="hover:bg-stone-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-stone-700">{user.name}</p>
                    <p className="text-xs text-stone-400">{user.email}</p>
                    <p className="text-[10px] text-stone-400 mt-1 tracking-wide">注册: {new Date(user.created_at).toLocaleDateString()}</p>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={user.level}
                      onChange={e => changeLevel(user.id, e.target.value)}
                      className={`text-xs px-2 py-1 rounded-full border-0 cursor-pointer font-medium ${LEVEL_COLORS[user.level]}`}
                    >
                      <option value="guest">游客</option>
                      <option value="member">普通会员</option>
                      <option value="silver">银卡会员</option>
                      <option value="gold">金卡会员</option>
                      <option value="diamond">钻石会员</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-stone-600 text-xs">消费: ¥{(user.total_spend || 0).toFixed(2)}</p>
                    <p className="text-stone-600 text-xs font-medium text-rose-500">积分: {user.points}</p>
                  </td>
                  <td className="px-4 py-3">
                    {user.referrer_name ? (
                      <span className="text-xs text-stone-500 bg-stone-100 px-2 py-0.5 rounded">
                        推荐自: {user.referrer_name}
                      </span>
                    ) : (
                      <span className="text-xs text-stone-300">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-xs text-stone-600 mb-1">已推荐: <span className="font-medium">{user.referral_count || 0}</span> 人</p>
                    <select
                      value={user.partner_tier || ''}
                      onChange={e => changePartnerTier(user.id, e.target.value)}
                      className={`text-xs px-2 py-1 rounded border cursor-pointer w-full max-w-[120px] focus:outline-none focus:border-rose-300 ${user.partner_tier ? 'border-rose-300 bg-rose-50 text-rose-600 font-medium' : 'border-stone-200 bg-white text-stone-600'}`}
                    >
                      <option value="">按人数自动计算</option>
                      <option value="advanced">强制高级 (特权)</option>
                      <option value="super">强制超级 (特权)</option>
                      <option value="gold">强制金牌 (特权)</option>
                      <option value="diamond">强制钻石 (特权)</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <input 
                        type="number" 
                        min="0"
                        defaultValue={user.pro_test_limit ?? 4}
                        onBlur={e => {
                          if (e.target.value !== String(user.pro_test_limit ?? 4)) {
                            changeProTestLimit(user.id, e.target.value);
                          }
                        }}
                        className="w-16 text-xs px-2 py-1 border border-stone-200 rounded text-center focus:outline-none focus:border-rose-300"
                        title="深度测试剩余次数"
                      />
                      <span className="text-xs text-stone-400">次</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${user.is_active ? 'bg-green-50 text-green-600' : 'bg-stone-100 text-stone-400'}`}>
                      {user.is_active ? '正常' : '禁用'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleStatus(user.id, !user.is_active)}
                      className="text-xs text-stone-400 hover:text-rose-400 transition-colors flex items-center gap-1"
                    >
                      {user.is_active ? <><UserX size={12} />禁用</> : <><UserCheck size={12} />启用</>}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 分页 */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 px-4 py-3 border-t border-stone-100">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button key={p} onClick={() => setPage(p)} className={`w-8 h-8 rounded-lg text-xs ${p === page ? 'bg-rose-400 text-white' : 'border border-stone-200 text-stone-600 hover:border-rose-300'}`}>{p}</button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
