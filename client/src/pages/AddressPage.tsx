import { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { MapPin, Plus, Trash2, Edit3, Star, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { useTranslation } from "react-i18next";

interface Address {
  id: number;
  name: string;
  phone: string;
  province: string;
  city: string;
  district: string;
  address: string;
  is_default: boolean;
}


const emptyForm = { name: '', phone: '', province: '', city: '', district: '', address: '', isDefault: false };

export default function AddressPage() {
    const { t } = useTranslation();
  const PROVINCES = [t('auto_addresspage_24', '北京市'), t('auto_addresspage_25', '上海市'), t('auto_addresspage_26', '广东省'), t('auto_addresspage_27', '浙江省'), t('auto_addresspage_28', '江苏省'), t('auto_addresspage_29', '四川省'), t('auto_addresspage_30', '湖北省'), t('auto_addresspage_31', '湖南省'), t('auto_addresspage_32', '福建省'), t('auto_addresspage_33', '山东省'), t('auto_addresspage_34', '河南省'), t('auto_addresspage_35', '河北省'), t('auto_addresspage_36', '安徽省'), t('auto_addresspage_37', '重庆市'), t('auto_addresspage_38', '天津市'), t('auto_addresspage_39', '陕西省'), t('auto_addresspage_40', '辽宁省'), t('auto_addresspage_41', '吉林省'), t('auto_addresspage_42', '黑龙江省'), t('auto_addresspage_43', '江西省'), t('auto_addresspage_44', '山西省'), t('auto_addresspage_45', '贵州省'), t('auto_addresspage_46', '云南省'), t('auto_addresspage_47', '广西壮族自治区')];
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Address | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { data: addresses, isLoading } = useQuery({
    queryKey: ['addresses'],
    queryFn: () => api.get('/addresses'),
  }) as any;

  const resetForm = () => {
    setForm(emptyForm);
    setEditing(null);
    setShowForm(false);
  };

  const handleEdit = (addr: Address) => {
    setEditing(addr);
    setForm({
      name: addr.name,
      phone: addr.phone,
      province: addr.province,
      city: addr.city,
      district: addr.district,
      address: addr.address,
      isDefault: addr.is_default,
    });
    setShowForm(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editing) {
        return api.put(`/addresses/${editing.id}`, form);
      }
      return api.post('/addresses', form);
    },
    onSuccess: () => {
      toast.success(editing ? t('auto_addresspage_48', '地址已更新') : t('auto_addresspage_49', '地址已添加'));
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
      resetForm();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/addresses/${id}`),
    onSuccess: () => {
      toast.success(t('auto_addresspage_50', '地址已删除'));
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const setDefaultMutation = useMutation({
    mutationFn: (id: number) => api.put(`/addresses/${id}/default`),
    onSuccess: () => {
      toast.success(t('auto_addresspage_51', '已设为默认地址'));
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.phone || !form.province || !form.city || !form.district || !form.address) {
      toast.error(t('auto_addresspage_52', '请填写完整地址信息'));
      return;
    }
    saveMutation.mutate();
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-medium text-stone-700 flex items-center gap-2">
          <MapPin size={20} /> {t('auto_shoplayout_336', '收货地址')}
        </h1>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="btn-primary text-xs py-2 px-4 flex items-center gap-1">
          <Plus size={14} /> {t('auto_addresspage_54', '新增地址')}
        </button>
      </div>

      {/* 地址表单 */}
      {showForm && (
        <div className="card p-6 mb-6 border-stone-900">
          <h2 className="text-xs font-semibold text-stone-900 mb-5 tracking-widest uppercase">
            {editing ? t('auto_addresspage_53', '编辑地址') : t('auto_addresspage_54', '新增地址')}
          </h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-stone-400 mb-1.5 block tracking-wider">{t('auto_addresspage_3', t('auto_addresspage_3', '收件人 *'))}</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder={t('auto_addresspage_16', '请输入姓名')}
                className="w-full border border-stone-300 px-4 py-2.5 text-sm focus:outline-none focus:border-stone-900" />
            </div>
            <div>
              <label className="text-xs text-stone-400 mb-1.5 block tracking-wider">{t('auto_addresspage_4', t('auto_addresspage_4', '联系电话 *'))}</label>
              <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder={t('auto_addresspage_17', '请输入手机号')}
                className="w-full border border-stone-300 px-4 py-2.5 text-sm focus:outline-none focus:border-stone-900" />
            </div>
            <div>
              <label className="text-xs text-stone-400 mb-1.5 block tracking-wider">{t('auto_addresspage_5', t('auto_addresspage_5', '省份 *'))}</label>
              <select value={form.province} onChange={e => setForm({ ...form, province: e.target.value, city: '', district: '' })}
                className="w-full border border-stone-300 px-4 py-2.5 text-sm focus:outline-none focus:border-stone-900 bg-white">
                <option value="">{t('auto_addresspage_6', t('auto_addresspage_6', '请选择省份'))}</option>
                {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-stone-400 mb-1.5 block tracking-wider">{t('auto_addresspage_7', t('auto_addresspage_7', '城市 *'))}</label>
              <input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} placeholder={t('auto_addresspage_18', '请输入城市')}
                className="w-full border border-stone-300 px-4 py-2.5 text-sm focus:outline-none focus:border-stone-900" />
            </div>
            <div>
              <label className="text-xs text-stone-400 mb-1.5 block tracking-wider">{t('auto_addresspage_8', t('auto_addresspage_8', '区县 *'))}</label>
              <input value={form.district} onChange={e => setForm({ ...form, district: e.target.value })} placeholder={t('auto_addresspage_19', '请输入区/县')}
                className="w-full border border-stone-300 px-4 py-2.5 text-sm focus:outline-none focus:border-stone-900" />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-stone-400 mb-1.5 block tracking-wider">{t('auto_addresspage_9', t('auto_addresspage_9', '详细地址 *'))}</label>
              <input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder={t('auto_addresspage_20', '街道、门牌号等')}
                className="w-full border border-stone-300 px-4 py-2.5 text-sm focus:outline-none focus:border-stone-900" />
            </div>
            <div className="col-span-2">
              <label className="flex items-center gap-2 text-sm text-stone-600 cursor-pointer">
                <input type="checkbox" checked={form.isDefault} onChange={e => setForm({ ...form, isDefault: e.target.checked })}
                  className="w-4 h-4 accent-stone-900" />
                {t('auto_addresspage_10', '设为默认地址')}
              </label>
            </div>
            <div className="col-span-2 flex gap-3 pt-2">
              <button type="submit" disabled={saveMutation.isPending}
                className="btn-primary text-xs py-2.5 px-6 disabled:opacity-50">
                {saveMutation.isPending ? t('auto_addresspage_55', '保存中...') : t('auto_addresspage_56', '保存地址')}
              </button>
              <button type="button" onClick={resetForm}
                className="btn-outline text-xs py-2.5 px-6">
                {t('auto_productdetailpage_224', '取消')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 地址列表 */}
      {isLoading ? (
        <div className="text-center py-10 text-stone-400">{t('auto_staticpage_313', t('auto_staticpage_313', '加载中...'))}</div>
      ) : addresses?.length > 0 ? (
        <div className="grid gap-3">
          {addresses.map((addr: Address) => (
            <div key={addr.id} className={`card p-5 flex items-start justify-between gap-4 ${addr.is_default ? 'border-stone-900' : ''}`}>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="font-medium text-stone-800">{addr.name}</span>
                  <span className="text-sm text-stone-400">{addr.phone}</span>
                  {addr.is_default && (
                    <span className="text-xs bg-stone-900 text-white px-2 py-0.5 tracking-wider uppercase">{t('auto_addresspage_13', t('auto_addresspage_13', '默认'))}</span>
                  )}
                </div>
                <p className="text-sm text-stone-500">
                  {addr.province} {addr.city} {addr.district} {addr.address}
                </p>
              </div>
              <div className="flex items-center gap-2 text-stone-400">
                {!addr.is_default && (
                  <button onClick={() => setDefaultMutation.mutate(addr.id)}
                    className="p-2 hover:text-stone-900 transition-colors" title={t('auto_addresspage_21', '设为默认')}>
                    <Check size={14} />
                  </button>
                )}
                <button onClick={() => handleEdit(addr)}
                  className="p-2 hover:text-stone-900 transition-colors" title={t('auto_addresspage_22', '编辑')}>
                  <Edit3 size={14} />
                </button>
                <button onClick={() => { if (confirm(t('auto_addresspage_57', '确认删除该地址？'))) deleteMutation.mutate(addr.id); }}
                  className="p-2 hover:text-rose-500 transition-colors" title={t('auto_addresspage_23', '删除')}>
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 text-stone-400">
          <MapPin size={40} className="mx-auto mb-3 text-stone-200" />
          <p className="text-sm">{t('auto_addresspage_14', t('auto_addresspage_14', '暂无收货地址'))}</p>
          <button onClick={() => setShowForm(true)} className="text-rose-400 text-sm hover:underline mt-2">
            {t('auto_addresspage_15', '添加第一个地址')}
          </button>
        </div>
      )}
    </div>
  );
}
