import { useEffect, useState, useRef } from 'react';
import { Save, Upload, ImageIcon, AlertTriangle, CheckCircle2, Bot, RefreshCw } from 'lucide-react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import AdminIngredients from './Ingredients';
import AdminBrandStoryConfig from './BrandStoryConfig';
import { useMutation } from '@tanstack/react-query';

interface Setting {
  key: string;
  value: string;
  description: string;
}

const SETTING_LABELS: Record<string, string> = {
  promo_bar_active: '开启顶部公告栏',
  promo_bar_text: '顶部公告栏文案',
  promo_bar_link: '顶部公告栏跳转链接',
  promo_discount_active: '开启全局满减优惠',
  promo_discount_threshold: '满减消费门槛 (元)',
  promo_discount_amount: '满减立减金额 (元)',
  promo_modal_active: '开启首屏大弹窗',
  promo_modal_image: '首屏弹窗海报图片',
  promo_modal_link: '首屏弹窗跳转链接',
  promo_end_time: '促销活动统一截止时间 (留空为不限时)',
  points_discount_enabled: '是否开启积分通用抵扣 (方式B)',
  points_redeem_enabled: '是否开启商品纯积分兑换 (方式A)',
  points_to_money_ratio: '积分抵扣比例 (1元等于多少积分，如100)',
  points_day_active: '开启会员积分日翻倍活动',
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
  partner_rebate_default: '普通合伙人返利比例 (如 0.1 代表 10%)',
  partner_rebate_advanced: '高级合伙人返利比例 (如 0.15 代表 15%)',
  partner_rebate_super: '超级合伙人返利比例 (如 0.2 代表 20%)',
  partner_rebate_gold: '金牌合伙人返利比例 (如 0.25 代表 25%)',
  partner_rebate_diamond: '钻石合伙人返利比例 (如 0.3 代表 30%)',
  partner_threshold_advanced: '高级合伙人邀请门槛 (默认 10)',
  partner_threshold_super: '超级合伙人邀请门槛 (默认 50)',
  partner_threshold_gold: '金牌合伙人邀请门槛 (默认 100)',
  partner_threshold_diamond: '钻石合伙人邀请门槛 (默认 500)',
};

