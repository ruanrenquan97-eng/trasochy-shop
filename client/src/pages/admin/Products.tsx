import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Plus, Search, Edit2, Trash2, X, Upload, ImageIcon, Bot, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import api from '../../utils/api';

const LEVELS = ['guest', 'member', 'silver', 'gold', 'diamond'];
const LEVEL_NAMES: Record<string, string> = { guest: '游客', member: '普通会员', silver: '银卡会员', gold: '金卡会员', diamond: '钻石会员' };

// Dynamic tags will be fetched from API instead of hardcoded

interface ProductForm {
  id?: number;
  name: string;
  slug: string;
  description: string;
  detail: string;
  categoryId: string;
  basePrice: string;
  pointsPrice: string;
  stock: string;
  unit: string;
  isActive: boolean;
  mainImage: string;
  images: string[];
  prices: Record<string, { price: string; discount: string }>;
  isBundle: boolean;
  bundleProductIds: number[];
  skinTypes: string[];
  concerns: string[];
  dosageForms: string[];
  ingredientIds: number[];
  beforeAfterImages: { before: string; after: string }[];
  isSample: boolean;
  isStoryPage: boolean;
  isFeatured: boolean;
  sortOrder: string;
  tags: string[];
  translations: Record<string, any>;
}

const defaultForm = (): ProductForm => ({
  name: '', slug: '', description: '', detail: '', categoryId: '', basePrice: '', pointsPrice: '', stock: '0', unit: '件', isActive: true, mainImage: '', images: [],
  prices: { guest: { price: '', discount: '1.0' }, member: { price: '', discount: '0.9' }, silver: { price: '', discount: '0.8' }, gold: { price: '', discount: '0.7' }, diamond: { price: '', discount: '0.6' } },
  isBundle: false, bundleProductIds: [],
  skinTypes: [], concerns: [], dosageForms: [], ingredientIds: [], beforeAfterImages: [],
  isSample: false, isStoryPage: false, isFeatured: false, sortOrder: '0', tags: [],
  translations: { en: { name: '', description: '', detail: '' }, de: { name: '', description: '', detail: '' } }
});

