import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, Trash2, Bot, RefreshCw, Tags, Droplets, Sparkles, Heart, Power, PowerOff } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../utils/api';

// ===================== 通用标签管理组件 =====================
function TagManager({ apiPath, label }: { apiPath: string; label: string }) {
  const qc = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [langTab, setLangTab] = useState<'zh'|'en'|'de'>('zh');
  const [form, setForm] = useState({ name: '', slug: '', sort_order: 0, is_active: 1 });
  const [trans, setTrans] = useState<any>({ en: { name: '' }, de: { name: '' } });

  const { data, isLoading } = useQuery({
    queryKey: [apiPath],
    queryFn: async () => {
      const res: any = await api.get(`/admin/${apiPath}`);
      return (res.items || []).map((r: any) => ({
        ...r,
        translations: r.translations ? (typeof r.translations === 'string' ? JSON.parse(r.translations) : r.translations) : { en: { name: '' }, de: { name: '' } }
      }));
    }
  });

  const saveMut = useMutation({
    mutationFn: (d: any) => editId ? api.put(`/admin/${apiPath}/${editId}`, d) : api.post(`/admin/${apiPath}`, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [apiPath] }); setIsOpen(false); toast.success('保存成功'); },
    onError: (e: any) => toast.error(e.response?.data?.error || '保存失败')
  });

  const delMut = useMutation({
    mutationFn: (id: number) => api.delete(`/admin/${apiPath}/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [apiPath] }); toast.success('删除成功'); },
    onError: (e: any) => toast.error(e.response?.data?.error || '删除失败')
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, is_active }: { id: number; is_active: number }) =>
      api.put(`/admin/${apiPath}/${id}`, { is_active: is_active ? 0 : 1 }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [apiPath] }); },
    onError: (e: any) => toast.error(e.response?.data?.error || '操作失败')
  });

  const translateMut = useMutation({
    mutationFn: async () => {
      const [enR, deR] = await Promise.all([
        api.post('/ai/translate', { texts: { name: form.name }, targetLang: 'en' }),
        api.post('/ai/translate', { texts: { name: form.name }, targetLang: 'de' })
      ]);
      return { en: (enR as any).translated, de: (deR as any).translated };
    },
    onSuccess: (r) => { setTrans({ en: { name: r.en?.name || '' }, de: { name: r.de?.name || '' } }); toast.success('翻译完成'); },
    onError: () => toast.error('翻译失败')
  });

  const openModal = (item?: any) => {
    setLangTab('zh');
    if (item) {
      setEditId(item.id);
      setForm({ name: item.name, slug: item.slug, sort_order: item.sort_order, is_active: item.is_active });
      setTrans(item.translations || { en: { name: '' }, de: { name: '' } });
    } else {
      setEditId(null);
      setForm({ name: '', slug: '', sort_order: 0, is_active: 1 });
      setTrans({ en: { name: '' }, de: { name: '' } });
    }
    setIsOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.slug.trim()) return toast.error('名称和别名为必填');
    saveMut.mutate({ ...form, translations: trans });
  };

  const items = data || [];

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-gray-500">共 {items.length} 项{label}</p>
        <button onClick={() => openModal()} className="flex items-center gap-1 px-4 py-2 bg-stone-900 text-white rounded-lg hover:bg-stone-800 text-sm">
          <Plus size={16} /> 新增
        </button>
      </div>

      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead><tr className="bg-gray-50 border-b">
            <th className="p-3 font-medium text-gray-600 w-12">ID</th>
            <th className="p-3 font-medium text-gray-600">名称</th>
            <th className="p-3 font-medium text-gray-600">EN</th>
            <th className="p-3 font-medium text-gray-600">Slug</th>
            <th className="p-3 font-medium text-gray-600 w-16">排序</th>
            <th className="p-3 font-medium text-gray-600 w-16">状态</th>
            <th className="p-3 font-medium text-gray-600 text-right w-24">操作</th>
          </tr></thead>
          <tbody className="divide-y">
            {isLoading ? (
              <tr><td colSpan={7} className="p-8 text-center text-gray-400">加载中...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={7} className="p-8 text-center text-gray-400">暂无数据</td></tr>
            ) : items.map((item: any) => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="p-3 text-gray-400">#{item.id}</td>
                <td className="p-3 font-medium text-gray-800">{item.name}</td>
                <td className="p-3 text-gray-500">{item.translations?.en?.name || '-'}</td>
                <td className="p-3 text-gray-500">{item.slug}</td>
                <td className="p-3 text-gray-500">{item.sort_order}</td>
                <td className="p-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs ${item.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                    {item.is_active ? '启用' : '禁用'}
                  </span>
                </td>
                <td className="p-3 text-right">
                  <button
                    onClick={() => toggleMut.mutate({ id: item.id, is_active: item.is_active })}
                    title={item.is_active ? '点击禁用' : '点击启用'}
                    className={`p-1.5 ${item.is_active ? 'text-green-500 hover:text-gray-500' : 'text-gray-300 hover:text-green-500'}`}
                  >
                    {item.is_active ? <Power size={16} /> : <PowerOff size={16} />}
                  </button>
                  <button onClick={() => openModal(item)} className="p-1.5 text-gray-400 hover:text-blue-600"><Edit2 size={16} /></button>
                  <button onClick={() => { if(confirm('确定删除？')) delMut.mutate(item.id); }} className="p-1.5 text-gray-400 hover:text-red-600"><Trash2 size={16} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-lg p-6">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-lg font-bold">{editId ? '编辑' : '新增'}{label}</h3>
              <div className="flex items-center gap-3">
                <div className="flex border-b">
                  {(['zh','en','de'] as const).map(l => (
                    <button key={l} onClick={() => setLangTab(l)} className={`px-3 py-1.5 text-xs font-medium border-b-2 ${langTab === l ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500'}`}>
                      {l === 'zh' ? '中文' : l === 'en' ? 'EN' : 'DE'}
                    </button>
                  ))}
                </div>
                <button onClick={() => translateMut.mutate()} disabled={translateMut.isPending || !form.name} className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded hover:bg-blue-100 disabled:opacity-50">
                  {translateMut.isPending ? <RefreshCw size={12} className="animate-spin" /> : <Bot size={12} />} 翻译
                </button>
              </div>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{langTab === 'zh' ? '名称 *' : langTab === 'en' ? 'English Name' : 'Deutscher Name'}</label>
                  {langTab === 'zh' ? (
                    <input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-gray-800 outline-none text-sm" />
                  ) : (
                    <input value={trans[langTab]?.name || ''} onChange={e => setTrans({...trans, [langTab]: { name: e.target.value }})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-gray-800 outline-none text-sm" />
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">别名 (Slug) *</label>
                  <input required value={form.slug} onChange={e => setForm({...form, slug: e.target.value})} placeholder="如: serum" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-gray-800 outline-none text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">排序</label>
                  <input type="number" value={form.sort_order} onChange={e => setForm({...form, sort_order: parseInt(e.target.value)||0})} className="w-full px-3 py-2 border rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
                  <select value={form.is_active} onChange={e => setForm({...form, is_active: parseInt(e.target.value)})} className="w-full px-3 py-2 border rounded-lg text-sm">
                    <option value={1}>启用</option>
                    <option value={0}>禁用</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 justify-end pt-4 border-t">
                <button type="button" onClick={() => setIsOpen(false)} className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 text-sm">取消</button>
                <button type="submit" disabled={saveMut.isPending} className="px-6 py-2 bg-stone-900 text-white rounded-lg hover:bg-stone-800 disabled:opacity-50 text-sm">保存</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ===================== 产品分类（原有Categories逻辑，保留description+image） =====================
function ProductCategories() {
  const qc = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [langTab, setLangTab] = useState<'zh'|'en'|'de'>('zh');
  const [form, setForm] = useState({ name: '', slug: '', description: '', image: '', sort_order: 0, is_active: 1 });
  const [trans, setTrans] = useState<any>({ en: { name: '', description: '' }, de: { name: '', description: '' } });

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: async () => {
      const res: any = await api.get('/admin/categories');
      return res.categories.map((c: any) => {
        let p = { en: { name: '', description: '' }, de: { name: '', description: '' } };
        if (c.translations) { try { p = typeof c.translations === 'string' ? JSON.parse(c.translations) : c.translations; if (!p.en) p.en = { name: '', description: '' }; if (!p.de) p.de = { name: '', description: '' }; } catch {} }
        return { ...c, translations: p };
      });
    }
  });

  const saveMut = useMutation({
    mutationFn: (d: any) => editId ? api.put(`/admin/categories/${editId}`, d) : api.post('/admin/categories', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-categories'] }); setIsOpen(false); toast.success('保存成功'); },
    onError: (e: any) => toast.error(e.response?.data?.error || '保存失败')
  });

  const delMut = useMutation({
    mutationFn: (id: number) => api.delete(`/admin/categories/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-categories'] }); toast.success('删除成功'); },
    onError: (e: any) => toast.error(e.response?.data?.error || '删除失败')
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, is_active }: { id: number; is_active: number }) =>
      api.put(`/admin/categories/${id}`, { is_active: is_active ? 0 : 1 }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-categories'] }); },
    onError: (e: any) => toast.error(e.response?.data?.error || '操作失败')
  });

  const translateMut = useMutation({
    mutationFn: async () => {
      const texts = { name: form.name, description: form.description || '' };
      const [en, de] = await Promise.all([api.post('/ai/translate', { texts, targetLang: 'en' }), api.post('/ai/translate', { texts, targetLang: 'de' })]);
      return { en: (en as any).translated, de: (de as any).translated };
    },
    onSuccess: (r) => { setTrans({ en: { name: r.en?.name||'', description: r.en?.description||'' }, de: { name: r.de?.name||'', description: r.de?.description||'' } }); toast.success('翻译完成'); },
    onError: () => toast.error('翻译失败')
  });

  const openModal = (cat?: any) => {
    setLangTab('zh');
    if (cat) { setEditId(cat.id); setForm({ name: cat.name, slug: cat.slug, description: cat.description||'', image: cat.image||'', sort_order: cat.sort_order, is_active: cat.is_active }); setTrans(cat.translations); }
    else { setEditId(null); setForm({ name: '', slug: '', description: '', image: '', sort_order: 0, is_active: 1 }); setTrans({ en: { name: '', description: '' }, de: { name: '', description: '' } }); }
    setIsOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.slug.trim()) return toast.error('名称和别名为必填');
    saveMut.mutate({ ...form, translations: trans });
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-gray-500">管理前端商城的产品系列目录</p>
        <button onClick={() => openModal()} className="flex items-center gap-1 px-4 py-2 bg-stone-900 text-white rounded-lg hover:bg-stone-800 text-sm"><Plus size={16} /> 新增分类</button>
      </div>

      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead><tr className="bg-gray-50 border-b">
            <th className="p-3 font-medium text-gray-600 w-12">ID</th>
            <th className="p-3 font-medium text-gray-600">名称</th>
            <th className="p-3 font-medium text-gray-600">EN</th>
            <th className="p-3 font-medium text-gray-600">Slug</th>
            <th className="p-3 font-medium text-gray-600 w-16">排序</th>
            <th className="p-3 font-medium text-gray-600 w-16">状态</th>
            <th className="p-3 font-medium text-gray-600 text-right w-24">操作</th>
          </tr></thead>
          <tbody className="divide-y">
            {isLoading ? <tr><td colSpan={7} className="p-8 text-center text-gray-400">加载中...</td></tr> : categories.length === 0 ? <tr><td colSpan={7} className="p-8 text-center text-gray-400">暂无数据</td></tr> : categories.map((cat: any) => (
              <tr key={cat.id} className="hover:bg-gray-50">
                <td className="p-3 text-gray-400">#{cat.id}</td>
                <td className="p-3 font-medium text-gray-800">{cat.name}</td>
                <td className="p-3 text-gray-500">{cat.translations?.en?.name || '-'}</td>
                <td className="p-3 text-gray-500">{cat.slug}</td>
                <td className="p-3 text-gray-500">{cat.sort_order}</td>
                <td className="p-3"><span className={`px-2 py-0.5 rounded-full text-xs ${cat.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{cat.is_active ? '启用' : '禁用'}</span></td>
                <td className="p-3 text-right">
                  <button
                    onClick={() => toggleMut.mutate({ id: cat.id, is_active: cat.is_active })}
                    title={cat.is_active ? '点击禁用' : '点击启用'}
                    className={`p-1.5 ${cat.is_active ? 'text-green-500 hover:text-gray-500' : 'text-gray-300 hover:text-green-500'}`}
                  >
                    {cat.is_active ? <Power size={16} /> : <PowerOff size={16} />}
                  </button>
                  <button onClick={() => openModal(cat)} className="p-1.5 text-gray-400 hover:text-blue-600"><Edit2 size={16} /></button>
                  <button onClick={() => { if(confirm('确定删除？如有商品关联将失败。')) delMut.mutate(cat.id); }} className="p-1.5 text-gray-400 hover:text-red-600"><Trash2 size={16} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-lg font-bold">{editId ? '编辑' : '新增'}产品分类</h3>
              <div className="flex items-center gap-3">
                <div className="flex border-b">
                  {(['zh','en','de'] as const).map(l => (
                    <button key={l} onClick={() => setLangTab(l)} className={`px-3 py-1.5 text-xs font-medium border-b-2 ${langTab === l ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500'}`}>
                      {l === 'zh' ? '中文' : l === 'en' ? 'EN' : 'DE'}
                    </button>
                  ))}
                </div>
                <button onClick={() => translateMut.mutate()} disabled={translateMut.isPending || !form.name} className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded hover:bg-blue-100 disabled:opacity-50">
                  {translateMut.isPending ? <RefreshCw size={12} className="animate-spin" /> : <Bot size={12} />} 翻译
                </button>
              </div>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{langTab === 'zh' ? '分类名称 *' : langTab === 'en' ? 'English Name' : 'Deutscher Name'}</label>
                  {langTab === 'zh' ? (
                    <input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-gray-800 outline-none text-sm" />
                  ) : (
                    <input value={trans[langTab]?.name || ''} onChange={e => setTrans({...trans, [langTab]: {...trans[langTab], name: e.target.value}})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-gray-800 outline-none text-sm" />
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">别名 (Slug) *</label>
                  <input required value={form.slug} onChange={e => setForm({...form, slug: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="如: cleanser" />
                </div>
              </div>
              {langTab === 'zh' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
                  <textarea rows={3} value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" />
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{langTab === 'en' ? 'Description' : 'Beschreibung'}</label>
                  <textarea rows={3} value={trans[langTab]?.description || ''} onChange={e => setTrans({...trans, [langTab]: {...trans[langTab], description: e.target.value}})} className="w-full px-3 py-2 border rounded-lg text-sm" />
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">排序</label>
                  <input type="number" value={form.sort_order} onChange={e => setForm({...form, sort_order: parseInt(e.target.value)||0})} className="w-full px-3 py-2 border rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
                  <select value={form.is_active} onChange={e => setForm({...form, is_active: parseInt(e.target.value)})} className="w-full px-3 py-2 border rounded-lg text-sm">
                    <option value={1}>启用</option>
                    <option value={0}>禁用</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 justify-end pt-4 border-t">
                <button type="button" onClick={() => setIsOpen(false)} className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 text-sm">取消</button>
                <button type="submit" disabled={saveMut.isPending} className="px-6 py-2 bg-stone-900 text-white rounded-lg hover:bg-stone-800 disabled:opacity-50 text-sm">保存</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ===================== 主页面: 4-Tab 分类管理 =====================
const TABS = [
  { key: 'categories', label: '产品分类', icon: Tags },
  { key: 'dosage-forms', label: '产品剂型', icon: Droplets },
  { key: 'skin-concerns', label: '肌肤诉求', icon: Sparkles },
  { key: 'skin-types', label: '肤质分类', icon: Heart },
] as const;

export default function AdminCategories() {
  const [tab, setTab] = useState<string>('categories');

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-stone-800">分类管理</h1>
        <p className="text-sm text-stone-500 mt-1">管理产品分类、剂型、肌肤诉求与肤质标签</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-stone-100 rounded-lg p-1 w-fit">
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-md text-sm font-medium transition-all ${tab === t.key ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
            >
              <Icon size={16} /> {t.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        {tab === 'categories' && <ProductCategories />}
        {tab === 'dosage-forms' && <TagManager apiPath="dosage-forms" label="产品剂型" />}
        {tab === 'skin-concerns' && <TagManager apiPath="skin-concerns" label="肌肤诉求" />}
        {tab === 'skin-types' && <TagManager apiPath="skin-types" label="肤质分类" />}
      </div>
    </div>
  );
}
