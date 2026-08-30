import React, { useEffect, useState } from 'react';
import { Gift, Save, RefreshCw, AlertCircle } from 'lucide-react';
import api from '../../utils/api';
import toast from 'react-hot-toast';

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: any }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 text-center bg-red-50 text-red-600 rounded-2xl max-w-xl mx-auto my-8 border border-red-200">
          <AlertCircle className="w-8 h-8 mx-auto mb-3 text-red-500" />
          <h2 className="text-lg font-bold mb-2">代金券管理模块渲染异常</h2>
          <p className="text-xs text-red-500 mb-4">{this.state.error?.message || String(this.state.error)}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-red-600 text-white rounded-lg text-xs"
          >
            刷新页面重试
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function AdminCouponsInner() {
  const [configs, setConfigs] = useState<any[]>([]);
  const [editingConfig, setEditingConfig] = useState<any>(null);
  const [configsLoading, setConfigsLoading] = useState(true);
  const [configSaving, setConfigSaving] = useState(false);

  const [records, setRecords] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [recordsLoading, setRecordsLoading] = useState(false);

  const loadConfigs = async () => {
    setConfigsLoading(true);
    try {
      const res: any = await api.get('/admin/coupon-settings');
      const loaded = res?.configs || [];
      setConfigs(loaded);
      if (loaded.length > 0) {
        setEditingConfig((prev: any) => prev ? prev : { ...loaded[0] });
      }
    } catch (e: any) {
      console.error('loadConfigs error:', e);
      toast.error('加载代金券配置失败: ' + (e?.message || '未知错误'));
    } finally {
      setConfigsLoading(false);
    }
  };

  const loadRecords = async (p = 1, status = '') => {
    setRecordsLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), limit: '15' });
      if (status) params.set('status', status);
      const res: any = await api.get(`/admin/coupons?${params.toString()}`);
      setRecords(res?.coupons || []);
      setTotal(res?.total || 0);
      setPage(res?.page || 1);
    } catch (e: any) {
      console.error('loadRecords error:', e);
      toast.error('加载代金券发放明细失败: ' + (e?.message || '未知错误'));
    } finally {
      setRecordsLoading(false);
    }
  };

  useEffect(() => {
    loadConfigs();
    loadRecords(1, '');
  }, []);

  const handleSaveConfig = async () => {
    if (!editingConfig) return;
    setConfigSaving(true);
    try {
      await api.put(`/admin/coupon-settings/${editingConfig.source}`, {
        type: editingConfig.type || 'fixed',
        value: Number(editingConfig.value) || 0,
        min_amount: Number(editingConfig.min_amount) || 0,
        valid_days: Number(editingConfig.valid_days) || 30,
        is_active: editingConfig.is_active ? 1 : 0,
        description: editingConfig.description || '',
      });
      toast.success('代金券配置已更新');
      loadConfigs();
    } catch (e: any) {
      toast.error('保存失败: ' + (e?.message || '未知错误'));
    } finally {
      setConfigSaving(false);
    }
  };

  const formatDate = (val: any) => {
    if (!val) return '-';
    try {
      const d = new Date(Number(val) || val);
      return isNaN(d.getTime()) ? '-' : d.toLocaleDateString();
    } catch {
      return '-';
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-8 space-y-6">
      {/* 标题 */}
      <div className="flex items-center justify-between flex-wrap gap-4 mb-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600">
            <Gift className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">代金券管理系统</h1>
            <p className="text-xs text-gray-500 mt-0.5">全站代金券发放规则定制、发放明细与订单核销管理</p>
          </div>
        </div>
        <button
          onClick={() => { loadConfigs(); loadRecords(page, statusFilter); }}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <RefreshCw size={13} /> 刷新数据
        </button>
      </div>

      {/* ── 模块 1：代金券发放规则设置 ── */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-1">代金券发放规则配置</h2>
        <p className="text-sm text-gray-500 mb-6">配置各场景下系统自动发放代金券的面额、使用门槛及有效期限。</p>

        {configsLoading ? (
          <div className="py-6 text-center text-gray-400 text-sm animate-pulse">加载规则配置中...</div>
        ) : configs.length === 0 ? (
          <div className="p-4 bg-amber-50 text-amber-700 rounded-xl text-xs">
            暂无已注册的代金券规则（如 quiz_completion），请检查数据库初始化状态。
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex gap-2 flex-wrap mb-4">
              {configs.map((c: any) => (
                <button
                  key={c.source}
                  type="button"
                  onClick={() => setEditingConfig({ ...c })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    editingConfig?.source === c.source
                      ? 'border-rose-500 bg-rose-50 text-rose-600'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {c.source === 'quiz_completion' ? '问卷完成奖励' : c.source}
                </button>
              ))}
            </div>

            {editingConfig && (
              <div className="bg-gray-50/50 rounded-xl p-5 border border-gray-100 space-y-4">
                <div className="flex items-center justify-between py-2 border-b border-gray-200">
                  <div>
                    <span className="text-sm font-medium text-gray-800">开启该场景自动发放</span>
                    <p className="text-xs text-gray-400">关闭后用户达到触发条件将不再获得此券</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingConfig((prev: any) => ({ ...prev, is_active: !prev?.is_active }))}
                    className={`relative inline-flex h-6 w-11 rounded-full border-2 border-transparent transition-colors ${editingConfig.is_active ? 'bg-emerald-500' : 'bg-gray-200'}`}
                  >
                    <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${editingConfig.is_active ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">券类型</label>
                    <select
                      value={editingConfig.type || 'fixed'}
                      onChange={e => setEditingConfig((prev: any) => ({ ...prev, type: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-rose-400"
                    >
                      <option value="fixed">固定金额立减</option>
                      <option value="percent">折扣券 (例如 0.1 代表9折)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">
                      {editingConfig.type === 'percent' ? '折扣率 (0.1=10%)' : '立减金额 (元)'}
                    </label>
                    <input
                      type="number"
                      min="0"
                      step={editingConfig.type === 'percent' ? '0.01' : '1'}
                      value={editingConfig.value ?? ''}
                      onChange={e => setEditingConfig((prev: any) => ({ ...prev, value: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-rose-400"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">最低消费门槛 (元，0=无门槛)</label>
                    <input
                      type="number"
                      min="0"
                      value={editingConfig.min_amount ?? ''}
                      onChange={e => setEditingConfig((prev: any) => ({ ...prev, min_amount: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-rose-400"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">有效期天数</label>
                    <input
                      type="number"
                      min="1"
                      value={editingConfig.valid_days ?? ''}
                      onChange={e => setEditingConfig((prev: any) => ({ ...prev, valid_days: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-rose-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-gray-500 mb-1 block">规则说明 / 描述</label>
                  <input
                    type="text"
                    value={editingConfig.description || ''}
                    onChange={e => setEditingConfig((prev: any) => ({ ...prev, description: e.target.value }))}
                    placeholder="例如：完成 AI 护肤问卷奖励代金券"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-rose-400"
                  />
                </div>

                <button
                  type="button"
                  disabled={configSaving}
                  onClick={handleSaveConfig}
                  className="flex items-center gap-1.5 px-4 py-2 bg-rose-500 text-white text-sm rounded-lg hover:bg-rose-600 transition-colors disabled:opacity-50"
                >
                  <Save size={14} /> {configSaving ? '保存中...' : '保存规则配置'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── 模块 2：用户已领券记录与核销明细 ── */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">全站代金券发放与使用明细</h2>
            <p className="text-xs text-gray-500 mt-0.5">共 {total} 张代金券已发放</p>
          </div>
          <div className="flex gap-2">
            {[
              { label: '全部状态', val: '' },
              { label: '未使用', val: 'unused' },
              { label: '已核销', val: 'used' },
              { label: '已过期', val: 'expired' },
            ].map(f => (
              <button
                key={f.val}
                type="button"
                onClick={() => { setStatusFilter(f.val); loadRecords(1, f.val); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  statusFilter === f.val ? 'border-stone-800 bg-stone-900 text-white' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {recordsLoading ? (
          <div className="py-8 text-center text-gray-400 text-sm">加载明细中...</div>
        ) : records.length === 0 ? (
          <div className="py-8 text-center text-gray-400 text-sm">暂无符合条件的代金券记录</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-gray-100 text-gray-400">
                  <th className="py-3 px-3">券码</th>
                  <th className="py-3 px-3">归属用户</th>
                  <th className="py-3 px-3">面额 / 门槛</th>
                  <th className="py-3 px-3">状态</th>
                  <th className="py-3 px-3">发放时间</th>
                  <th className="py-3 px-3">过期时间</th>
                  <th className="py-3 px-3">使用订单</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {records.map((r: any) => {
                  const valNum = Number(r.value || 0);
                  const displayValue = r.type === 'percent' ? `${(valNum * 10).toFixed(1)}折` : `¥${valNum}`;
                  return (
                    <tr key={r.id} className="hover:bg-gray-50/50">
                      <td className="py-2.5 px-3 font-mono font-medium text-gray-800">{r.code}</td>
                      <td className="py-2.5 px-3 text-gray-600">{r.user_name || r.user_email || `UID:${r.user_id}`}</td>
                      <td className="py-2.5 px-3">
                        <span className="font-semibold text-rose-600">{displayValue}</span>
                        {Number(r.min_amount) > 0 && <span className="text-gray-400 ml-1">(满{r.min_amount})</span>}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${
                          r.status === 'unused' ? 'bg-emerald-100 text-emerald-700' :
                          r.status === 'used' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-500'
                        }`}>
                          {r.status === 'unused' ? '未使用' : r.status === 'used' ? '已核销' : '已过期'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-gray-400">{formatDate(r.created_at)}</td>
                      <td className="py-2.5 px-3 text-gray-400">{formatDate(r.expires_at)}</td>
                      <td className="py-2.5 px-3 text-gray-500 font-mono">{r.used_order_no || '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* 分页 */}
            <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3">
              <span className="text-xs text-gray-400">每页 15 条，第 {page} 页</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => { setPage(p => p - 1); loadRecords(page - 1, statusFilter); }}
                  className="px-3 py-1 text-xs border rounded-lg disabled:opacity-40 hover:bg-gray-50"
                >
                  上一页
                </button>
                <button
                  type="button"
                  disabled={page * 15 >= total}
                  onClick={() => { setPage(p => p + 1); loadRecords(page + 1, statusFilter); }}
                  className="px-3 py-1 text-xs border rounded-lg disabled:opacity-40 hover:bg-gray-50"
                >
                  下一页
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminCoupons() {
  return (
    <ErrorBoundary>
      <AdminCouponsInner />
    </ErrorBoundary>
  );
}