const PAGE_CONTENT_KEYS = [
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
  const [activePageKey, setActivePageKey] = useState('page_contact');
  const [langTab, setLangTab] = useState('zh');
  const [translations, setTranslations] = useState<Record<string, any>>({});
  const quillRef = useRef<any>(null);

  useEffect(() => {
    api.get('/admin/settings').then(data => {
      const map: Record<string, string> = {};
      const trans: Record<string, any> = {};
      (data.settings as Setting[]).forEach((s: any) => {
        map[s.key] = s.value;
        let parsedTrans = { en: { value: '' }, de: { value: '' } };
        if (s.translations) {
          try {
            parsedTrans = typeof s.translations === 'string' ? JSON.parse(s.translations) : s.translations;
          } catch { }
        }
        trans[s.key] = parsedTrans;
      });
      setSettings(map);
      setTranslations(trans);
      setLoading(false);
    });
  }, []);

  const handleChange = (key: string, value: string) => {
    if (langTab === 'zh') {
      setSettings(prev => ({ ...prev, [key]: value }));
    } else {
      setTranslations(prev => ({
        ...prev,
        [key]: {
          ...(prev[key] || {}),
          [langTab]: { value }
        }
      }));
    }
  };

  const handleSave = async (key: string) => {
    setSaving(true);
    setMessage('');
    setErrorMsg('');
    try {
      await api.put(`/admin/settings/${key}`, { 
        value: settings[key] ?? '',
        translations: translations[key]
      });
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

  const translatePageMutation = useMutation({
    mutationFn: async (pageKey: string) => {
      if (!settings[pageKey]) return null;
      const textsToTranslate = { [pageKey]: settings[pageKey] };
      
      const [enRes, deRes] = await Promise.all([
        api.post('/ai/translate', { texts: textsToTranslate, targetLang: 'en' }),
        api.post('/ai/translate', { texts: textsToTranslate, targetLang: 'de' })
      ]);
      
      return {
        pageKey,
        en: (enRes as any).translated || {},
        de: (deRes as any).translated || {}
      };
    },
    onSuccess: async (results) => {
      if (!results) return;
      const { pageKey, en, de } = results;

      if (!en[pageKey] && !de[pageKey]) {
        setErrorMsg('翻译结果为空，可能是内容过长导致AI返回异常');
        setTimeout(() => setErrorMsg(''), 4000);
        return;
      }
      
      setTranslations(prev => {
        const nextTranslations = { ...prev };
        if (!nextTranslations[pageKey]) nextTranslations[pageKey] = {};
        nextTranslations[pageKey] = {
          ...nextTranslations[pageKey],
          en: { value: en[pageKey] || prev[pageKey]?.en?.value || '' },
          de: { value: de[pageKey] || en[pageKey] || prev[pageKey]?.de?.value || '' }
        };
        
        // Asynchronously save after state update
        setMessage('翻译完成，正在自动保存...');
        api.put(`/admin/settings/${pageKey}`, { 
          value: settings[pageKey] ?? '',
          translations: nextTranslations[pageKey]
        }).then(() => {
          setMessage('当前页面双语翻译已生成并自动保存！');
          setTimeout(() => setMessage(''), 5000);
        }).catch(() => {
          setErrorMsg('自动保存失败，请手动点击保存按钮');
          setTimeout(() => setErrorMsg(''), 4000);
        });

        return nextTranslations;
      });
    },
    onError: (err: any) => {
      setErrorMsg(err.message || '翻译失败');
      setTimeout(() => setErrorMsg(''), 3000);
    }
  });

  const translateSettingMutation = useMutation({
    mutationFn: async (settingKey: string) => {
      if (!settings[settingKey]) return null;
      const textsToTranslate = { [settingKey]: settings[settingKey] };
      
      const [enRes, deRes] = await Promise.all([
        api.post('/ai/translate', { texts: textsToTranslate, targetLang: 'en' }),
        api.post('/ai/translate', { texts: textsToTranslate, targetLang: 'de' })
      ]);
      
      return {
        settingKey,
        en: (enRes as any).translated || {},
        de: (deRes as any).translated || {}
      };
    },
    onSuccess: async (results) => {
      if (!results) return;
      const { settingKey, en, de } = results;

      if (!en[settingKey] && !de[settingKey]) {
        setErrorMsg('翻译结果为空，可能是内容过长导致AI返回异常');
        setTimeout(() => setErrorMsg(''), 4000);
        return;
      }
      
      setTranslations(prev => {
        const nextTranslations = { ...prev };
        if (!nextTranslations[settingKey]) nextTranslations[settingKey] = {};
        nextTranslations[settingKey] = {
          ...nextTranslations[settingKey],
          en: { value: en[settingKey] || prev[settingKey]?.en?.value || '' },
          de: { value: de[settingKey] || en[settingKey] || prev[settingKey]?.de?.value || '' }
        };
        
        setMessage('翻译完成，正在自动保存...');
        api.put(`/admin/settings/${settingKey}`, { 
          value: settings[settingKey] ?? '',
          translations: nextTranslations[settingKey]
        }).then(() => {
          setMessage('多语言翻译已生成并自动保存！');
          setTimeout(() => setMessage(''), 5000);
        }).catch(() => {
          setErrorMsg('自动保存失败，请手动点击保存按钮');
          setTimeout(() => setErrorMsg(''), 4000);
        });

        return nextTranslations;
      });
    },
    onError: (err: any) => {
      setErrorMsg(err.message || '翻译失败');
      setTimeout(() => setErrorMsg(''), 3000);
    }
  });

  const renderToggle = (key: string, descriptionOn: string = '已开启', descriptionOff: string = '已关闭', extraClass: string = '') => {
    const isActive = settings[key] === '1';
    return (
      <div key={key} className={`flex items-center justify-between py-3 ${extraClass || 'border-b border-gray-100 last:border-0'}`}>
        <div className="flex-1">
          <label className="text-sm font-medium text-gray-800">
            {SETTING_LABELS[key] || key}
          </label>
          <p className="text-xs text-gray-400 mt-1">
            {isActive ? descriptionOn : descriptionOff}
          </p>
        </div>
        <div className="ml-4">
          <button
            type="button"
            disabled={saving}
            onClick={async () => {
              const newValue = isActive ? '0' : '1';
              setSettings(s => ({ ...s, [key]: newValue }));
              try {
                await api.put(`/admin/settings/${key}`, { value: newValue });
                toast.success('状态已更新');
              } catch (err: any) {
                toast.error(err.message || '更新失败');
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
            <div className="flex flex-col gap-4 mb-4">
              <div className="flex items-center justify-between">
                <div className="flex border-b border-stone-200">
                  {['zh', 'en', 'de'].map(l => (
                    <button 
                      key={l}
                      onClick={() => setLangTab(l)}
                      className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${langTab === l ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                      {l === 'zh' ? '中文' : l === 'en' ? 'English' : 'Deutsch'}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => translatePageMutation.mutate(activePageKey)}
                  disabled={translatePageMutation.isPending || !settings[activePageKey]}
                  className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium px-3 py-1.5 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors disabled:opacity-50"
                >
                  {translatePageMutation.isPending ? <RefreshCw size={14} className="animate-spin" /> : <Bot size={14} />}
                  {translatePageMutation.isPending ? '翻译并保存中...' : '一键翻译当前页 (EN & DE)'}
                </button>
              </div>
              <div className="flex items-center justify-between">
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
            </div>
            <ReactQuill
              key={`${activePageKey}-${langTab}`}
              ref={quillRef}
              theme="snow"
              value={langTab === 'zh' ? (settings[activePageKey] || '') : (translations[activePageKey]?.[langTab]?.value || '')}
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
          
          <div className="mb-6 p-4 bg-orange-50 border border-orange-100 rounded-lg">
            <h3 className="text-sm font-semibold text-orange-800 mb-2 flex items-center gap-2">
              <AlertTriangle size={16} /> 统一过期设置
            </h3>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {SETTING_LABELS['promo_end_time']}
            </label>
            <div className="flex gap-2">
              <input
                type="datetime-local"
                value={settings['promo_end_time'] || ''}
                onChange={e => setSettings(prev => ({ ...prev, promo_end_time: e.target.value }))}
                className="flex-1 px-3 py-2 border rounded-lg text-sm bg-white"
              />
              <button
                onClick={() => handleSave('promo_end_time')}
                disabled={saving}
                className="flex items-center gap-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition text-sm disabled:opacity-50"
              >
                <Save size={14} /> 保存过期时间
              </button>
            </div>
            <p className="text-xs text-orange-600 mt-2">
              注意：一旦到达设定的时间，下方的三个活动开关（顶部公告栏、满减优惠、大弹窗）将被自动关闭。
            </p>
          </div>

          <div className="space-y-8">
            <div>
              <h3 className="text-md font-semibold text-gray-700 mb-3 border-b pb-2">顶部公告栏</h3>
              <div className="space-y-4">
                {renderToggle('promo_bar_active')}
                
                {['promo_bar_text', 'promo_bar_link'].map(key => (
                  <div key={key}>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-sm font-medium text-gray-700">
                        {SETTING_LABELS[key] || key}
                      </label>
                      {key === 'promo_bar_text' && (
                        <div className="flex gap-2">
                          <div className="flex bg-gray-100 rounded-md p-0.5">
                            {['zh', 'en', 'de'].map(l => (
                              <button
                                key={l}
                                onClick={() => setLangTab(l)}
                                className={`px-2 py-1 text-xs rounded-sm transition-colors ${langTab === l ? 'bg-white shadow-sm text-blue-600 font-medium' : 'text-gray-500'}`}
                              >
                                {l === 'zh' ? '中文' : l === 'en' ? 'EN' : 'DE'}
                              </button>
                            ))}
                          </div>
                          <button
                            onClick={() => translateSettingMutation.mutate(key)}
                            disabled={translateSettingMutation.isPending || !settings[key]}
                            className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 transition text-xs disabled:opacity-50"
                          >
                            {translateSettingMutation.isPending ? <RefreshCw size={12} className="animate-spin" /> : <Bot size={12} />}
                            {translateSettingMutation.isPending ? '翻译中' : '一键翻译'}
                          </button>
                        </div>
                      )}
                    </div>
                    <input
                      type="text"
                      value={langTab === 'zh' || key !== 'promo_bar_text' ? (settings[key] || '') : (translations[key]?.[langTab]?.value || '')}
                      onChange={e => {
                        if (key === 'promo_bar_text') {
                          handleChange(key, e.target.value);
                        } else {
                          setSettings(prev => ({ ...prev, [key]: e.target.value }));
                        }
                      }}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                      placeholder={key === 'promo_bar_text' && langTab !== 'zh' ? `输入${langTab.toUpperCase()}翻译...` : ''}
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
              <h3 className="text-md font-semibold text-gray-700 mb-3 border-b pb-2">全局满减优惠</h3>
              <div className="space-y-4 mb-8">
                {renderToggle('promo_discount_active')}
                
                {['promo_discount_threshold', 'promo_discount_amount'].map(key => (
                  <div key={key}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {SETTING_LABELS[key] || key}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={settings[key] || ''}
                      onChange={e => setSettings(prev => ({ ...prev, [key]: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                      placeholder={key === 'promo_discount_threshold' ? '例如：200' : '例如：50'}
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
                {renderToggle('promo_modal_active')}
                
                {['promo_modal_link'].map(key => (
                  <div key={key}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {SETTING_LABELS[key] || key}
                    </label>
                    <input
                      type="text"
                      value={settings[key] || ''}
                      onChange={e => setSettings(prev => ({ ...prev, [key]: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
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
                {renderToggle('points_discount_enabled')}
                {renderToggle('points_redeem_enabled')}
                
                {['points_to_money_ratio'].map(key => (
                  <div key={key}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {SETTING_LABELS[key] || key}
                    </label>
                    <input
                      type="text"
                      value={settings[key] || ''}
                      onChange={e => setSettings(prev => ({ ...prev, [key]: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
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

                {renderToggle('points_day_active')}
                
                {['points_day_multiplier'].map(key => (
                  <div key={key}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {SETTING_LABELS[key] || key}
                    </label>
                    <input
                      type="text"
                      value={settings[key] || ''}
                      onChange={e => setSettings(prev => ({ ...prev, [key]: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
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
              <h3 className="text-md font-semibold text-gray-700 mb-3 border-b pb-2">合伙人等级配置</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse border border-gray-200 min-w-[600px]">
                  <thead className="bg-gray-50 text-gray-700">
                    <tr>
                      <th className="px-4 py-3 border border-gray-200 font-medium">合伙人级别</th>
                      <th className="px-4 py-3 border border-gray-200 font-medium w-1/4">升级门槛 (邀请人数)</th>
                      <th className="px-4 py-3 border border-gray-200 font-medium w-1/4">返利比例 (如 0.1 代表 10%)</th>
                      <th className="px-4 py-3 border border-gray-200 font-medium text-center">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { level: '普通合伙人', thresholdKey: null, rebateKey: 'partner_rebate_default' },
                      { level: '高级合伙人', thresholdKey: 'partner_threshold_advanced', rebateKey: 'partner_rebate_advanced' },
                      { level: '超级合伙人', thresholdKey: 'partner_threshold_super', rebateKey: 'partner_rebate_super' },
                      { level: '金牌合伙人', thresholdKey: 'partner_threshold_gold', rebateKey: 'partner_rebate_gold' },
                      { level: '钻石合伙人', thresholdKey: 'partner_threshold_diamond', rebateKey: 'partner_rebate_diamond' },
                    ].map((row, i) => (
                      <tr key={i} className="bg-white hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 border border-gray-200 font-medium text-gray-900">{row.level}</td>
                        <td className="px-4 py-3 border border-gray-200">
                          {row.thresholdKey ? (
                            <input
                              type="number"
                              step="1"
                              value={settings[row.thresholdKey] || ''}
                              onChange={e => setSettings(prev => ({ ...prev, [row.thresholdKey!]: e.target.value }))}
                              className="w-full px-3 py-1.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                              placeholder="例如: 10"
                            />
                          ) : (
                            <span className="text-gray-400 text-xs">默认 (无门槛)</span>
                          )}
                        </td>
                        <td className="px-4 py-3 border border-gray-200">
                          <input
                            type="number"
                            step="0.01"
                            value={settings[row.rebateKey] || ''}
                            onChange={e => setSettings(prev => ({ ...prev, [row.rebateKey]: e.target.value }))}
                            className="w-full px-3 py-1.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                            placeholder="例如: 0.10"
                          />
                        </td>
                        <td className="px-4 py-3 border border-gray-200 text-center">
                          <button
                            onClick={() => {
                              handleSave(row.rebateKey);
                              if (row.thresholdKey) {
                                setTimeout(() => handleSave(row.thresholdKey!), 300);
                              }
                            }}
                            disabled={saving}
                            className="inline-flex items-center justify-center gap-1 px-4 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm disabled:opacity-50 whitespace-nowrap"
                          >
                            <Save size={14} /> 保存
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'features' && (
        <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">高级功能开关</h2>
          <p className="text-sm text-gray-500 mb-6">您可以在此随时开启或关闭商城的特定高级功能模块，即开即用。</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-2">
            {[
              'feature_ingredient_glossary', 'feature_skin_concern_filter', 'feature_before_after_gallery', 
              'feature_gifting', 'feature_free_samples', 'feature_partner_tier', 'feature_story_pages',
              'feature_ai_quiz', 'feature_subscriptions', 'feature_abandoned_cart', 'feature_restock_notify', 'feature_ai_chatbot', 'feature_ai_operations', 'feature_company_intro'
            ].map((key, index) => {
              const colIndex = index % 3;
              const bgClass = colIndex === 0 ? 'bg-blue-50/50 border-blue-100' : colIndex === 1 ? 'bg-emerald-50/50 border-emerald-100' : 'bg-orange-50/50 border-orange-100';
              return renderToggle(key, '已在系统前端开启并展示', '目前处于隐藏关闭状态', `px-4 rounded-xl border ${bgClass}`);
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
