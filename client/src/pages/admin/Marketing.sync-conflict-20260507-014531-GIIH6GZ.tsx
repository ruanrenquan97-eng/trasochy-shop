import { useEffect, useState, useRef } from 'react';
import { Save, Upload, ImageIcon, AlertTriangle, CheckCircle2 } from 'lucide-react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import AdminIngredients from './Ingredients';
import AdminBrandStoryConfig from './BrandStoryConfig';

interface Setting {
  key: string;
  value: string;
  description: string;
}

const SETTING_LABELS: Record<string, string> = {
  promo_bar_active: '开启顶部公告栏 (1开启/0关闭)',
  promo_bar_text: '顶部公告栏文案',
  promo_bar_link: '顶部公告栏跳转链接',
  promo_modal_active: '开启首屏大弹窗 (1开启/0关闭)',
  promo_modal_image: '首屏弹窗海报图片',
  promo_modal_link: '首屏弹窗跳转链接',
  points_discount_enabled: '是否开启积分通用抵扣 (方式B) (1开启/0关闭)',
  points_redeem_enabled: '是否开启商品纯积分兑换 (方式A) (1开启/0关闭)',
  points_to_money_ratio: '积分抵扣比例 (1元等于多少积分，如100)',
  points_day_active: '开启会员积分日翻倍活动 (1开启/0关闭)',
  points_day_multiplier: '积分日翻倍倍率 (如 2 代表双倍)',
  feature_ingredient_glossary: '开启成分百科功能',
  feature_skin_concern_filter: '开启肤质/需求筛选功能',
  feature_before_after_gallery: '开启真实对比图集功能',
  feature_gifting: '开启送礼定制功能',
  feature_free_samples: '开启结账页自选小样功能',
  feature_partner_tier: '开启个人中心合伙人等级及进度条',
  feature_story_pages: '开启沉浸式产品详情页布局',
  feature_ai_quiz: '开启 AI 护肤方案问卷功能',
  feature_subscriptions: '开启定期订阅购功能',
  feature_abandoned_cart: '开启弃单挽回系统',
  feature_restock_notify: '开启到货提醒功能',
  feature_ai_chatbot: '开启 AI 客服悬浮窗',
  feature_ai_operations: '开启 AI 智能运营总监 (无感行为采集分析)',
  feature_company_intro: '开启品牌与技术团队介绍',
};

const PAGE_CONTENT_KEYS = [
  { key: 'page_about', label: '关于我们', path: '/about' },
  { key: 'page_contact', label: '联系我们', path: '/contact' },
  { key: 'page_delivery', label: '配送说明', path: '/delivery' },
  { key: 'page_privacy', label: '隐私政策', path: '/privacy' },
];

type TabType = 'pages' | 'promo' | 'points' | 'features' | 'ingredients' | 'brand_story';

