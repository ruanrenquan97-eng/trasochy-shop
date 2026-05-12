import { useEffect, useState, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Save, Upload, Image as ImageIcon, CreditCard, Eye, EyeOff, AlertTriangle, CheckCircle2, Bot, RefreshCw, Loader } from 'lucide-react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import api from '../../utils/api';

interface Setting {
  key: string;
  value: string;
  description: string;
  _masked?: boolean;
}

const SETTING_LABELS: Record<string, string> = {
  hero_banner: '首页顶部横幅大图',
  brand_logo: '品牌Logo',
  site_name: '网站名称',
  site_name_en: '网站英文名称',
  site_slogan: '网站标语',
  hero_title: '首页Hero标题',
  hero_subtitle: '首页Hero副标题',
  brand_story_banner: '品牌故事横幅图',
  brand_story_title: '品牌故事标题',
  brand_story_text: '品牌故事正文',
  footer_text: '页脚品牌文案',
  footer_icp: 'ICP备案号',
  member_cta_title: '会员区标题',
  member_cta_text: '会员区描述',
  seo_title: '全局 SEO 标题',
  seo_keywords: '全局 SEO 关键词',
  seo_description: '全局 SEO 描述',
  og_title: '社媒分享标题 (Open Graph)',
  og_description: '社媒分享描述 (Open Graph)',
  google_analytics_code: 'Google Analytics 跟踪代码 (全局)',
  baidu_tongji_code: '百度统计跟踪代码 (全局)',
};

// 支付配置字段定义
const PAYMENT_FIELDS = [
  { key: 'payment_mode', label: '支付模式', type: 'select', options: [
    { value: 'mock', label: '模拟模式（无需真实商户号，用于测试）' },
    { value: 'sandbox', label: '沙箱模式（微信/支付宝沙箱环境）' },
    { value: 'production', label: '生产模式（真实支付）' },
  ], group: 'global' },
  { key: 'wechat_app_id', label: '微信 AppID', type: 'text', group: 'wechat' },
  { key: 'wechat_mch_id', label: '微信商户号', type: 'text', group: 'wechat' },
  { key: 'wechat_api_key_v3', label: '微信 API 密钥 V3', type: 'password', group: 'wechat' },
  { key: 'wechat_cert_path', label: '证书路径（apiclient_cert.pem）', type: 'text', group: 'wechat' },
  { key: 'wechat_key_path', label: '私钥路径（apiclient_key.pem）', type: 'text', group: 'wechat' },
  { key: 'wechat_serial_no', label: '证书序列号', type: 'text', group: 'wechat' },
  { key: 'wechat_notify_url', label: '微信回调地址', type: 'text', group: 'wechat' },
  { key: 'alipay_app_id', label: '支付宝 AppID', type: 'text', group: 'alipay' },
  { key: 'alipay_private_key', label: '支付宝应用私钥', type: 'password', group: 'alipay' },
  { key: 'alipay_public_key', label: '支付宝公钥', type: 'password', group: 'alipay' },
  { key: 'alipay_notify_url', label: '支付宝回调地址', type: 'text', group: 'alipay' },
  { key: 'alipay_gateway', label: '支付宝网关', type: 'text', group: 'alipay' },
  { key: 'stripe_public_key', label: 'Stripe 公钥 (Visa/Mastercard)', type: 'text', group: 'stripe' },
  { key: 'stripe_secret_key', label: 'Stripe 密钥', type: 'password', group: 'stripe' },
  { key: 'paypal_client_id', label: 'PayPal Client ID', type: 'text', group: 'paypal' },
  { key: 'paypal_client_secret', label: 'PayPal Secret', type: 'password', group: 'paypal' },
];

type TabType = 'general' | 'seo' | 'payment';

