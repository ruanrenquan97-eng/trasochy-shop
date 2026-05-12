import { useEffect, useState, useRef } from 'react';
import { Save, Upload, Image as ImageIcon, CreditCard, Eye, EyeOff, AlertTriangle, CheckCircle2 } from 'lucide-react';
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
];

type TabType = 'general' | 'seo' | 'payment';

export default function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [descriptions, setDescriptions] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [uploading, setUploading] = useState<string>('');
  const [activeTab, setActiveTab] = useState<TabType>('general');

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
      (data.settings as Setting[]).forEach((s: Setting) => {
        map[s.key] = s.value;
        desc[s.key] = s.description;
      });
      setSettings(map);
      setDescriptions(desc);
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
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async (key: string) => {
    setSaving(true);
    setMessage('');
    setErrorMsg('');
    try {
      await api.put(`/admin/settings/${key}`, { value: settings[key] ?? '' });
      const label = SETTING_LABELS[key] || key;
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



  const imageKeys = ['hero_banner', 'brand_logo', 'brand_story_banner'];
  const textKeys = Object.keys(SETTING_LABELS).filter(k => !imageKeys.includes(k) && !k.startsWith('promo_') && !k.startsWith('points_'));

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
            <h2 className="text-lg font-semibold text-gray-800 mb-4">文字设置</h2>
            <div className="space-y-4">
              {textKeys.map(key => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {SETTING_LABELS[key] || key}
                  </label>
                  {key === 'brand_story_text' ? (
                    <textarea
                      value={settings[key] || ''}
                      onChange={e => handleChange(key, e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                    />
                  ) : (
                    <input
                      type="text"
                      value={settings[key] || ''}
                      onChange={e => handleChange(key, e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                    />
                  )}
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
        </>
      )}

      {activeTab === 'seo' && (
        <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">全局 SEO 设置</h2>
          <p className="text-sm text-gray-500 mb-4">配置网站全局的默认搜索引擎优化（SEO）标签。这些标签会被百度、谷歌等搜索引擎抓取。</p>
          <div className="space-y-4">
            {['seo_title', 'seo_keywords', 'seo_description'].map(key => (
              <div key={key}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {SETTING_LABELS[key] || key}
                </label>
                {key === 'seo_description' ? (
                  <textarea
                    value={settings[key] || ''}
                    onChange={e => handleChange(key, e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                    placeholder="请输入网站描述，建议100-200字之间..."
                  />
                ) : (
                  <input
                    type="text"
                    value={settings[key] || ''}
                    onChange={e => handleChange(key, e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                    placeholder={`请输入${SETTING_LABELS[key]}`}
                  />
                )}
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
                  <h3 className="text-md font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <span className="w-1.5 h-5 bg-green-500 rounded-full inline-block"></span>
                    微信支付
                  </h3>
                  <div className="space-y-3 ml-4">
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
                  <h3 className="text-md font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <span className="w-1.5 h-5 bg-blue-500 rounded-full inline-block"></span>
                    支付宝
                  </h3>
                  <div className="space-y-3 ml-4">
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