export default function MarketingPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [uploading, setUploading] = useState<string>('');
  const [activeTab, setActiveTab] = useState<TabType>('pages');
  const [activePageKey, setActivePageKey] = useState('page_about');
  const quillRef = useRef<any>(null);

  useEffect(() => {
    api.get('/admin/settings').then(data => {
      const map: Record<string, string> = {};
      (data.settings as Setting[]).forEach((s: Setting) => {
        map[s.key] = s.value;
      });
      setSettings(map);
      setLoading(false);
    });
  }, []);

  const handleChange = (key: string, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async (key: string) => {
    setSaving(true);
    setMessage('');
    setErrorMsg('');
    try {
      await api.put(`/admin/settings/${key}`, { value: settings[key] ?? '' });
      const label = PAGE_CONTENT_KEYS.find(p => p.key === key)?.label || SETTING_LABELS[key] || key;
      setMessage(`"${label}" 保存成功！`);
      setTimeout(() => setMessage(''), 3000);
    } catch {
      setErrorMsg('保存失败');
      setTimeout(() => setErrorMsg(''), 3000);
    }
    setSaving(false);
  };

  const handleUpload = async (key: string, file: File) => {
    setUploading(key);
    setMessage('');
    setErrorMsg('');
    const formData = new FormData();
    formData.append('image', file);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/upload/image', {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        body: formData,
      });
      const data = await res.json();
      if (data.url) {
        const newUrl = data.url;
        setSettings(prev => ({ ...prev, [key]: newUrl }));
        await api.put(`/admin/settings/${key}`, { value: newUrl });
        setMessage(`图片上传并保存成功！`);
        setTimeout(() => setMessage(''), 3000);
      }
    } catch {
      setErrorMsg('上传失败');
      setTimeout(() => setErrorMsg(''), 3000);
    }
    setUploading('');
  };

  const pageImageHandler = () => {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*');
    input.click();
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const formData = new FormData();
      formData.append('image', file);
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/upload/image', {
          method: 'POST',
          headers: token ? { 'Authorization': `Bearer ${token}` } : {},
          body: formData,
        });
        const data = await res.json();
        if (data.url) {
          const editor = quillRef.current?.getEditor?.();
          if (editor) {
            const range = editor.getSelection(true);
            editor.clipboard.dangerouslyPasteHTML(range.index, `<img src="${data.url}" alt="" style="max-width:100%;height:auto;" />`);
          }
        }
      } catch {
        setErrorMsg('图片上传失败');
        setTimeout(() => setErrorMsg(''), 3000);
      }
    };
  };

  if (loading) return <div className="p-8 text-center text-gray-500">加载中...</div>;

  const tabs: { key: TabType; label: string }[] = [
    { key: 'pages', label: '页面内容管理' },
    { key: 'promo', label: '促销活动' },
    { key: 'points', label: '积分与推荐' },
    { key: 'features', label: '功能开关' },
    { key: 'ingredients', label: '成分百科' },
    { key: 'brand_story', label: '品牌技术配置' },
  ];

  return (
    <div className="max-w-5xl mx-auto p-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">营销管理</h1>

      {/* Tab切换 */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.key ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {message && (
        <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-lg text-sm flex items-center gap-2">
          <CheckCircle2 size={16} />
          {message}
        </div>
      )}
      {errorMsg && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm flex items-center gap-2">
          <AlertTriangle size={16} />
          {errorMsg}
        </div>
      )}

      {activeTab === 'pages' && (
        <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">页面内容管理</h2>
          <p className="text-sm text-gray-500 mb-4">编辑前台"关于我们"、"联系方式"、"配送说明"、"隐私政策"页面的内容，支持富文本格式。</p>

          {/* 页面子Tab */}
          <div className="flex gap-2 mb-4 border-b pb-3">
            {PAGE_CONTENT_KEYS.map(p => (
              <button
                key={p.key}
                onClick={() => setActivePageKey(p.key)}
                className={`px-3 py-1.5 rounded-md text-sm transition-colors ${activePageKey === p.key ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* 富文本编辑器 */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-gray-500">
                前台路径: <span className="font-mono text-gray-700">{PAGE_CONTENT_KEYS.find(p => p.key === activePageKey)?.path}</span>
              </div>
              <button
                onClick={() => handleSave(activePageKey)}
                disabled={saving}
                className="flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm disabled:opacity-50"
              >
                <Save size={14} /> {saving ? '保存中...' : '保存页面'}
              </button>
            </div>
            <ReactQuill
              ref={quillRef}
              theme="snow"
              value={settings[activePageKey] || ''}
              onChange={val => handleChange(activePageKey, val)}
              modules={{
                toolbar: {
                  container: [
                    [{ header: [1, 2, 3, false] }],
                    ['bold', 'italic', 'underline'],
                    [{ list: 'ordered' }, { list: 'bullet' }],
                    ['link'],
                    ['image'],
                    ['clean'],
                  ],
                  handlers: {
                    image: pageImageHandler,
                  },
                },
              }}
              className="min-h-[300px]"
            />
          </div>
        </div>
      )}

      {activeTab === 'promo' && (
        <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">促销活动配置</h2>
          
          <div className="space-y-8">
            <div>
              <h3 className="text-md font-semibold text-gray-700 mb-3 border-b pb-2">顶部公告栏</h3>
              <div className="space-y-4">
                {['promo_bar_active', 'promo_bar_text', 'promo_bar_link'].map(key => (
                  <div key={key}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {SETTING_LABELS[key] || key}
                    </label>
                    <input
                      type="text"
                      value={settings[key] || ''}
                      onChange={e => handleChange(key, e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                      placeholder={key === 'promo_bar_active' ? '输入 1 为开启，0 为关闭' : ''}
                    />
                    <button
                      onClick={() => handleSave(key)}
                      disabled={saving}
                      className="mt-2 flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm disabled:opacity-50"
                    >
                      <Save size={14} /> 保存
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-md font-semibold text-gray-700 mb-3 border-b pb-2">首屏大弹窗</h3>
              <div className="space-y-4">
                {['promo_modal_active', 'promo_modal_link'].map(key => (
                  <div key={key}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {SETTING_LABELS[key] || key}
                    </label>
                    <input
                      type="text"
                      value={settings[key] || ''}
                      onChange={e => handleChange(key, e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                      placeholder={key === 'promo_modal_active' ? '输入 1 为开启，0 为关闭' : ''}
                    />
                    <button
                      onClick={() => handleSave(key)}
                      disabled={saving}
                      className="mt-2 flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm disabled:opacity-50"
                    >
                      <Save size={14} /> 保存
                    </button>
                  </div>
                ))}
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {SETTING_LABELS['promo_modal_image']}
                  </label>
                  {settings['promo_modal_image'] && (
                    <div className="mb-3">
                      <img
                        src={settings['promo_modal_image'].startsWith('http') ? settings['promo_modal_image'] : `${import.meta.env.VITE_API_URL || ''}${settings['promo_modal_image']}`}
                        alt="promo_modal_image"
                        className="w-full max-w-md h-40 object-cover rounded-lg border"
                      />
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg cursor-pointer hover:bg-gray-200 transition">
                      <ImageIcon size={16} />
                      {uploading === 'promo_modal_image' ? '上传中...' : '更换图片'}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (file) handleUpload('promo_modal_image', file);
                        }}
                      />
                    </label>
                    <input
                      type="text"
                      value={settings['promo_modal_image'] || ''}
                      onChange={e => handleChange('promo_modal_image', e.target.value)}
                      placeholder="或输入图片URL"
                      className="flex-1 px-3 py-2 border rounded-lg text-sm"
                    />
                    <button
                      onClick={() => handleSave('promo_modal_image')}
                      disabled={saving}
                      className="flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                    >
                      <Save size={16} /> 保存
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'points' && (
        <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">积分与推荐系统设置</h2>
          
          <div className="space-y-8">
            <div>
              <h3 className="text-md font-semibold text-gray-700 mb-3 border-b pb-2">系统开关与规则</h3>
              <div className="space-y-4">
                {['points_discount_enabled', 'points_redeem_enabled', 'points_to_money_ratio', 'points_day_active', 'points_day_multiplier'].map(key => (
                  <div key={key}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {SETTING_LABELS[key] || key}
                    </label>
                    <input
                      type="text"
                      value={settings[key] || ''}
                      onChange={e => handleChange(key, e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                      placeholder={key.includes('enabled') ? '输入 1 为开启，0 为关闭' : ''}
                    />
                    <button
                      onClick={() => handleSave(key)}
                      disabled={saving}
                      className="mt-2 flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm disabled:opacity-50"
                    >
                      <Save size={14} /> 保存
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'features' && (
        <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">高级功能开关</h2>
          <p className="text-sm text-gray-500 mb-6">您可以在此随时开启或关闭商城的特定高级功能模块，即开即用。</p>
          <div className="space-y-6">
            {[
              'feature_ingredient_glossary', 'feature_skin_concern_filter', 'feature_before_after_gallery', 
              'feature_gifting', 'feature_free_samples', 'feature_partner_tier', 'feature_story_pages',
              'feature_ai_quiz', 'feature_subscriptions', 'feature_abandoned_cart', 'feature_restock_notify', 'feature_ai_chatbot', 'feature_ai_operations', 'feature_company_intro'
            ].map(key => {
              const isActive = settings[key] === '1';
              return (
                <div key={key} className="flex items-center justify-between border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                  <div className="flex-1">
                    <label className="text-sm font-medium text-gray-800">
                      {SETTING_LABELS[key] || key}
                    </label>
                    <p className="text-xs text-gray-400 mt-1">
                      {isActive ? '已在系统前端开启并展示' : '目前处于隐藏关闭状态'}
                    </p>
                  </div>
                  <div className="ml-4">
                    <button
                      type="button"
                      disabled={saving}
                      onClick={async () => {
                        const newValue = isActive ? '0' : '1';
                        // 乐观更新 UI
                        setSettings(s => ({ ...s, [key]: newValue }));
                        try {
                          await api.put(`/admin/settings/${key}`, { value: newValue });
                          toast.success('功能开关已更新');
                        } catch (err: any) {
                          toast.error(err.message || '更新失败');
                          // 恢复 UI
                          setSettings(s => ({ ...s, [key]: isActive ? '1' : '0' }));
                        }
                      }}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 ${
                        isActive ? 'bg-blue-600' : 'bg-gray-200'
                      }`}
                    >
                      <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        isActive ? 'translate-x-5' : 'translate-x-0'
                      }`} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'ingredients' && (
        <AdminIngredients />
      )}

      {activeTab === 'brand_story' && (
        <AdminBrandStoryConfig />
      )}

    </div>
  );
}
