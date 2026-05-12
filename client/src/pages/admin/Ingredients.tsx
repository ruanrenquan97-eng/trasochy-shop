import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../utils/api';

interface Ingredient {
  id: number;
  name: string;
  inci_name: string | null;
  description: string | null;
  benefits: string | null;
}

export default function AdminIngredients() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', inciName: '', description: '', benefits: '' });

  const { data: ingredients = [], isLoading } = useQuery({
    queryKey: ['admin-ingredients'],
    queryFn: async () => {
      const res: any = await api.get('/admin/ingredients');
      return res.ingredients as Ingredient[];
    }
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof formData) => api.post('/admin/ingredients', data),
    onSuccess: () => {
      toast.success('成分添加成功');
      queryClient.invalidateQueries({ queryKey: ['admin-ingredients'] });
      setIsModalOpen(false);
    },
    onError: (err: any) => toast.error(err.response?.data?.error || '添加失败')
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number, data: typeof formData }) => api.put(`/admin/ingredients/${id}`, data),
    onSuccess: () => {
      toast.success('成分更新成功');
      queryClient.invalidateQueries({ queryKey: ['admin-ingredients'] });
      setIsModalOpen(false);
    },
    onError: (err: any) => toast.error(err.response?.data?.error || '更新失败')
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/admin/ingredients/${id}`),
    onSuccess: () => {
      toast.success('成分删除成功');
      queryClient.invalidateQueries({ queryKey: ['admin-ingredients'] });
    },
    onError: (err: any) => toast.error(err.response?.data?.error || '删除失败')
  });

  const handleOpenModal = (ing?: Ingredient) => {
    if (ing) {
      setEditingId(ing.id);
      setFormData({
        name: ing.name,
        inciName: ing.inci_name || '',
        description: ing.description || '',
        benefits: ing.benefits || ''
      });
    } else {
      setEditingId(null);
      setFormData({ name: '', inciName: '', description: '', benefits: '' });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return toast.error('成分名称为必填项');
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  if (isLoading) return <div className="p-8 text-center text-gray-500">加载中...</div>;

  return (
    <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-800 mb-1">成分管理 (Ingredient Glossary)</h2>
          <p className="text-sm text-gray-500">管理商品核心成分库，在前台展示科普与对比数据。</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
        >
          <Plus size={16} /> 新增成分
        </button>
      </div>

      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="p-4 font-medium text-gray-600">ID</th>
              <th className="p-4 font-medium text-gray-600">成分名称</th>
              <th className="p-4 font-medium text-gray-600">INCI名称</th>
              <th className="p-4 font-medium text-gray-600">主要功效</th>
              <th className="p-4 font-medium text-gray-600">描述</th>
              <th className="p-4 font-medium text-gray-600 text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {ingredients.map(ing => (
              <tr key={ing.id} className="hover:bg-gray-50">
                <td className="p-4 text-gray-500">#{ing.id}</td>
                <td className="p-4 font-medium text-gray-800">{ing.name}</td>
                <td className="p-4 text-sm text-gray-500">{ing.inci_name || '-'}</td>
                <td className="p-4">
                  <div className="flex flex-wrap gap-1">
                    {ing.benefits ? ing.benefits.split(',').map(b => (
                      <span key={b} className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full text-xs">{b}</span>
                    )) : '-'}
                  </div>
                </td>
                <td className="p-4 text-sm text-gray-500 max-w-xs truncate">{ing.description || '-'}</td>
                <td className="p-4 text-right space-x-2">
                  <button onClick={() => handleOpenModal(ing)} className="p-2 text-gray-400 hover:text-blue-600 transition">
                    <Edit2 size={18} />
                  </button>
                  <button onClick={() => { if(confirm('确定删除吗？将会解绑相关商品')) deleteMutation.mutate(ing.id); }} className="p-2 text-gray-400 hover:text-red-600 transition">
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
            {ingredients.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-gray-500">暂无数据</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 弹窗 */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4">{editingId ? '编辑成分' : '新增成分'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">成分名称 *</label>
                <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-gray-800 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">INCI 国际名称</label>
                <input type="text" value={formData.inciName} onChange={e => setFormData({...formData, inciName: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-gray-800 outline-none" placeholder="如: Niacinamide" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">主要功效 (逗号分隔)</label>
                <input type="text" value={formData.benefits} onChange={e => setFormData({...formData, benefits: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-gray-800 outline-none" placeholder="如: 美白,控油" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">成分描述</label>
                <textarea rows={3} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-gray-800 outline-none"></textarea>
              </div>
              <div className="flex gap-3 justify-end pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200">取消</button>
                <button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 disabled:opacity-50">保存</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
