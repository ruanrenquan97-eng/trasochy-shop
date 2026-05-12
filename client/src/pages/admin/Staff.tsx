import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import { PERMISSION_MODULES, LEVEL_LABELS, LEVEL_COLORS } from '../../types';
import { Plus, Pencil, Key, Power, X } from 'lucide-react';

interface StaffMember {
  id: number;
  email: string;
  name: string;
  phone: string | null;
  level: string;
  permissions: string[] | null;
  is_active: boolean;
  pro_test_limit: number;
  created_at: number;
}

export default function AdminStaff() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showPwdModal, setShowPwdModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [pwdStaff, setPwdStaff] = useState<StaffMember | null>(null);

  // 表单
  const [form, setForm] = useState({ email: '', name: '', password: '', permissions: [] as string[], proTestLimit: 0 });
  const [pwdForm, setPwdForm] = useState({ password: '', confirm: '' });
  const [submitting, setSubmitting] = useState(false);

  const fetchStaff = useCallback(async () => {
    try {
      const data: any = await api.get('/admin/staff');
      setStaff(data.staff || []);
    } catch (e: any) {
      toast.error(e.message || '获取员工列表失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStaff(); }, [fetchStaff]);

  const openCreate = () => {
    setEditingStaff(null);
    setForm({ email: '', name: '', password: '', permissions: [], proTestLimit: 0 });
    setShowModal(true);
  };

  const openEdit = (s: StaffMember) => {
    if (s.level === 'admin') return;
    setEditingStaff(s);
    setForm({ email: s.email, name: s.name, password: '', permissions: s.permissions || [], proTestLimit: s.pro_test_limit || 0 });
    setShowModal(true);
  };

  const openResetPwd = (s: StaffMember) => {
    if (s.level === 'admin') return;
    setPwdStaff(s);
    setPwdForm({ password: '', confirm: '' });
    setShowPwdModal(true);
  };

  const togglePermission = (key: string) => {
    setForm(prev => ({
      ...prev,
      permissions: prev.permissions.includes(key)
        ? prev.permissions.filter(p => p !== key)
        : [...prev.permissions, key]
    }));
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) { toast.error('请输入姓名'); return; }
    if (!editingStaff && !form.email.trim()) { toast.error('请输入邮箱'); return; }
    if (!editingStaff && form.password.length < 6) { toast.error('密码不能少于6位'); return; }

    setSubmitting(true);
    try {
      if (editingStaff) {
        await api.put(`/admin/staff/${editingStaff.id}`, {
          name: form.name,
          permissions: form.permissions,
          proTestLimit: form.proTestLimit,
        });
        toast.success('员工信息已更新');
      } else {
        await api.post('/admin/staff', {
          email: form.email,
          name: form.name,
          password: form.password,
          permissions: form.permissions,
          proTestLimit: form.proTestLimit,
        });
        toast.success('员工创建成功');
      }
      setShowModal(false);
      fetchStaff();
    } catch (e: any) {
      toast.error(e.message || '操作失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPwd = async () => {
    if (pwdForm.password.length < 6) { toast.error('密码不能少于6位'); return; }
    if (pwdForm.password !== pwdForm.confirm) { toast.error('两次密码不一致'); return; }
    if (!pwdStaff) return;

    setSubmitting(true);
    try {
      await api.put(`/admin/staff/${pwdStaff.id}/password`, { password: pwdForm.password });
      toast.success('密码已重置');
      setShowPwdModal(false);
    } catch (e: any) {
      toast.error(e.message || '操作失败');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleStatus = async (s: StaffMember) => {
    if (s.level === 'admin') return;
    try {
      await api.put(`/admin/staff/${s.id}/status`, { isActive: !s.is_active });
      toast.success(s.is_active ? '已禁用' : '已启用');
      fetchStaff();
    } catch (e: any) {
      toast.error(e.message || '操作失败');
    }
  };

  const getPermLabels = (perms: string[] | null) => {
    if (perms === null) return <span className="text-purple-600 font-medium">全部权限</span>;
    if (perms.length === 0) return <span className="text-stone-400">无权限</span>;
    return perms.map(p => {
      const mod = PERMISSION_MODULES.find(m => m.key === p);
      return mod ? mod.label : p;
    }).join('、');
  };

  if (loading) {
    return <div className="p-8 text-center text-stone-400 text-sm">加载中...</div>;
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-light text-stone-900 tracking-tight">员工管理</h1>
          <p className="text-xs text-stone-400 mt-1 tracking-wider">管理后台员工账号与权限</p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2 text-sm">
          <Plus size={16} /> 创建员工
        </button>
      </div>

      {/* 员工列表 */}
      <div className="bg-white rounded-lg border border-stone-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-stone-50 text-stone-500 text-xs tracking-wider">
              <th className="text-left px-6 py-3 font-medium">姓名</th>
              <th className="text-left px-6 py-3 font-medium">邮箱</th>
              <th className="text-left px-6 py-3 font-medium">角色</th>
              <th className="text-left px-6 py-3 font-medium">权限模块</th>
              <th className="text-left px-6 py-3 font-medium">深度测肤剩余</th>
              <th className="text-left px-6 py-3 font-medium">状态</th>
              <th className="text-right px-6 py-3 font-medium">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {staff.map(s => (
              <tr key={s.id} className="hover:bg-stone-50 transition-colors">
                <td className="px-6 py-4">
                  <span className="font-medium text-stone-800">{s.name}</span>
                </td>
                <td className="px-6 py-4 text-stone-500">{s.email}</td>
                <td className="px-6 py-4">
                  <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${LEVEL_COLORS[s.level] || ''}`}>
                    {LEVEL_LABELS[s.level] || s.level}
                  </span>
                </td>
                <td className="px-6 py-4 text-xs text-stone-600">
                  {getPermLabels(s.permissions)}
                </td>
                <td className="px-6 py-4">
                  <span className="text-stone-600 font-medium text-xs">{s.level === 'admin' ? '无限' : (s.pro_test_limit || 0) + ' 次'}</span>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-block text-xs px-2 py-0.5 rounded-full ${s.is_active ? 'bg-green-100 text-green-700' : 'bg-stone-100 text-stone-400'}`}>
                    {s.is_active ? '正常' : '已禁用'}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-1">
                    {s.level !== 'admin' && (
                      <>
                        <button onClick={() => openEdit(s)} className="p-1.5 text-stone-400 hover:text-stone-700 transition-colors" title="编辑">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => openResetPwd(s)} className="p-1.5 text-stone-400 hover:text-stone-700 transition-colors" title="重置密码">
                          <Key size={14} />
                        </button>
                        <button onClick={() => toggleStatus(s)} className="p-1.5 text-stone-400 hover:text-stone-700 transition-colors" title={s.is_active ? '禁用' : '启用'}>
                          <Power size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {staff.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-stone-400 text-xs">
                  暂无员工账号
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 创建/编辑弹窗 */}
      {showModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100">
              <h3 className="text-sm font-medium text-stone-800">{editingStaff ? '编辑员工' : '创建员工'}</h3>
              <button onClick={() => setShowModal(false)} className="text-stone-400 hover:text-stone-600"><X size={16} /></button>
            </div>
            <div className="p-6 space-y-4">
              {!editingStaff && (
                <div>
                  <label className="text-xs text-stone-400 mb-1.5 block tracking-wider">邮箱</label>
                  <input type="email" value={form.email} onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))} className="w-full border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:border-stone-600 rounded" placeholder="staff@trasochy.com" />
                </div>
              )}
              <div>
                <label className="text-xs text-stone-400 mb-1.5 block tracking-wider">姓名</label>
                <input type="text" value={form.name} onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))} className="w-full border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:border-stone-600 rounded" placeholder="员工姓名" />
              </div>
              {!editingStaff && (
                <div>
                  <label className="text-xs text-stone-400 mb-1.5 block tracking-wider">密码</label>
                  <input type="password" value={form.password} onChange={e => setForm(prev => ({ ...prev, password: e.target.value }))} className="w-full border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:border-stone-600 rounded" placeholder="至少6位" />
                </div>
              )}
              <div>
                <label className="text-xs text-stone-400 mb-1.5 block tracking-wider">深度测肤次数分配</label>
                <input type="number" min="0" value={form.proTestLimit} onChange={e => setForm(prev => ({ ...prev, proTestLimit: parseInt(e.target.value) || 0 }))} className="w-full border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:border-stone-600 rounded" placeholder="分配测试次数" />
              </div>
              <div>
                <label className="text-xs text-stone-400 mb-2 block tracking-wider">权限模块</label>
                <div className="grid grid-cols-2 gap-2">
                  {PERMISSION_MODULES.map(mod => (
                    <label key={mod.key} className={`flex items-center gap-2 px-3 py-2.5 border rounded cursor-pointer transition-colors text-xs ${
                      form.permissions.includes(mod.key)
                        ? 'border-stone-800 bg-stone-900 text-white'
                        : 'border-stone-200 text-stone-600 hover:border-stone-400'
                    }`}>
                      <input type="checkbox" checked={form.permissions.includes(mod.key)} onChange={() => togglePermission(mod.key)} className="sr-only" />
                      {mod.label}
                    </label>
                  ))}
                </div>
                {form.permissions.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">未选择任何权限，该员工将无法访问任何模块</p>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-stone-100">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-xs text-stone-500 border border-stone-300 rounded hover:bg-stone-50 transition-colors">取消</button>
              <button onClick={handleSubmit} disabled={submitting} className="px-4 py-2 text-xs bg-stone-900 text-white rounded hover:bg-stone-800 transition-colors disabled:opacity-50">
                {submitting ? '提交中...' : (editingStaff ? '保存' : '创建')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 重置密码弹窗 */}
      {showPwdModal && pwdStaff && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setShowPwdModal(false)}>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100">
              <h3 className="text-sm font-medium text-stone-800">重置密码 — {pwdStaff.name}</h3>
              <button onClick={() => setShowPwdModal(false)} className="text-stone-400 hover:text-stone-600"><X size={16} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs text-stone-400 mb-1.5 block tracking-wider">新密码</label>
                <input type="password" value={pwdForm.password} onChange={e => setPwdForm(prev => ({ ...prev, password: e.target.value }))} className="w-full border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:border-stone-600 rounded" placeholder="至少6位" />
              </div>
              <div>
                <label className="text-xs text-stone-400 mb-1.5 block tracking-wider">确认密码</label>
                <input type="password" value={pwdForm.confirm} onChange={e => setPwdForm(prev => ({ ...prev, confirm: e.target.value }))} className="w-full border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:border-stone-600 rounded" placeholder="再次输入" />
              </div>
            </div>
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-stone-100">
              <button onClick={() => setShowPwdModal(false)} className="px-4 py-2 text-xs text-stone-500 border border-stone-300 rounded hover:bg-stone-50 transition-colors">取消</button>
              <button onClick={handleResetPwd} disabled={submitting} className="px-4 py-2 text-xs bg-stone-900 text-white rounded hover:bg-stone-800 transition-colors disabled:opacity-50">
                {submitting ? '提交中...' : '确认重置'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