export default function AdminProducts() {
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState<ProductForm>(defaultForm());
  const [langTab, setLangTab] = useState('zh');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [openGallery, setOpenGallery] = useState(false);
  const [galleryTarget, setGalleryTarget] = useState<'mainImage' | 'gallery'>('mainImage');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const multiFileInputRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();

  const translateAllMutation = useMutation({
    mutationFn: async () => {
      const textsToTranslate = {
        name: form.name,
        description: form.description,
        detail: form.detail
      };
      
      const [enRes, deRes] = await Promise.all([
        api.post('/ai/translate', { texts: textsToTranslate, targetLang: 'en' }),
        api.post('/ai/translate', { texts: textsToTranslate, targetLang: 'de' })
      ]);
      
      return {
        en: (enRes as any).translated || {},
        de: (deRes as any).translated || {}
      };
    },
    onSuccess: (results: any) => {
      if (!results) return;
      
      setForm(f => ({
        ...f,
        translations: {
          ...f.translations,
          en: {
            ...f.translations?.en,
            name: results.en.name || f.translations?.en?.name || '',
            description: results.en.description || f.translations?.en?.description || '',
            detail: results.en.detail || f.translations?.en?.detail || ''
          },
          de: {
            ...f.translations?.de,
            name: results.de.name || f.translations?.de?.name || '',
            description: results.de.description || f.translations?.de?.description || '',
            detail: results.de.detail || f.translations?.de?.detail || ''
          }
        }
      }));
      toast.success('双语翻译已生成，请点击保存应用更改');
    },
    onError: (err: any) => toast.error(err.message || '翻译失败')
  });

  const translateRowMutation = useMutation({
    mutationFn: async (product: any) => {
      // Step 1: Fetch full product detail to prevent data loss on PUT
      const fullProduct: any = await api.get(`/admin/products/${product.id}`);

      const textsToTranslate = {
        name: fullProduct.name || '',
        description: fullProduct.description || '',
        detail: fullProduct.detail || ''
      };
      
      const [enRes, deRes] = await Promise.all([
        api.post('/ai/translate', { texts: textsToTranslate, targetLang: 'en' }),
        api.post('/ai/translate', { texts: textsToTranslate, targetLang: 'de' })
      ]);
      
      const en = (enRes as any).translated || {};
      const de = (deRes as any).translated || {};
      
      if (!en.name && !de.name) {
        throw new Error('翻译结果为空');
      }

      const existingTrans = fullProduct.translations 
        ? (typeof fullProduct.translations === 'string' ? JSON.parse(fullProduct.translations) : fullProduct.translations)
        : { en: {}, de: {} };

      const newTrans = {
        ...existingTrans,
        en: { ...existingTrans.en, name: en.name || existingTrans.en?.name, description: en.description || existingTrans.en?.description, detail: en.detail || existingTrans.en?.detail },
        de: { ...existingTrans.de, name: de.name || existingTrans.de?.name, description: de.description || existingTrans.de?.description, detail: de.detail || existingTrans.de?.detail },
      };

      const pricesMap: any = {};
      if (fullProduct.prices && typeof fullProduct.prices === 'object' && !Array.isArray(fullProduct.prices)) {
        for (const [level, p] of Object.entries(fullProduct.prices)) {
           pricesMap[level] = { price: (p as any).price, discount: (p as any).discount };
        }
      }

      const payload = {
        name: fullProduct.name,
        slug: fullProduct.slug,
        description: fullProduct.description,
        detail: fullProduct.detail,
        categoryId: fullProduct.category_id,
        basePrice: fullProduct.base_price,
        pointsPrice: fullProduct.points_price,
        stock: fullProduct.stock,
        unit: fullProduct.unit,
        isActive: fullProduct.is_active,
        mainImage: fullProduct.main_image,
        images: fullProduct.images, 
        prices: pricesMap,
        isBundle: fullProduct.is_bundle,
        bundleProductIds: fullProduct.bundleProductIds,
        skinTypes: fullProduct.skin_types,
        concerns: fullProduct.concerns,
        dosageForms: fullProduct.dosage_forms,
        ingredientIds: fullProduct.ingredientIds,
        beforeAfterImages: fullProduct.before_after_images,
        isSample: fullProduct.is_sample,
        isStoryPage: fullProduct.is_story_page,
        isFeatured: fullProduct.is_featured,
        sortOrder: fullProduct.sort_order,
        translations: newTrans
      };

      await api.put(`/admin/products/${product.id}`, payload);
      return product.id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-products'] });
      toast.success('商品一键同步翻译完成');
    },
    onError: (err: any) => {
      toast.error(err.message || '同步翻译失败');
    }
  });

  const quickEditMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: any }) => {
      await api.patch(`/admin/products/${id}/quick-edit`, payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-products'] });
      toast.success('更新成功');
    },
    onError: (err: any) => toast.error(err.message || '更新失败')
  });

  const handleQuickEdit = (id: number, payload: any) => {
    quickEditMutation.mutate({ id, payload });
  };

  const { data, isLoading } = useQuery({
    queryKey: ['admin-products', keyword, page],
    queryFn: () => api.get(`/admin/products?${new URLSearchParams({ keyword, page: String(page), limit: '15' }).toString()}`),
  }) as any;

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get('/products/categories/list'),
  }) as any;

  const { data: allProductsData } = useQuery({
    queryKey: ['admin-all-products'],
    queryFn: () => api.get('/admin/products?limit=1000'),
  }) as any;
  const allProducts = allProductsData?.products || [];

  const { data: ingredientsData } = useQuery({
    queryKey: ['admin-ingredients'],
    queryFn: async () => {
      const res: any = await api.get('/admin/ingredients');
      return res.ingredients || res;
    },
  }) as any;
  const ingredients = Array.isArray(ingredientsData) ? ingredientsData : (ingredientsData?.ingredients || []);

  const { data: skinTypesData } = useQuery({
    queryKey: ['skin-types'],
    queryFn: () => api.get('/admin/skin-types'),
  }) as any;
  const dbSkinTypes = (skinTypesData?.items || []).filter((t: any) => t.is_active);

  const { data: concernsData } = useQuery({
    queryKey: ['skin-concerns'],
    queryFn: () => api.get('/admin/skin-concerns'),
  }) as any;
  const dbConcerns = (concernsData?.items || []).filter((t: any) => t.is_active);

  const { data: dosageFormsData } = useQuery({
    queryKey: ['dosage-forms'],
    queryFn: () => api.get('/admin/dosage-forms'),
  }) as any;
  const dbDosageForms = (dosageFormsData?.items || []).filter((t: any) => t.is_active);

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.get('/settings'),
  }) as any;

  const openCreate = () => {
    setForm(defaultForm());
    setLangTab('zh');
    setModal(true);
  };

  const openEdit = (product: any) => {
    const pricesMap: Record<string, { price: string; discount: string }> = {};
    LEVELS.forEach(level => {
      const p = product.prices?.find((x: any) => x.level === level);
      pricesMap[level] = { price: String(p?.price || ''), discount: String(p?.discount || '') };
    });
    setForm({
      id: product.id, name: product.name, slug: product.slug, description: product.description || '', detail: product.detail || '',
      categoryId: String(product.category_id || ''), basePrice: String(product.base_price), pointsPrice: String(product.points_price || ''), stock: String(product.stock),
      unit: product.unit, isActive: !!product.is_active,
      mainImage: product.main_image || '',
      images: product.images ? (typeof product.images === 'string' ? JSON.parse(product.images) : product.images) : [],
      prices: pricesMap,
      isBundle: !!product.is_bundle,
      bundleProductIds: product.bundleProductIds ? (typeof product.bundleProductIds === 'string' ? JSON.parse(product.bundleProductIds) : product.bundleProductIds) : [],
      skinTypes: product.skin_types ? (typeof product.skin_types === 'string' ? JSON.parse(product.skin_types) : product.skin_types) : [],
      concerns: product.concerns ? (typeof product.concerns === 'string' ? JSON.parse(product.concerns) : product.concerns) : [],
      dosageForms: product.dosage_forms ? (typeof product.dosage_forms === 'string' ? JSON.parse(product.dosage_forms) : product.dosage_forms) : [],
      ingredientIds: product.ingredientIds ? (typeof product.ingredientIds === 'string' ? JSON.parse(product.ingredientIds) : product.ingredientIds) : [],
      beforeAfterImages: product.before_after_images ? (typeof product.before_after_images === 'string' ? JSON.parse(product.before_after_images) : product.before_after_images) : [],
      isSample: !!product.is_sample,
      isStoryPage: !!product.is_story_page,
      isFeatured: !!product.is_featured,
      sortOrder: String(product.sort_order || 0),
      tags: product.tags ? (typeof product.tags === 'string' ? JSON.parse(product.tags) : product.tags) : [],
      translations: product.translations || { en: { name: '', description: '', detail: '' }, de: { name: '', description: '', detail: '' } }
    });
    setLangTab('zh');
    setModal(true);
  };

  const handleBasePriceChange = (value: string) => {
    const bp = parseFloat(value) || 0;
    const defaultDiscounts: Record<string, number> = { guest: 1.0, member: 0.9, silver: 0.8, gold: 0.7, diamond: 0.6 };
    setForm(f => ({
      ...f, basePrice: value,
      prices: Object.fromEntries(LEVELS.map(level => [level, {
        price: String(Math.round(bp * defaultDiscounts[level] * 100) / 100),
        discount: f.prices[level]?.discount || String(defaultDiscounts[level]),
      }])),
    }));
  };

  const handleUploadMainImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      const res: any = await api.post('/upload/single', formData);
      setForm(f => ({ ...f, mainImage: res.url }));
      toast.success('主图上传成功');
    } catch (err: any) {
      toast.error(err.message || '上传失败');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleUploadImages = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const formData = new FormData();
      Array.from(files).forEach(f => formData.append('images', f));
      const res: any = await api.post('/upload/multiple', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        transformRequest: [(data: any) => data],
      });
      setForm(f => ({ ...f, images: [...f.images, ...res.urls] }));
      toast.success(`成功上传 ${res.urls.length} 张图片`);
    } catch (err: any) {
      toast.error(err.message || '上传失败');
    } finally {
      setUploading(false);
      if (multiFileInputRef.current) multiFileInputRef.current.value = '';
    }
  };

  // 富文本编辑器图片上传处理
  const imageHandler = useCallback(() => {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*');
    input.click();
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      setUploading(true);
      try {
        const formData = new FormData();
        formData.append('image', file);
        const res: any = await api.post('/upload/single', formData);
        // 获取 Quill 编辑器实例，在光标位置插入图片
        const quill = (window as any).__quill_editor_ref;
        if (quill) {
          const range = quill.getSelection(true);
          quill.clipboard.dangerouslyPasteHTML(range.index, `<img src="${res.url}" style="max-width:100%;height:auto;" />`);
        }
        toast.success('图片已插入详情');
      } catch (err: any) {
        toast.error(err.message || '上传失败');
      } finally {
        setUploading(false);
      }
    };
  }, []);

  const removeImage = (index: number) => {
    setForm(f => ({ ...f, images: f.images.filter((_, i) => i !== index) }));
  };

  const setAsMainImage = (index: number) => {
    setForm(f => {
      const newImages = [...f.images];
      const currentMain = f.mainImage;
      const selectedImage = newImages[index];

      if (currentMain) {
        newImages[index] = currentMain;
      } else {
        newImages.splice(index, 1);
      }

      return {
        ...f,
        mainImage: selectedImage,
        images: newImages,
      };
    });
  };

  const handleSave = async () => {
    if (!form.name || !form.basePrice) { toast.error('商品名称和基础价格必填'); return; }
    setSaving(true);
    try {
      const payload: any = {
        name: form.name, slug: form.slug || form.name.replace(/\s+/g, '-'),
        description: form.description, detail: form.detail, categoryId: form.categoryId ? parseInt(form.categoryId) : null,
        basePrice: parseFloat(form.basePrice), pointsPrice: form.pointsPrice ? parseInt(form.pointsPrice) : null, stock: parseInt(form.stock), unit: form.unit, isActive: form.isActive,
        mainImage: form.mainImage || null,
        images: form.images.length > 0 ? JSON.stringify(form.images) : null,
        prices: Object.fromEntries(LEVELS.map(level => [level, {
          price: parseFloat(form.prices[level]?.price || form.basePrice),
          discount: parseFloat(form.prices[level]?.discount || '1'),
        }])),
        isBundle: form.isBundle,
        bundleProductIds: form.isBundle ? form.bundleProductIds : [],
        skinTypes: form.skinTypes.length > 0 ? JSON.stringify(form.skinTypes) : null,
        concerns: form.concerns.length > 0 ? JSON.stringify(form.concerns) : null,
        dosageForms: form.dosageForms.length > 0 ? JSON.stringify(form.dosageForms) : null,
        ingredientIds: form.ingredientIds,
        beforeAfterImages: form.beforeAfterImages.length > 0 ? JSON.stringify(form.beforeAfterImages) : null,
        isSample: form.isSample,
        isStoryPage: form.isStoryPage,
        isFeatured: form.isFeatured,
        sortOrder: parseInt(form.sortOrder) || 0,
        tags: form.tags && form.tags.length > 0 ? JSON.stringify(form.tags) : null,
        translations: form.translations,
      };
      if (form.id) {
        await api.put(`/admin/products/${form.id}`, payload);
        toast.success('商品已更新');
      } else {
        await api.post('/admin/products', payload);
        toast.success('商品已创建');
      }
      qc.invalidateQueries({ queryKey: ['admin-products'] });
      setModal(false);
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确认删除此商品？此操作不可恢复！')) return;
    try {
      await api.delete(`/admin/products/${id}`);
      qc.invalidateQueries({ queryKey: ['admin-products'] });
      toast.success('已删除');
    } catch (e: any) { toast.error(e.message); }
  };

  const totalPages = Math.ceil((data?.total || 0) / 15);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-medium text-stone-700">商品管理</h1>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2 py-2 px-4 text-sm">
          <Plus size={16} />新建商品
        </button>
      </div>

      <div className="flex gap-3 mb-5">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-2.5 text-stone-400" />
          <input value={keyword} onChange={e => { setKeyword(e.target.value); setPage(1); }} placeholder="搜索商品名称" className="w-full pl-8 pr-4 py-2 text-sm border border-stone-200 rounded-xl focus:outline-none focus:border-rose-300" />
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 border-b border-stone-100">
              <tr>
                <th className="text-left px-4 py-3 text-stone-500 font-medium">商品</th>
                <th className="text-left px-4 py-3 text-stone-500 font-medium">分类</th>
                <th className="text-left px-4 py-3 text-stone-500 font-medium">零售价</th>
                <th className="text-left px-4 py-3 text-stone-500 font-medium">库存</th>
                <th className="text-left px-4 py-3 text-stone-500 font-medium">排序</th>
                <th className="text-left px-4 py-3 text-stone-500 font-medium">推荐</th>
                <th className="text-left px-4 py-3 text-stone-500 font-medium">状态</th>
                <th className="text-left px-4 py-3 text-stone-500 font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50">
              {isLoading ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-stone-400">加载中...</td></tr>
              ) : data?.products?.map((product: any) => {
                const memberPrice = product.prices?.find((p: any) => p.level === 'member')?.price;
                const goldPrice = product.prices?.find((p: any) => p.level === 'gold')?.price;
                const diamondPrice = product.prices?.find((p: any) => p.level === 'diamond')?.price;
                return (
                  <tr key={product.id} className="hover:bg-stone-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-stone-50 rounded-lg overflow-hidden flex-shrink-0">
                          {product.main_image ? (
                            <img src={product.main_image} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-stone-200"><ImageIcon size={14} /></div>
                          )}
                        </div>
                        <div>
                          <a href={`/products/${product.slug}`} target="_blank" rel="noreferrer" className="font-medium text-stone-700 hover:text-rose-500 transition-colors line-clamp-1" title="在新标签页中预览商品">
                            {product.name}
                          </a>
                          <p className="text-xs text-stone-400">{product.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-stone-500">{product.category_name || '-'}</td>
                    <td className="px-4 py-3 font-medium text-stone-700">
                      ¥{product.base_price?.toFixed(2)}
                      <div className="text-[10px] text-stone-400 mt-1 flex flex-wrap gap-1">
                        <span className="bg-stone-100 px-1 py-0.5 rounded">会¥{memberPrice?.toFixed(2)}</span>
                        <span className="bg-amber-50 text-amber-600 px-1 py-0.5 rounded">金¥{goldPrice?.toFixed(2)}</span>
                        <span className="bg-indigo-50 text-indigo-600 px-1 py-0.5 rounded">钻¥{diamondPrice?.toFixed(2)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs ${product.stock < 10 ? 'text-amber-500' : 'text-stone-600'}`}>{product.stock}</span>
                    </td>
                    <td className="px-4 py-3">
                      <input 
                        type="number" 
                        className="w-16 border border-stone-200 rounded px-2 py-1 text-xs text-center focus:outline-none focus:border-rose-300 bg-stone-50 hover:bg-white" 
                        defaultValue={product.sort_order} 
                        onBlur={(e) => {
                          const val = parseInt(e.target.value);
                          if (!isNaN(val) && val !== product.sort_order) {
                            handleQuickEdit(product.id, { sortOrder: val });
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') e.currentTarget.blur();
                        }}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="sr-only peer" 
                          checked={!!product.is_featured} 
                          onChange={(e) => handleQuickEdit(product.id, { isFeatured: e.target.checked })} 
                        />
                        <div className="w-8 h-4 bg-stone-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-amber-400"></div>
                      </label>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${product.is_active ? 'bg-green-50 text-green-600' : 'bg-stone-100 text-stone-400'}`}>
                        {product.is_active ? '在售' : '下架'}
                      </span>
                      {product.is_bundle === 1 && (
                        <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-600">
                          组合
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 flex items-center gap-2">
                      <button 
                        onClick={() => handleQuickEdit(product.id, { isActive: !product.is_active })}
                        title={product.is_active ? '点击下架' : '点击上架'}
                        className={`text-xs px-2 py-1 rounded-full transition-colors ${
                          product.is_active 
                            ? 'bg-green-50 text-green-600 hover:bg-green-100' 
                            : 'bg-stone-100 text-stone-400 hover:bg-stone-200'
                        }`}
                      >
                        {product.is_active ? '上架中' : '已下架'}
                      </button>
                      <button 
                        onClick={() => translateRowMutation.mutate(product)} 
                        disabled={translateRowMutation.isPending && translateRowMutation.variables?.id === product.id}
                        title="一键同步双语翻译"
                        className="text-blue-400 hover:text-blue-500 transition-colors disabled:opacity-50"
                      >
                        {(translateRowMutation.isPending && translateRowMutation.variables?.id === product.id) ? <RefreshCw size={14} className="animate-spin" /> : <Bot size={14} />}
                      </button>
                      <button onClick={() => openEdit(product)} title="编辑" className="text-stone-400 hover:text-rose-400 transition-colors"><Edit2 size={14} /></button>
                      <button onClick={() => handleDelete(product.id)} title="删除" className="text-stone-400 hover:text-red-400 transition-colors"><Trash2 size={14} /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 px-4 py-3 border-t border-stone-100">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button key={p} onClick={() => setPage(p)} className={`w-8 h-8 rounded-lg text-xs ${p === page ? 'bg-rose-400 text-white' : 'border border-stone-200 text-stone-600'}`}>{p}</button>
            ))}
          </div>
        )}
      </div>

      {/* 商品编辑弹窗 */}
      {modal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4" onClick={() => setModal(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-medium text-stone-700">{form.id ? '编辑商品' : '新建商品'}</h2>
              <button onClick={() => setModal(false)}><X size={18} className="text-stone-400" /></button>
            </div>
            
            <div className="flex border-b border-stone-200 mb-5 items-center justify-between">
              <div className="flex">
                {['zh', 'en', 'de'].map(l => (
                  <button 
                    key={l}
                    onClick={() => setLangTab(l)}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${langTab === l ? 'border-rose-500 text-rose-600' : 'border-transparent text-stone-500 hover:text-stone-700'}`}
                  >
                    {l === 'zh' ? '中文' : l === 'en' ? 'English' : 'Deutsch'}
                  </button>
                ))}
              </div>
              <button
                onClick={() => {
                  if (!form.name && !form.description && !form.detail) {
                    toast.error('请先在中文标签下填写内容'); return;
                  }
                  translateAllMutation.mutate();
                }}
                disabled={translateAllMutation.isPending}
                className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium px-3 py-1.5 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
              >
                {translateAllMutation.isPending ? <RefreshCw size={14} className="animate-spin" /> : <Bot size={14} />}
                {translateAllMutation.isPending ? '生成中...' : '一键生成双语翻译 (EN & DE)'}
              </button>
            </div>

            <div className="space-y-4">
              {/* 主图上传 */}
              <div>
                <label className="text-xs text-stone-500 mb-2 block font-medium">商品主图</label>
                <div className="flex items-center gap-3">
                  <div className="w-20 h-20 bg-stone-50 border border-dashed border-stone-300 rounded-lg overflow-hidden flex items-center justify-center">
                    {form.mainImage ? (
                      <img src={form.mainImage} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon size={24} className="text-stone-200" />
                    )}
                  </div>
                  <div>
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleUploadMainImage} className="hidden" />
                    <div className="flex items-center gap-2">
                      <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
                        className="btn-outline text-xs py-2 px-3 flex items-center gap-1.5">
                        <Upload size={12} /> {uploading ? '上传中...' : '上传主图'}
                      </button>
                      <button 
                        type="button"
                        onClick={(e) => { e.preventDefault(); setGalleryTarget('mainImage'); setOpenGallery(true); }}
                        className="px-3 py-2 border border-purple-200 text-purple-600 rounded-xl text-xs hover:bg-purple-50 flex items-center gap-1.5 transition-colors font-medium"
                      >
                        <Bot size={12} /> 选择 AI 绘图
                      </button>
                    </div>
                    {form.mainImage && (
                      <button onClick={() => setForm(f => ({ ...f, mainImage: '' }))}
                        className="text-xs text-stone-400 hover:text-rose-500 ml-2">移除</button>
                    )}
                  </div>
                </div>
              </div>

              {/* 多图上传 */}
              <div>
                <label className="text-xs text-stone-500 mb-2 block font-medium">商品相册（最多5张）</label>
                <input ref={multiFileInputRef} type="file" accept="image/*" multiple onChange={handleUploadImages} className="hidden" />
                <div className="flex flex-wrap gap-2 mb-2">
                  {form.images.map((img, i) => (
                    <div key={i} className="w-16 h-16 bg-stone-50 rounded-lg overflow-hidden relative group">
                      <img src={img} alt="" className="w-full h-full object-cover" />
                      <button onClick={() => removeImage(i)}
                        title="移除图片"
                        className="absolute top-0 right-0 w-4 h-4 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10">
                        <X size={10} />
                      </button>
                      <button onClick={(e) => { e.preventDefault(); setAsMainImage(i); }}
                        className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] py-0.5 text-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
                        title="设为主图">
                        主图
                      </button>
                    </div>
                  ))}
                  {form.images.length < 5 && (
                    <div className="flex gap-2">
                      <button 
                        type="button"
                        onClick={() => multiFileInputRef.current?.click()} 
                        disabled={uploading}
                        title="从本地上传图片"
                        className="w-16 h-16 border border-dashed border-stone-300 rounded-lg flex flex-col items-center justify-center text-stone-400 hover:border-stone-500 hover:text-stone-500 hover:bg-stone-50/50 transition-all"
                      >
                        <Upload size={14} />
                        <span className="text-[9px] mt-1">本地上传</span>
                      </button>
                      <button 
                        type="button"
                        onClick={(e) => { e.preventDefault(); setGalleryTarget('gallery'); setOpenGallery(true); }}
                        title="从即梦 AI 素材库选择"
                        className="w-16 h-16 border border-dashed border-purple-200 rounded-lg flex flex-col items-center justify-center text-purple-500 hover:border-purple-400 hover:bg-purple-50/50 transition-all font-medium"
                      >
                        <Bot size={14} />
                        <span className="text-[9px] mt-1">AI 绘图</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className={langTab !== 'zh' ? 'col-span-2' : ''}>
                  <label className="text-xs text-stone-500 mb-1 block">商品名称 *</label>
                  <input value={langTab === 'zh' ? form.name : (form.translations[langTab]?.name || '')} 
                         onChange={e => {
                           if (langTab === 'zh') setForm(f => ({...f, name: e.target.value}));
                           else setForm(f => ({...f, translations: {...f.translations, [langTab]: {...f.translations[langTab], name: e.target.value}}}));
                         }} 
                         className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-rose-300" />
                </div>
                {langTab === 'zh' && (
                <div>
                  <label className="text-xs text-stone-500 mb-1 block">商品分类</label>
                  <select value={form.categoryId} onChange={e => setForm(f => ({...f, categoryId: e.target.value}))} className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-rose-300">
                    <option value="">选择分类</option>
                    {categories?.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                )}
                {langTab === 'zh' && (
                  <>
                  <div className="col-span-2 flex items-center gap-2 mb-2 p-3 bg-stone-50 rounded-xl border border-stone-100">
                    <input type="checkbox" id="isBundle" checked={form.isBundle} onChange={e => setForm(f => ({...f, isBundle: e.target.checked}))} className="w-4 h-4 text-rose-500 rounded border-stone-300 focus:ring-rose-500" />
                    <label htmlFor="isBundle" className="text-sm font-medium text-stone-700">这是一个产品组合</label>
                    <span className="text-xs text-stone-400 ml-2">组合商品可以绑定多个单品，购买组合时会自动扣减单品库存。</span>
                  </div>

                  <div className={`col-span-2 flex items-center gap-2 mb-2 p-3 bg-stone-50 rounded-xl border border-stone-100 ${settings?.feature_free_samples !== '1' ? 'opacity-50 pointer-events-none' : ''}`}>
                    <input type="checkbox" id="isSample" checked={form.isSample} onChange={e => setForm(f => ({...f, isSample: e.target.checked}))} className="w-4 h-4 text-rose-500 rounded border-stone-300 focus:ring-rose-500" />
                    <label htmlFor="isSample" className="text-sm font-medium text-stone-700">这是一个体验装（小样） {settings?.feature_free_samples !== '1' && <span className="ml-2 text-[10px] text-red-500 bg-red-50 px-1.5 py-0.5 rounded">已全局关闭</span>}</label>
                    <span className="text-xs text-stone-400 ml-2">勾选后，该商品将可以在结算页作为免费小样供用户选择（价格仍需设置为0或基础价格）。</span>
                  </div>

                  <div className={`col-span-2 flex items-center gap-2 mb-2 p-3 bg-stone-50 rounded-xl border border-stone-100 ${settings?.feature_story_pages !== '1' ? 'opacity-50 pointer-events-none' : ''}`}>
                    <input type="checkbox" id="isStoryPage" checked={form.isStoryPage} onChange={e => setForm(f => ({...f, isStoryPage: e.target.checked}))} className="w-4 h-4 text-rose-500 rounded border-stone-300 focus:ring-rose-500" />
                    <label htmlFor="isStoryPage" className="text-sm font-medium text-stone-700">启用沉浸式产品故事页 (Storytelling UI) {settings?.feature_story_pages !== '1' && <span className="ml-2 text-[10px] text-red-500 bg-red-50 px-1.5 py-0.5 rounded">已全局关闭</span>}</label>
                    <span className="text-xs text-stone-400 ml-2">勾选后，该商品的详情页将使用全屏滚动的高端大片视觉排版，适合主推产品。</span>
                  </div>

                  {form.isBundle && (
                    <div className="col-span-2 mb-2">
                      <label className="text-xs text-stone-500 mb-1 block">选择包含的单品 (多选)</label>
                      <select multiple size={4} value={form.bundleProductIds.map(String)} onChange={e => {
                        const options = Array.from(e.target.selectedOptions, option => parseInt(option.value));
                        setForm(f => ({...f, bundleProductIds: options}));
                      }} className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-rose-300">
                        {allProducts.filter((p: any) => p.id !== form.id && !p.is_bundle).map((p: any) => (
                          <option key={p.id} value={p.id}>{p.name} (¥{p.base_price.toFixed(2)})</option>
                        ))}
                      </select>
                      <p className="text-[10px] text-stone-400 mt-1">按住 Ctrl (Windows) 或 Cmd (Mac) 可多选</p>
                    </div>
                  )}

                  <div>
                    <label className="text-xs text-stone-500 mb-1 block">{form.isBundle ? '组合售价 *' : '零售基础价 *'}</label>
                    <input type="number" min="0" step="0.01" value={form.basePrice} onChange={e => handleBasePriceChange(e.target.value)} className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-rose-300" />
                  </div>
                  <div className={settings?.points_redeem_enabled !== '1' ? 'opacity-50 pointer-events-none relative' : ''}>
                    <label className="text-xs text-stone-500 mb-1 flex items-center gap-2">纯积分兑换价 (可选) {settings?.points_redeem_enabled !== '1' && <span className="text-[10px] text-red-500 bg-red-50 px-1.5 py-0.5 rounded">已全局关闭</span>}</label>
                    <input type="number" min="0" value={form.pointsPrice} onChange={e => setForm(f => ({...f, pointsPrice: e.target.value}))} placeholder="多少积分可全额兑换" className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-rose-300" />
                  </div>
                  <div>
                    <label className="text-xs text-stone-500 mb-1 block">{form.isBundle ? '组合库存 (可选，留空则不限)' : '库存数量'}</label>
                    <input type="number" min="0" value={form.stock} onChange={e => setForm(f => ({...f, stock: e.target.value}))} className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-rose-300" />
                  </div>
                  <div>
                    <label className="text-xs text-stone-500 mb-1 block">排序值 (越小越靠前)</label>
                    <input type="number" value={form.sortOrder} onChange={e => setForm(f => ({...f, sortOrder: e.target.value}))} className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-rose-300" />
                  </div>
                  <div className="col-span-2 flex items-center gap-2 mb-2 p-3 bg-stone-50 rounded-xl border border-stone-100">
                    <input type="checkbox" id="isFeatured" checked={form.isFeatured} onChange={e => setForm(f => ({...f, isFeatured: e.target.checked}))} className="w-4 h-4 text-amber-500 rounded border-stone-300 focus:ring-amber-500" />
                    <label htmlFor="isFeatured" className="text-sm font-medium text-stone-700">在首页热销精选展示 (推荐)</label>
                    <span className="text-xs text-stone-400 ml-2">勾选后商品将展现在前台首页的热销精选板块中。</span>
                  </div>
                  </>
                )}
              </div>

              {langTab === 'zh' && (
              <div className="grid grid-cols-2 gap-3 mb-4">
                {/* Advanced Properties here */}
                <div className="col-span-2 border-t border-stone-100 pt-4 mt-2">
                  <h3 className="text-sm font-medium text-stone-800 mb-2">产品特性 (高级功能)</h3>
                </div>
                
                {/* 适用肤质 */}
                <div className={`col-span-2 border border-stone-100 rounded-xl p-3 bg-stone-50 ${settings?.feature_skin_concern_filter !== '1' ? 'opacity-50 pointer-events-none' : ''}`}>
                  <label className="text-xs text-stone-500 mb-2 flex items-center gap-2 font-medium">适用肤质 (可多选) {settings?.feature_skin_concern_filter !== '1' && <span className="text-[10px] text-red-500 bg-red-50 px-1.5 py-0.5 rounded">已全局关闭</span>}</label>
                  <div className="flex flex-wrap gap-2">
                    {dbSkinTypes.map((type: any) => (
                      <label key={type.name} className="flex items-center gap-1.5 bg-white px-2 py-1 border border-stone-200 rounded cursor-pointer hover:border-rose-300">
                        <input type="checkbox" checked={form.skinTypes.includes(type.name)} onChange={e => {
                          if (e.target.checked) setForm(f => ({ ...f, skinTypes: [...f.skinTypes, type.name] }));
                          else setForm(f => ({ ...f, skinTypes: f.skinTypes.filter(t => t !== type.name) }));
                        }} className="w-3 h-3 text-rose-500 rounded border-stone-300" />
                        <span className="text-xs text-stone-700">{type.name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* 核心护肤需求 */}
                <div className={`col-span-2 border border-stone-100 rounded-xl p-3 bg-stone-50 ${settings?.feature_skin_concern_filter !== '1' ? 'opacity-50 pointer-events-none' : ''}`}>
                  <label className="text-xs text-stone-500 mb-2 flex items-center gap-2 font-medium">核心需求 (可多选) {settings?.feature_skin_concern_filter !== '1' && <span className="text-[10px] text-red-500 bg-red-50 px-1.5 py-0.5 rounded">已全局关闭</span>}</label>
                  <div className="flex flex-wrap gap-2">
                    {dbConcerns.map((concern: any) => (
                      <label key={concern.name} className="flex items-center gap-1.5 bg-white px-2 py-1 border border-stone-200 rounded cursor-pointer hover:border-rose-300">
                        <input type="checkbox" checked={form.concerns.includes(concern.name)} onChange={e => {
                          if (e.target.checked) setForm(f => ({ ...f, concerns: [...f.concerns, concern.name] }));
                          else setForm(f => ({ ...f, concerns: f.concerns.filter(t => t !== concern.name) }));
                        }} className="w-3 h-3 text-rose-500 rounded border-stone-300" />
                        <span className="text-xs text-stone-700">{concern.name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* 产品剂型 */}
                <div className="col-span-2 border border-stone-100 rounded-xl p-3 bg-stone-50">
                  <label className="text-xs text-stone-500 mb-2 flex items-center gap-2 font-medium">产品剂型 (可多选)</label>
                  <div className="flex flex-wrap gap-2">
                    {dbDosageForms.map((dosage: any) => (
                      <label key={dosage.name} className="flex items-center gap-1.5 bg-white px-2 py-1 border border-stone-200 rounded cursor-pointer hover:border-rose-300">
                        <input type="checkbox" checked={form.dosageForms.includes(dosage.name)} onChange={e => {
                          if (e.target.checked) setForm(f => ({ ...f, dosageForms: [...f.dosageForms, dosage.name] }));
                          else setForm(f => ({ ...f, dosageForms: f.dosageForms.filter(t => t !== dosage.name) }));
                        }} className="w-3 h-3 text-rose-500 rounded border-stone-300" />
                        <span className="text-xs text-stone-700">{dosage.name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* 核心成分绑定 */}
                <div className={`col-span-2 border border-stone-100 rounded-xl p-3 bg-stone-50 ${settings?.feature_ingredient_glossary !== '1' ? 'opacity-50 pointer-events-none' : ''}`}>
                  <label className="text-xs text-stone-500 mb-1 flex items-center gap-2 font-medium">绑定核心成分 (多选) {settings?.feature_ingredient_glossary !== '1' && <span className="text-[10px] text-red-500 bg-red-50 px-1.5 py-0.5 rounded">已全局关闭</span>}</label>
                  <select multiple size={4} value={form.ingredientIds.map(String)} onChange={e => {
                    const options = Array.from(e.target.selectedOptions, option => parseInt(option.value));
                    setForm(f => ({...f, ingredientIds: options}));
                  }} className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-rose-300 bg-white">
                    {ingredients.map((ing: any) => (
                      <option key={ing.id} value={ing.id}>{ing.name}</option>
                    ))}
                  </select>
                  <p className="text-[10px] text-stone-400 mt-1">按住 Ctrl (Windows) 或 Cmd (Mac) 可多选</p>
                </div>

                {/* 使用效果对比图 (Before/After) */}
                <div className={`col-span-2 border border-stone-100 rounded-xl p-3 bg-stone-50 ${settings?.feature_before_after_gallery !== '1' ? 'opacity-50 pointer-events-none' : ''}`}>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-xs text-stone-500 font-medium flex items-center gap-2">使用前后对比图 (Before & After) {settings?.feature_before_after_gallery !== '1' && <span className="text-[10px] text-red-500 bg-red-50 px-1.5 py-0.5 rounded">已全局关闭</span>}</label>
                    <button type="button" onClick={() => setForm(f => ({ ...f, beforeAfterImages: [...f.beforeAfterImages, { before: '', after: '' }] }))} className="text-xs text-rose-500 flex items-center gap-1 hover:text-rose-600">
                      <Plus size={12} /> 添加一组
                    </button>
                  </div>
                  {form.beforeAfterImages.map((pair, idx) => (
                    <div key={idx} className="flex items-center gap-2 mb-2 p-2 bg-white rounded border border-stone-100 relative group">
                      <div className="flex-1">
                        <input type="text" placeholder="Before 图片URL" value={pair.before} onChange={e => {
                          const newArr = [...form.beforeAfterImages];
                          newArr[idx].before = e.target.value;
                          setForm(f => ({ ...f, beforeAfterImages: newArr }));
                        }} className="w-full border border-stone-200 rounded px-2 py-1 text-xs focus:border-rose-300 outline-none" />
                      </div>
                      <span className="text-stone-300 text-xs">VS</span>
                      <div className="flex-1">
                        <input type="text" placeholder="After 图片URL" value={pair.after} onChange={e => {
                          const newArr = [...form.beforeAfterImages];
                          newArr[idx].after = e.target.value;
                          setForm(f => ({ ...f, beforeAfterImages: newArr }));
                        }} className="w-full border border-stone-200 rounded px-2 py-1 text-xs focus:border-rose-300 outline-none" />
                      </div>
                      <button onClick={() => {
                        const newArr = [...form.beforeAfterImages];
                        newArr.splice(idx, 1);
                        setForm(f => ({ ...f, beforeAfterImages: newArr }));
                      }} className="text-stone-300 hover:text-red-500"><Trash2 size={14} /></button>
                    </div>
                  ))}
                  {form.beforeAfterImages.length === 0 && <p className="text-[10px] text-stone-400 py-1">暂无对比图，可点击右侧按钮添加。建议填入已上传的图片URL。</p>}
                </div>
                {/* SEO 关键词 / 标签 (Tag Pool) */}
                <div className="col-span-2 border border-stone-100 rounded-xl p-3 bg-stone-50">
                  <label className="text-xs text-stone-500 mb-2 flex items-center justify-between font-medium">
                    <span>SEO 关键词 / 标签</span>
                  </label>
                  <input
                    type="text"
                    value={form.tags.join(',')}
                    onChange={e => {
                      const tags = e.target.value.split(',').map(t => t.trim()).filter(Boolean);
                      setForm(f => ({ ...f, tags }));
                    }}
                    placeholder="输入或点击下方词库选择关键词，用英文逗号分隔"
                    className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-rose-300"
                  />
                  {settings?.global_seo_keywords && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {(() => {
                        let allTags: string[] = [];
                        try {
                          const parsed = JSON.parse(settings.global_seo_keywords);
                          if (Array.isArray(parsed)) {
                            allTags = parsed.flatMap(b => b.keywords);
                          } else { throw new Error(); }
                        } catch(e) {
                          allTags = settings.global_seo_keywords.split(',').map((t: string) => t.trim()).filter(Boolean);
                        }
                        allTags = Array.from(new Set(allTags));
                        
                        return allTags.map((tag: string, i: number) => {
                          const isSelected = form.tags.includes(tag);
                        return (
                          <button
                            key={i}
                            type="button"
                            onClick={() => {
                              setForm(f => {
                                const newTags = isSelected 
                                  ? f.tags.filter(t => t !== tag) 
                                  : [...f.tags, tag];
                                return { ...f, tags: newTags };
                              });
                            }}
                            className={`text-[10px] px-2 py-0.5 rounded transition-colors ${isSelected ? 'bg-rose-500 text-white border border-rose-500' : 'bg-white text-stone-500 border border-stone-200 hover:border-rose-300'}`}
                          >
                            {tag}
                          </button>
                        );
                        });
                      })()}
                    </div>
                  )}
                </div>
              </div>
              )}

              <div>
                <label className="text-xs text-stone-500 mb-1 block">商品描述（简短）</label>
                <textarea rows={2} 
                  value={langTab === 'zh' ? form.description : (form.translations[langTab]?.description || '')} 
                  onChange={e => {
                    if (langTab === 'zh') setForm(f => ({...f, description: e.target.value}));
                    else setForm(f => ({...f, translations: {...f.translations, [langTab]: {...f.translations[langTab], description: e.target.value}}}));
                  }} 
                  className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-stone-900" placeholder="一句话商品简介" />
              </div>

              <div>
                <label className="text-xs text-stone-500 mb-1 block">商品详情（支持插入图片、加粗、列表等富文本）</label>
                <div className="border border-stone-200 rounded-xl overflow-hidden">
                  <ReactQuill
                    key={langTab}
                    theme="snow"
                    value={langTab === 'zh' ? form.detail : (form.translations[langTab]?.detail || '')}
                    onChange={(val) => {
                      if (langTab === 'zh') setForm(f => ({ ...f, detail: val }));
                      else setForm(f => ({ ...f, translations: { ...f.translations, [langTab]: { ...f.translations[langTab], detail: val } } }));
                    }}
                    modules={{
                      toolbar: {
                        container: [
                          [{ 'header': [1, 2, 3, false] }],
                          ['bold', 'italic', 'underline', 'strike'],
                          [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                          [{ 'color': [] }, { 'background': [] }],
                          [{ 'align': [] }],
                          ['link', 'image'],
                          ['clean'],
                        ],
                        handlers: {
                          image: imageHandler,
                        },
                      },
                    }}
                    formats={['header', 'bold', 'italic', 'underline', 'strike', 'list', 'color', 'background', 'align', 'link', 'image']}
                    placeholder="详细的产品说明、成分、功效、使用方法等，可插入图片"
                    style={{ minHeight: '200px' }}
                    ref={(el: any) => {
                      if (el) {
                        // 延迟获取 quill 实例，确保编辑器已初始化
                        setTimeout(() => {
                          const editor = el.getEditor?.();
                          if (editor) (window as any).__quill_editor_ref = editor;
                        }, 100);
                      }
                    }}
                  />
                </div>
              </div>

              {/* 等级价格配置 */}
              <div>
                <label className="text-xs text-stone-500 mb-2 block font-medium">等级专属价格（输入基础价后自动计算，可手动覆盖）</label>
                <div className="grid grid-cols-2 gap-2">
                  {LEVELS.map(level => (
                    <div key={level} className="border border-stone-100 rounded-xl p-3">
                      <p className="text-xs text-stone-500 mb-1.5">{LEVEL_NAMES[level]}</p>
                      <input
                        type="number" min="0" step="0.01"
                        value={form.prices[level]?.price || ''}
                        onChange={e => setForm(f => ({...f, prices: {...f.prices, [level]: {...f.prices[level], price: e.target.value}}}))}
                        placeholder="¥ 价格"
                        className="w-full border border-stone-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-rose-300"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input type="checkbox" id="isActive" checked={form.isActive} onChange={e => setForm(f => ({...f, isActive: e.target.checked}))} />
                <label htmlFor="isActive" className="text-sm text-stone-600">上架出售</label>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setModal(false)} className="flex-1 btn-outline">取消</button>
              <button onClick={handleSave} disabled={saving} className="flex-1 btn-primary disabled:opacity-60">
                {saving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dreamina AI Gallery Selector Modal */}
      <DreaminaGalleryModal
        isOpen={openGallery}
        onClose={() => setOpenGallery(false)}
        onSelect={(url) => {
          if (galleryTarget === 'mainImage') {
            setForm(f => ({ ...f, mainImage: url }));
          } else {
            setForm(f => ({ ...f, images: [...f.images, url] }));
          }
          setOpenGallery(false);
        }}
      />
    </div>
  );
}

interface DreaminaGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (url: string) => void;
}

function DreaminaGalleryModal({ isOpen, onClose, onSelect }: DreaminaGalleryModalProps) {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res: any = await api.get('/ai/dreamina/tasks');
      // Filter tasks that generated images successfully
      const successfulTasks = (res || []).filter(
        (t: any) => t.status === 'success' && t.result_urls?.length > 0
      );
      setTasks(successfulTasks);
    } catch (e: any) {
      toast.error('获取即梦素材库失败: ' + (e.message || '网络错误'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchTasks();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Flatten all successfully generated images with their corresponding prompt and metadata
  const galleryItems = tasks.flatMap(task => 
    (task.result_urls || []).map((url: string, idx: number) => ({
      url,
      prompt: task.prompt,
      submitId: task.submit_id,
      index: idx,
      createdAt: task.created_at,
      userName: task.user_name || '系统运营'
    }))
  );

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200" onClick={onClose}>
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col border border-stone-100 animate-in zoom-in-95 duration-200" 
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-100 flex justify-between items-center bg-stone-50/50 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center">
              <Bot size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-800">即梦 AI 绘图素材库</h2>
              <p className="text-[11px] text-stone-400">选择您在后台利用即梦大模型生成的高端视觉图像</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={fetchTasks} 
              disabled={loading} 
              title="刷新素材"
              className="p-1.5 hover:bg-stone-100 rounded-lg text-stone-500 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
            <button onClick={onClose} className="p-1.5 hover:bg-stone-100 rounded-lg text-stone-400 hover:text-stone-600 transition-colors">✕</button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 bg-stone-50/30">
          {loading ? (
            <div className="h-64 flex flex-col items-center justify-center gap-3 text-stone-400">
              <RefreshCw size={24} className="animate-spin text-purple-600" />
              <span className="text-sm font-medium">正在读取即梦绘图资产...</span>
            </div>
          ) : galleryItems.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center p-6 bg-white rounded-xl border border-dashed border-stone-200">
              <ImageIcon size={32} className="text-stone-300 mb-2" />
              <h3 className="text-sm font-bold text-stone-700">暂无 AI 生成素材</h3>
              <p className="text-xs text-stone-400 mt-1 max-w-xs leading-normal">
                系统中还没有成功生成的即梦 AI 图像。您可以前往 “AI 大脑系统 - 抖音即梦” 标签页开始您的第一笔创作！
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {galleryItems.map((item, idx) => (
                <div 
                  key={idx}
                  onClick={() => {
                    onSelect(item.url);
                  }}
                  className="bg-white border border-stone-100 rounded-xl overflow-hidden shadow-xs hover:shadow-md hover:border-purple-300 group cursor-pointer transition-all duration-200 aspect-square flex flex-col relative"
                >
                  {/* Image container */}
                  <div className="flex-1 overflow-hidden bg-stone-50 relative flex items-center justify-center">
                    <img 
                      src={item.url} 
                      alt={item.prompt} 
                      className="max-w-full max-h-full object-contain group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-purple-600/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="bg-purple-600 text-white text-[10px] font-bold px-2 py-1 rounded shadow-sm">点击选择</span>
                    </div>
                  </div>

                  {/* Info overlay/bottom sheet */}
                  <div className="p-2 border-t border-stone-100 bg-white shrink-0">
                    <p className="text-[10px] text-stone-700 font-medium line-clamp-2 leading-snug" title={item.prompt}>
                      {item.prompt}
                    </p>
                    <div className="flex justify-between items-center mt-1.5 text-[9px] text-stone-400">
                      <span>{item.userName}</span>
                      <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