export default function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [translations, setTranslations] = useState<Record<string, any>>({});
  const [langTab, setLangTab] = useState('zh');
  const [descriptions, setDescriptions] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [uploading, setUploading] = useState<string>('');
  const [activeTab, setActiveTab] = useState<TabType>('general');
  const [seoLang, setSeoLang] = useState<'zh'|'en'|'de'>('zh');
  const [optimizingSEO, setOptimizingSEO] = useState(false);

  // 支付配置状态
  const [paymentSettings, setPaymentSettings] = useState<Record<string, string>>({});
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentSaving, setPaymentSaving] = useState(false);
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [currentPaymentMode, setCurrentPaymentMode] = useState('mock');

  useEffect(() => {
    api.get('/admin/settings').then(data => {
      const map: Record<string, string> = {};
      const desc: Record<string, string> = {};
      const trans: Record<string, any> = {};
      (data.settings as any[]).forEach((s: any) => {
        map[s.key] = s.value;
        desc[s.key] = s.description;
        let parsedTrans = { en: { value: '' }, de: { value: '' } };
        if (s.translations) {
          try {
            parsedTrans = typeof s.translations === 'string' ? JSON.parse(s.translations) : s.translations;
          } catch {
            // ignore
          }
        }
        trans[s.key] = parsedTrans;
      });
      setSettings(map);
      setDescriptions(desc);
      setTranslations(trans);
      setLoading(false);
    });
  }, []);

  // 切换到支付配置时加载数据
  useEffect(() => {
    if (activeTab === 'payment') {
      loadPaymentSettings();
    }
  }, [activeTab]);

  const loadPaymentSettings = async () => {
    setPaymentLoading(true);
    try {
      const data: any = await api.get('/admin/payment-settings');
      const map: Record<string, string> = {};
      (data.settings as Setting[]).forEach((s: Setting) => {
        map[s.key] = s.value;
      });
      setPaymentSettings(map);
      setCurrentPaymentMode(data.paymentMode || 'mock');
    } catch {
      setMessage('');
      setErrorMsg('加载支付配置失败');
      setTimeout(() => setErrorMsg(''), 3000);
    }
    setPaymentLoading(false);
  };

  const handlePaymentChange = (key: string, value: string) => {
    setPaymentSettings(prev => ({ ...prev, [key]: value }));
  };

  const handlePaymentSave = async () => {
    setPaymentSaving(true);
    setErrorMsg('');
    setMessage('');
    try {
      const res: any = await api.put('/admin/payment-settings', { settings: paymentSettings });
      setCurrentPaymentMode(res.paymentMode || 'mock');
      setMessage('支付配置保存成功！已立即生效。');
      setTimeout(() => setMessage(''), 4000);
      // 重新加载以获取掩码值
      await loadPaymentSettings();
    } catch (e: any) {
      setErrorMsg((e as any).response?.data?.error || '保存失败');
      setTimeout(() => setErrorMsg(''), 5000);
    }
    setPaymentSaving(false);
  };

  const togglePasswordVisibility = (key: string) => {
    setVisiblePasswords(prev => ({ ...prev, [key]: !prev[key] }));
  };

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
      const label = SETTING_LABELS[key] || key;
      setMessage(`"${label}" 保存成功！`);
      setTimeout(() => setMessage(''), 3000);
    } catch {
      setErrorMsg('保存失败');
      setTimeout(() => setErrorMsg(''), 3000);
    }
    setSaving(false);
  };

  const handleSaveAllTexts = async () => {
    setSaving(true);
    setMessage('');
    setErrorMsg('');
    try {
      await Promise.all(
        textKeys.map(key => {
          return api.put(`/admin/settings/${key}`, { 
            value: settings[key] ?? '',
            translations: translations[key]
          });
        })
      );
      setMessage('所有文字设置保存成功！');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setErrorMsg('全局保存失败，请重试');
      setTimeout(() => setErrorMsg(''), 3000);
    }
    setSaving(false);
  };

  const handleSaveSEO = async () => {
    setSaving(true);
    setMessage('');
    setErrorMsg('');
    try {
      const SEO_KEYS = ['seo_title', 'seo_keywords', 'seo_description', 'og_title', 'og_description', 'og_image', 'google_analytics_code', 'baidu_tongji_code', 'global_seo_keywords'];
      await Promise.all(
        SEO_KEYS.map(key => {
          return api.put(`/admin/settings/${key}`, { 
            value: settings?.[key] ?? '',
            translations: translations?.[key]
          });
        })
      );
      setMessage('SEO设置保存成功！');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setErrorMsg('保存失败，请重试');
      setTimeout(() => setErrorMsg(''), 3000);
    }
    setSaving(false);
  };

  const handleOptimizeSEO = async () => {
    setOptimizingSEO(true);
    setMessage('');
    setErrorMsg('');
    try {
      const res: any = await api.post('/ai/seo-optimize', {
        site_name: settings['site_name'] || '',
        site_slogan: settings['site_slogan'] || ''
      });
      
      const updatedSettings = { ...settings };
      const updatedTrans = { ...translations };

      if (res.zh) {
        updatedSettings['seo_title'] = res.zh.seo_title || '';
        updatedSettings['seo_keywords'] = res.zh.seo_keywords || '';
        updatedSettings['seo_description'] = res.zh.seo_description || '';
      }
      
      ['en', 'de'].forEach(lang => {
        if (res[lang]) {
          ['seo_title', 'seo_keywords', 'seo_description'].forEach(key => {
            if (!updatedTrans[key]) updatedTrans[key] = { en: { value: '' }, de: { value: '' } };
            if (!updatedTrans[key][lang]) updatedTrans[key][lang] = { value: '' };
            updatedTrans[key][lang].value = res[lang][key] || '';
          });
        }
      });

      setSettings(updatedSettings);
      setTranslations(updatedTrans);
      
      setMessage('AI 一键优化成功！请检查并点击保存。');
      setTimeout(() => setMessage(''), 5000);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || '优化失败，请重试');
      setTimeout(() => setErrorMsg(''), 3000);
    }
    setOptimizingSEO(false);
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



  const imageKeys = ['hero_banner', 'brand_logo', 'brand_story_banner'];
  const textKeys = Object.keys(SETTING_LABELS).filter(k => !imageKeys.includes(k) && !k.startsWith('promo_') && !k.startsWith('points_'));

  const translateAllMutation = useMutation({
    mutationFn: async () => {
      const textsToTranslate: Record<string, string> = {};
      textKeys.forEach(key => {
        if (settings[key]) {
          textsToTranslate[key] = settings[key];
        }
      });
      if (Object.keys(textsToTranslate).length === 0) return null;
      
      const [enRes, deRes] = await Promise.all([
        api.post('/ai/translate', { texts: textsToTranslate, targetLang: 'en' }),
        api.post('/ai/translate', { texts: textsToTranslate, targetLang: 'de' })
      ]);
      
      return {
        en: (enRes as any).translated || {},
        de: (deRes as any).translated || {}
      };
    },
    onSuccess: async (results) => {
      if (!results) return;
      
      const nextTranslations = { ...translations };
      Object.keys(results.en).forEach(key => {
        if (!nextTranslations[key]) nextTranslations[key] = {};
        nextTranslations[key] = {
          ...nextTranslations[key],
          en: { value: results.en[key] },
          de: { value: results.de[key] || results.en[key] }
        };
      });
      setTranslations(nextTranslations);
      
      setMessage('翻译完成，正在自动保存...');
      try {
        await Promise.all(
          textKeys.map(key => {
            if (nextTranslations[key]) {
               return api.put(`/admin/settings/${key}`, { 
                 value: settings[key] ?? '',
                 translations: nextTranslations[key]
               });
            }
            return Promise.resolve();
          })
        );
        setMessage('双语翻译已生成并全部自动保存！');
      } catch (err) {
        setErrorMsg('自动保存失败，请手动点击保存按钮');
      }
      setTimeout(() => setMessage(''), 5000);
    },
    onError: (err: any) => {
      setErrorMsg(err.message || '翻译失败');
      setTimeout(() => setErrorMsg(''), 3000);
    }
  });

  const generateKeywordPoolMutation = useMutation({
    mutationFn: () => api.post('/ai/generate-keyword-pool'),
    onSuccess: (res: any) => {
      const newKeywords = res.data?.keywords || res.keywords || [];
      if (newKeywords.length > 0) {
        let history: any[] = [];
        try {
          history = JSON.parse(settings['global_seo_keywords'] || '[]');
          if (!Array.isArray(history)) history = [];
        } catch(e) {
          const legacyTags = (settings['global_seo_keywords'] || '').split(',').map((t: string) => t.trim()).filter(Boolean);
          if (legacyTags.length > 0) history = [{ id: 'legacy', timestamp: '早期数据', keywords: legacyTags }];
        }
        
        history.unshift({
          id: Date.now().toString(),
          timestamp: new Date().toLocaleString(),
          keywords: newKeywords
        });
        handleChange('global_seo_keywords', JSON.stringify(history));
        setMessage('词库生成成功，请检查下方词库并点击右上角保存');
        setTimeout(() => setMessage(''), 4000);
      }
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.error || '生成失败');
      setTimeout(() => setErrorMsg(''), 3000);
    }
  });

  if (loading) return <div className="p-8 text-center text-gray-500">加载中...</div>;

  const tabs: { key: TabType; label: string }[] = [
    { key: 'general', label: '基础设置' },
    { key: 'seo', label: 'SEO 设置' },
    { key: 'payment', label: '支付配置' },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">网站设置</h1>

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

      {activeTab === 'general' && (
        <>
          {/* 图片类设置 */}
          <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">图片设置</h2>
            <div className="space-y-6">
              {imageKeys.map(key => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {SETTING_LABELS[key] || key}
                  </label>
                  {settings[key] && (
                    <div className="mb-3">
                      <img
                        src={settings[key].startsWith('http') ? settings[key] : `${import.meta.env.VITE_API_URL || ''}${settings[key]}`}
                        alt={key}
                        className="w-full max-w-md h-40 object-cover rounded-lg border"
                      />
                      <p className="text-xs text-gray-400 mt-1">当前路径: {settings[key]}</p>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg cursor-pointer hover:bg-gray-200 transition">
                      <ImageIcon size={16} />
                      {uploading === key ? '上传中...' : '更换图片'}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (file) handleUpload(key, file);
                        }}
                      />
                    </label>
                    <input
                      type="text"
                      value={settings[key] || ''}
                      onChange={e => handleChange(key, e.target.value)}
                      placeholder="或输入图片URL"
                      className="flex-1 px-3 py-2 border rounded-lg text-sm"
                    />
                    <button
                      onClick={() => handleSave(key)}
                      disabled={saving}
                      className="flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                    >
                      <Save size={16} /> 保存
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 文字类设置 */}
          <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800">文字设置</h2>
              <div className="flex items-center gap-4">
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
                  onClick={() => translateAllMutation.mutate()}
                  disabled={translateAllMutation.isPending}
                  className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium px-3 py-1.5 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
                >
                  {translateAllMutation.isPending ? <RefreshCw size={14} className="animate-spin" /> : <Bot size={14} />}
                  {translateAllMutation.isPending ? '翻译并保存中...' : '一键自动翻译并保存 (EN & DE)'}
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {textKeys.map(key => {
                const val = langTab === 'zh' ? (settings[key] || '') : (translations[key]?.[langTab]?.value || '');
                return (
                  <div key={key}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {SETTING_LABELS[key] || key}
                    </label>
                    {key === 'brand_story_text' ? (
                      <textarea
                        value={val}
                        onChange={e => handleChange(key, e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 border rounded-lg text-sm"
                      />
                    ) : (
                      <input
                        type="text"
                        value={val}
                        onChange={e => handleChange(key, e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg text-sm"
                      />
                    )}
                  </div>
                );
              })}
              
              <div className="mt-6 flex justify-end">
                <button
                  onClick={handleSaveAllTexts}
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50"
                >
                  {saving ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} />} 
                  保存所有文字设置
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === 'seo' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center justify-between mb-6 border-b pb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-800">全局 SEO & 社交分享配置</h2>
                <p className="text-sm text-gray-500 mt-1">配置网站默认搜索引擎优化标签、多语言 SEO 及社交平台分享卡片信息。</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleOptimizeSEO}
                  disabled={optimizingSEO}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg hover:from-indigo-600 hover:to-purple-700 transition font-medium disabled:opacity-50"
                >
                  {optimizingSEO ? <Loader className="animate-spin" size={16} /> : <Bot size={16} />} 
                  AI 一键优化配置
                </button>
                <button
                  onClick={handleSaveSEO}
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50"
                >
                  {saving ? <Loader className="animate-spin" size={16} /> : <Save size={16} />} 
                  保存
                </button>
              </div>
            </div>

            <div className="mb-6 border-b">
              <div className="flex">
                {['zh', 'en', 'de'].map(l => (
                  <button 
                    key={l}
                    onClick={() => setSeoLang(l as any)}
                    className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${seoLang === l ? 'border-blue-500 text-blue-600 bg-blue-50/50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
                  >
                    {l === 'zh' ? '中文 (默认)' : l === 'en' ? 'English' : 'Deutsch'}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="text-base font-medium text-gray-800 border-l-4 border-blue-500 pl-3">基础 SEO 信息 ({seoLang.toUpperCase()})</h3>
              {['seo_title', 'seo_keywords', 'seo_description'].map(key => (
                <div key={`${seoLang}-${key}`}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {SETTING_LABELS[key] || key} <span className="text-xs text-gray-400 font-normal ml-2">({seoLang === 'zh' ? '建议字数符合百度规范' : '建议字数符合谷歌规范'})</span>
                  </label>
                  {key === 'seo_description' ? (
                    <textarea
                      value={seoLang === 'zh' ? (settings[key] || '') : (translations[key]?.[seoLang]?.value || '')}
                      onChange={e => {
                        if (seoLang === 'zh') handleChange(key, e.target.value);
                        else {
                          const val = e.target.value;
                          setTranslations(prev => ({
                            ...prev,
                            [key]: { ...(prev[key] || {}), [seoLang]: { value: val } }
                          }));
                        }
                      }}
                      rows={3}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                      placeholder={`请输入${seoLang === 'zh' ? '中文' : seoLang === 'en' ? '英文' : '德文'}描述...`}
                    />
                  ) : (
                    <input
                      type="text"
                      value={seoLang === 'zh' ? (settings[key] || '') : (translations[key]?.[seoLang]?.value || '')}
                      onChange={e => {
                        if (seoLang === 'zh') handleChange(key, e.target.value);
                        else {
                          const val = e.target.value;
                          setTranslations(prev => ({
                            ...prev,
                            [key]: { ...(prev[key] || {}), [seoLang]: { value: val } }
                          }));
                        }
                      }}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                      placeholder={`请输入${seoLang === 'zh' ? '中文' : seoLang === 'en' ? '英文' : '德文'}标签...`}
                    />
                  )}
                </div>
              ))}
            </div>
            
            <div className="mt-10 space-y-6">
              <h3 className="text-base font-medium text-gray-800 border-l-4 border-purple-500 pl-3">社交媒体分享卡片 (Open Graph)</h3>
              <p className="text-xs text-gray-500 -mt-4 mb-4">当用户在微信、Facebook、WhatsApp 中分享网站链接时，平台会自动抓取此处的配置生成分享卡片。</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">分享卡片标题 (og:title)</label>
                  <input
                    type="text"
                    value={settings['og_title'] || ''}
                    onChange={e => handleChange('og_title', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                    placeholder="留空则默认使用全局 SEO 标题"
                  />
                  
                  <label className="block text-sm font-medium text-gray-700 mt-4 mb-1">分享卡片描述 (og:description)</label>
                  <textarea
                    value={settings['og_description'] || ''}
                    onChange={e => handleChange('og_description', e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                    placeholder="留空则默认使用全局 SEO 描述"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">分享封面大图 (og:image)</label>
                  <div className="border-2 border-dashed rounded-lg p-4 text-center">
                    {settings['og_image'] ? (
                      <div className="relative inline-block">
                        <img src={settings['og_image']} alt="OG Image" className="max-h-32 rounded object-cover mb-2" />
                        <button onClick={() => handleChange('og_image', '')} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 w-6 h-6 flex items-center justify-center text-xs">×</button>
                      </div>
                    ) : (
                      <div className="h-32 bg-gray-50 flex flex-col items-center justify-center text-gray-400 rounded mb-2">
                        <ImageIcon size={32} className="mb-2 opacity-50" />
                        <span className="text-xs">最佳尺寸: 1200x630px</span>
                      </div>
                    )}
                    <div className="flex gap-2 justify-center">
                      <label className="px-4 py-1.5 bg-gray-100 border text-gray-700 text-sm rounded cursor-pointer hover:bg-gray-200">
                        {uploading === 'og_image' ? '上传中...' : '上传图片'}
                        <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleUpload('og_image', e.target.files[0])} />
                      </label>
                      <input 
                        type="text" 
                        value={settings['og_image'] || ''} 
                        onChange={e => handleChange('og_image', e.target.value)}
                        placeholder="或输入图片 URL"
                        className="px-2 py-1 border rounded text-sm w-48"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-10 space-y-6">
              <h3 className="text-base font-medium text-gray-800 border-l-4 border-green-500 pl-3">流量追踪与分析 (Tracking Scripts)</h3>
              <p className="text-xs text-red-500 -mt-4 mb-4 bg-red-50 p-2 rounded border border-red-100 flex items-center gap-1">
                <AlertTriangle size={14}/> 请仅粘贴官方提供的 &lt;script&gt; 标签片段，格式错误可能导致前台白屏。
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Google Analytics 跟踪代码</label>
                  <textarea
                    value={settings['google_analytics_code'] || ''}
                    onChange={e => handleChange('google_analytics_code', e.target.value)}
                    rows={6}
                    className="w-full px-3 py-2 border rounded-lg text-sm font-mono text-gray-600 bg-gray-50"
                    placeholder={`<!-- Google tag (gtag.js) -->\n<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXX"></script>\n<script>\n  window.dataLayer = window.dataLayer || [];\n  ...\n</script>`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">百度统计代码</label>
                  <textarea
                    value={settings['baidu_tongji_code'] || ''}
                    onChange={e => handleChange('baidu_tongji_code', e.target.value)}
                    rows={6}
                    className="w-full px-3 py-2 border rounded-lg text-sm font-mono text-gray-600 bg-gray-50"
                    placeholder={`<script>\nvar _hmt = _hmt || [];\n(function() {\n  var hm = document.createElement("script");\n  hm.src = "https://hm.baidu.com/hm.js?xxxxxxxxxx";\n  ...\n})();\n</script>`}
                  />
                </div>
              </div>
            </div>

            <div className="mt-10 space-y-6 border-t pt-8">
              <div className="flex items-center justify-between border-l-4 border-rose-500 pl-3 mb-4">
                <div>
                  <h3 className="text-base font-medium text-gray-800">全局曝光关键词库 (SEO Tag Pool)</h3>
                  <p className="text-xs text-gray-500 mt-1">AI 智能分析适合您产品和文章引流的标签词库。在新增商品和文章时，可直接点击选用。</p>
                </div>
                <button
                  onClick={() => generateKeywordPoolMutation.mutate()}
                  disabled={generateKeywordPoolMutation.isPending}
                  className="flex items-center gap-2 px-4 py-2 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100 transition font-medium disabled:opacity-50 text-sm"
                >
                  {generateKeywordPoolMutation.isPending ? <RefreshCw className="animate-spin" size={16} /> : <Bot size={16} />} 
                  AI 分析曝光关键词
                </button>
              </div>
              
              <div className="space-y-4">
                {(() => {
                  let keywordBatches: any[] = [];
                  const raw = settings['global_seo_keywords'] || '';
                  if (raw) {
                    try {
                      const parsed = JSON.parse(raw);
                      if (Array.isArray(parsed)) keywordBatches = parsed;
                    } catch(e) {
                      const legacyTags = raw.split(',').map((t: string) => t.trim()).filter(Boolean);
                      if (legacyTags.length > 0) keywordBatches = [{ id: 'legacy', timestamp: '早期数据', keywords: legacyTags }];
                    }
                  }

                  const keywordFreq: Record<string, number> = {};
                  keywordBatches.forEach(b => {
                    b.keywords.forEach((k: string) => {
                      keywordFreq[k] = (keywordFreq[k] || 0) + 1;
                    });
                  });

                  if (keywordBatches.length === 0) {
                    return <div className="text-sm text-gray-500 py-4 text-center border rounded-lg bg-gray-50">暂无生成的曝光词库，点击右上角由 AI 分析生成</div>;
                  }

                  return keywordBatches.map((batch, batchIdx) => (
                    <div key={batch.id} className="bg-gray-50 p-4 rounded-lg border border-gray-100 relative group">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-medium text-gray-500 uppercase tracking-wider bg-white px-2 py-1 rounded border shadow-sm">
                          {batch.timestamp}
                        </span>
                        <button 
                          onClick={() => {
                            const newBatches = [...keywordBatches];
                            newBatches.splice(batchIdx, 1);
                            handleChange('global_seo_keywords', JSON.stringify(newBatches));
                          }}
                          className="text-xs text-rose-500 hover:text-rose-700 font-medium opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          删除此批次
                        </button>
                      </div>
                      
                      <div className="flex flex-wrap gap-2">
                        {batch.keywords.map((tag: string, i: number) => {
                          const freq = keywordFreq[tag] || 1;
                          const isDuplicate = freq > 1;
                          
                          // 按词频高亮：重复次数越多，样式越深
                          let colorClass = "bg-white border-gray-200 text-gray-600";
                          let dotClass = "bg-gray-400";
                          let freqLabel = "唯一词";
                          
                          if (isDuplicate) {
                            if (freq >= 3) {
                              colorClass = "bg-rose-50 border-rose-300 text-rose-800 font-bold shadow-sm";
                              dotClass = "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]";
                              freqLabel = `极高频 (${freq}次)`;
                            } else {
                              colorClass = "bg-orange-50 border-orange-300 text-orange-800 font-bold shadow-sm";
                              dotClass = "bg-orange-500";
                              freqLabel = `重复 (${freq}次)`;
                            }
                          } else {
                             // 稍微给非重复项一点初始的权重提示（比如刚生成的第一批前几个词）
                             if (i < 3) {
                               colorClass = "bg-white border-blue-200 text-blue-700";
                               dotClass = "bg-blue-400";
                               freqLabel = "常规推荐";
                             }
                          }

                          return (
                            <span key={i} className={`inline-flex items-center gap-1.5 px-3 py-1 border rounded-full text-xs transition-all ${colorClass}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${dotClass}`} title={freqLabel}></span>
                              {tag}
                              <button onClick={() => {
                                const newBatches = JSON.parse(JSON.stringify(keywordBatches));
                                newBatches[batchIdx].keywords.splice(i, 1);
                                handleChange('global_seo_keywords', JSON.stringify(newBatches));
                              }} className="hover:opacity-70 focus:outline-none ml-1">&times;</button>
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>

          </div>
        </div>
      )}

      {activeTab === 'payment' && (
        <div className="space-y-6">
          {/* 支付模式选择 */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center gap-3 mb-4">
              <CreditCard size={20} className="text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-800">支付配置</h2>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              配置微信支付和支付宝商户参数。保存后立即生效，无需重启服务。
              <br />
              敏感信息（密钥、私钥）会安全存储，显示时已脱敏处理。
            </p>

            {paymentLoading ? (
              <div className="text-center text-gray-500 py-8">加载支付配置中...</div>
            ) : (
              <>
                {/* 当前模式指示 */}
                <div className={`mb-6 p-4 rounded-lg border ${
                  currentPaymentMode === 'mock'
                    ? 'bg-yellow-50 border-yellow-200 text-yellow-800'
                    : currentPaymentMode === 'production'
                      ? 'bg-red-50 border-red-200 text-red-800'
                      : 'bg-blue-50 border-blue-200 text-blue-800'
                }`}>
                  <div className="flex items-center gap-2 font-medium">
                    <AlertTriangle size={16} />
                    当前模式：{currentPaymentMode === 'mock' ? '模拟模式' : currentPaymentMode === 'production' ? '生产模式' : '沙箱模式'}
                  </div>
                  <div className="text-sm mt-1 opacity-80">
                    {currentPaymentMode === 'mock' && '模拟模式下不调用真实支付接口，用户下单后将跳转至模拟支付页面。'}
                    {currentPaymentMode === 'production' && '生产模式下将调用真实支付接口，请确保所有商户参数已正确配置！'}
                    {currentPaymentMode === 'sandbox' && '沙箱模式下将连接微信/支付宝沙箱测试环境。'}
                  </div>
                </div>

                {/* 全局设置 - 支付模式 */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">支付模式</label>
                  <select
                    value={paymentSettings.payment_mode || 'mock'}
                    onChange={e => handlePaymentChange('payment_mode', e.target.value)}
                    className="w-full px-3 py-2.5 border rounded-lg text-sm bg-white"
                  >
                    <option value="mock">模拟模式（测试用，无需商户号）</option>
                    <option value="sandbox">沙箱模式（微信/支付宝沙箱环境）</option>
                    <option value="production">生产模式（真实支付，需正确配置所有参数）</option>
                  </select>
                </div>

                {/* 微信支付配置 */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-md font-semibold text-gray-700 flex items-center gap-2">
                      <span className="w-1.5 h-5 bg-green-500 rounded-full inline-block"></span>
                      微信支付
                    </h3>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <span className="text-sm text-gray-500">{paymentSettings['wechat_enabled'] === '0' ? '已禁用' : '已启用'}</span>
                      <div className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${paymentSettings['wechat_enabled'] === '0' ? 'bg-gray-300' : 'bg-green-500'}`}>
                        <input type="checkbox" className="sr-only" checked={paymentSettings['wechat_enabled'] !== '0'} onChange={(e) => handlePaymentChange('wechat_enabled', e.target.checked ? '1' : '0')} />
                        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition ${paymentSettings['wechat_enabled'] === '0' ? 'translate-x-1' : 'translate-x-4'}`} />
                      </div>
                    </label>
                  </div>
                  <div className={`space-y-3 ml-4 ${paymentSettings['wechat_enabled'] === '0' ? 'opacity-50 grayscale pointer-events-none' : ''}`}>
                    {PAYMENT_FIELDS.filter(f => f.group === 'wechat').map(field => (
                      <div key={field.key}>
                        <label className="block text-sm text-gray-600 mb-1">{field.label}</label>
                        {field.type === 'password' ? (
                          <div className="flex items-center gap-2">
                            <input
                              type={visiblePasswords[field.key] ? 'text' : 'password'}
                              value={paymentSettings[field.key] || ''}
                              onChange={e => handlePaymentChange(field.key, e.target.value)}
                              placeholder="留空则不修改"
                              className="flex-1 px-3 py-2 border rounded-lg text-sm font-mono"
                            />
                            <button
                              type="button"
                              onClick={() => togglePasswordVisibility(field.key)}
                              className="p-2 text-gray-400 hover:text-gray-600 transition"
                            >
                              {visiblePasswords[field.key] ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                          </div>
                        ) : (
                          <input
                            type="text"
                            value={paymentSettings[field.key] || ''}
                            onChange={e => handlePaymentChange(field.key, e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg text-sm font-mono"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* 支付宝配置 */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-md font-semibold text-gray-700 flex items-center gap-2">
                      <span className="w-1.5 h-5 bg-blue-500 rounded-full inline-block"></span>
                      支付宝
                    </h3>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <span className="text-sm text-gray-500">{paymentSettings['alipay_enabled'] === '0' ? '已禁用' : '已启用'}</span>
                      <div className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${paymentSettings['alipay_enabled'] === '0' ? 'bg-gray-300' : 'bg-blue-500'}`}>
                        <input type="checkbox" className="sr-only" checked={paymentSettings['alipay_enabled'] !== '0'} onChange={(e) => handlePaymentChange('alipay_enabled', e.target.checked ? '1' : '0')} />
                        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition ${paymentSettings['alipay_enabled'] === '0' ? 'translate-x-1' : 'translate-x-4'}`} />
                      </div>
                    </label>
                  </div>
                  <div className={`space-y-3 ml-4 ${paymentSettings['alipay_enabled'] === '0' ? 'opacity-50 grayscale pointer-events-none' : ''}`}>
                    {PAYMENT_FIELDS.filter(f => f.group === 'alipay').map(field => (
                      <div key={field.key}>
                        <label className="block text-sm text-gray-600 mb-1">{field.label}</label>
                        {field.type === 'password' ? (
                          <div className="flex items-center gap-2">
                            <input
                              type={visiblePasswords[field.key] ? 'text' : 'password'}
                              value={paymentSettings[field.key] || ''}
                              onChange={e => handlePaymentChange(field.key, e.target.value)}
                              placeholder="留空则不修改"
                              className="flex-1 px-3 py-2 border rounded-lg text-sm font-mono"
                            />
                            <button
                              type="button"
                              onClick={() => togglePasswordVisibility(field.key)}
                              className="p-2 text-gray-400 hover:text-gray-600 transition"
                            >
                              {visiblePasswords[field.key] ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                          </div>
                        ) : (
                          <input
                            type="text"
                            value={paymentSettings[field.key] || ''}
                            onChange={e => handlePaymentChange(field.key, e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg text-sm font-mono"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                {/* Stripe 配置 */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-md font-semibold text-gray-700 flex items-center gap-2">
                      <span className="w-1.5 h-5 bg-indigo-500 rounded-full inline-block"></span>
                      Visa / Mastercard (Stripe)
                    </h3>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <span className="text-sm text-gray-500">{paymentSettings['stripe_enabled'] === '0' ? '已禁用' : '已启用'}</span>
                      <div className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${paymentSettings['stripe_enabled'] === '0' ? 'bg-gray-300' : 'bg-indigo-500'}`}>
                        <input type="checkbox" className="sr-only" checked={paymentSettings['stripe_enabled'] !== '0'} onChange={(e) => handlePaymentChange('stripe_enabled', e.target.checked ? '1' : '0')} />
                        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition ${paymentSettings['stripe_enabled'] === '0' ? 'translate-x-1' : 'translate-x-4'}`} />
                      </div>
                    </label>
                  </div>
                  <div className={`space-y-3 ml-4 ${paymentSettings['stripe_enabled'] === '0' ? 'opacity-50 grayscale pointer-events-none' : ''}`}>
                    {PAYMENT_FIELDS.filter(f => f.group === 'stripe').map(field => (
                      <div key={field.key}>
                        <label className="block text-sm text-gray-600 mb-1">{field.label}</label>
                        {field.type === 'password' ? (
                          <div className="flex items-center gap-2">
                            <input
                              type={visiblePasswords[field.key] ? 'text' : 'password'}
                              value={paymentSettings[field.key] || ''}
                              onChange={e => handlePaymentChange(field.key, e.target.value)}
                              placeholder="留空则不修改"
                              className="flex-1 px-3 py-2 border rounded-lg text-sm font-mono"
                            />
                            <button
                              type="button"
                              onClick={() => togglePasswordVisibility(field.key)}
                              className="p-2 text-gray-400 hover:text-gray-600 transition"
                            >
                              {visiblePasswords[field.key] ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                          </div>
                        ) : (
                          <input
                            type="text"
                            value={paymentSettings[field.key] || ''}
                            onChange={e => handlePaymentChange(field.key, e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg text-sm font-mono"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* PayPal 配置 */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-md font-semibold text-gray-700 flex items-center gap-2">
                      <span className="w-1.5 h-5 bg-sky-500 rounded-full inline-block"></span>
                      PayPal
                    </h3>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <span className="text-sm text-gray-500">{paymentSettings['paypal_enabled'] === '0' ? '已禁用' : '已启用'}</span>
                      <div className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${paymentSettings['paypal_enabled'] === '0' ? 'bg-gray-300' : 'bg-sky-500'}`}>
                        <input type="checkbox" className="sr-only" checked={paymentSettings['paypal_enabled'] !== '0'} onChange={(e) => handlePaymentChange('paypal_enabled', e.target.checked ? '1' : '0')} />
                        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition ${paymentSettings['paypal_enabled'] === '0' ? 'translate-x-1' : 'translate-x-4'}`} />
                      </div>
                    </label>
                  </div>
                  <div className={`space-y-3 ml-4 ${paymentSettings['paypal_enabled'] === '0' ? 'opacity-50 grayscale pointer-events-none' : ''}`}>
                    {PAYMENT_FIELDS.filter(f => f.group === 'paypal').map(field => (
                      <div key={field.key}>
                        <label className="block text-sm text-gray-600 mb-1">{field.label}</label>
                        {field.type === 'password' ? (
                          <div className="flex items-center gap-2">
                            <input
                              type={visiblePasswords[field.key] ? 'text' : 'password'}
                              value={paymentSettings[field.key] || ''}
                              onChange={e => handlePaymentChange(field.key, e.target.value)}
                              placeholder="留空则不修改"
                              className="flex-1 px-3 py-2 border rounded-lg text-sm font-mono"
                            />
                            <button
                              type="button"
                              onClick={() => togglePasswordVisibility(field.key)}
                              className="p-2 text-gray-400 hover:text-gray-600 transition"
                            >
                              {visiblePasswords[field.key] ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                          </div>
                        ) : (
                          <input
                            type="text"
                            value={paymentSettings[field.key] || ''}
                            onChange={e => handlePaymentChange(field.key, e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg text-sm font-mono"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                {/* 保存按钮 */}
                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={handlePaymentSave}
                    disabled={paymentSaving}
                    className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 text-sm font-medium"
                  >
                    <Save size={16} />
                    {paymentSaving ? '保存中...' : '保存支付配置'}
                  </button>
                  <span className="text-xs text-gray-400">保存后立即生效，无需重启服务</span>
                </div>
              </>
            )}
          </div>

          {/* 配置指引 */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h3 className="text-md font-semibold text-gray-700 mb-3">配置指引</h3>
            <div className="space-y-4 text-sm text-gray-600">
              <div>
                <h4 className="font-medium text-gray-700">微信支付</h4>
                <ol className="list-decimal ml-5 mt-1 space-y-1">
                  <li>前往 <a href="https://pay.weixin.qq.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">pay.weixin.qq.com</a> 申请商户号</li>
                  <li>获取 AppID、商户号（MCH_ID）</li>
                  <li>在商户平台设置 API 密钥 V3</li>
                  <li>申请并下载 API 证书（apiclient_cert.pem / apiclient_key.pem）</li>
                  <li>将证书文件上传到服务器的 <code className="bg-gray-100 px-1 rounded">certs/</code> 目录</li>
                  <li>设置回调地址为：<code className="bg-gray-100 px-1 rounded text-xs">https://www.trasochy.com/api/payment/wechat/notify</code></li>
                </ol>
              </div>
              <div>
                <h4 className="font-medium text-gray-700">支付宝</h4>
                <ol className="list-decimal ml-5 mt-1 space-y-1">
                  <li>前往 <a href="https://open.alipay.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">open.alipay.com</a> 创建应用</li>
                  <li>添加"手机网站支付"能力</li>
                  <li>获取 AppID</li>
                  <li>生成 RSA2 密钥对，设置应用私钥</li>
                  <li>获取支付宝公钥（或上传应用公钥获取）</li>
                  <li>设置回调地址为：<code className="bg-gray-100 px-1 rounded text-xs">https://www.trasochy.com/api/payment/alipay/notify</code></li>
                </ol>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-amber-700">
                <strong>注意：</strong>生产环境需要域名已完成 ICP 备案，且服务器需开放 443 端口（HTTPS）。微信 H5 支付还需要在商户平台配置 H5 支付域名。
              </div>
            </div>
          </div>
        </div>
      )}


    </div>
  );
}
