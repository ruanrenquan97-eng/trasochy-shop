import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from "react-i18next";



export default function StaticPage() {
    const { t } = useTranslation();
  const PAGE_CONFIG: Record<string, { title: string; settingKey: string; breadcrumb: string }> = {
    about: { title: t('auto_shoplayout_349', '关于我们'), settingKey: 'page_about', breadcrumb: t('auto_shoplayout_349', '关于我们') },
    contact: { title: t('auto_staticpage_317', '联系我们'), settingKey: 'page_contact', breadcrumb: t('auto_staticpage_317', '联系我们') },
    delivery: { title: t('auto_shoplayout_352', '配送说明'), settingKey: 'page_delivery', breadcrumb: t('auto_shoplayout_352', '配送说明') },
    privacy: { title: t('auto_shoplayout_353', '隐私政策'), settingKey: 'page_privacy', breadcrumb: t('auto_shoplayout_353', '隐私政策') },
  };
  const { page } = useParams<{ page: string }>();
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const config = PAGE_CONFIG[page || ''];

  useEffect(() => {
    if (!config) { setLoading(false); return; }
    fetch('/api/settings')
      .then(r => r.json())
      .then(data => {
        setContent(data[config.settingKey] || '<p>页面内容暂未配置</p>');
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [page, config]);

  if (!config) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-16 text-center">
        <h1 className="text-2xl font-bold text-stone-800 mb-4">{t('auto_staticpage_310', t('auto_staticpage_310', '页面未找到'))}</h1>
        <p className="text-stone-500">{t('auto_staticpage_311', t('auto_staticpage_311', '您访问的页面不存在'))}</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      {/* 面包屑 */}
      <nav className="mb-8 text-xs text-stone-400 tracking-wider">
        <a href="/" className="hover:text-stone-700 transition-colors">{t('auto_shoplayout_341', t('auto_shoplayout_341', '首页'))}</a>
        <span className="mx-2">/</span>
        <span className="text-stone-700">{config.breadcrumb}</span>
      </nav>

      {/* 页面标题 */}
      <h1 className="text-3xl font-bold text-stone-900 mb-10 tracking-wide">{config.title}</h1>

      {/* 分割线 */}
      <div className="w-16 h-0.5 bg-stone-300 mb-10"></div>

      {/* 内容 */}
      {loading ? (
        <div className="text-center text-stone-400 py-12">{t('auto_staticpage_313', t('auto_staticpage_313', '加载中...'))}</div>
      ) : (
        <div
          className="prose prose-stone max-w-none
            [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-stone-800 [&_h2]:mt-10 [&_h2]:mb-4
            [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-stone-700 [&_h3]:mt-8 [&_h3]:mb-3
            [&_p]:text-stone-600 [&_p]:leading-relaxed [&_p]:mb-4
            [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-4
            [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-4
            [&_li]:text-stone-600 [&_li]:mb-2
            [&_a]:text-stone-800 [&_a]:underline [&_a]:hover:text-stone-600
            [&_strong]:text-stone-800 [&_strong]:font-semibold
            [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-lg [&_img]:my-4
            [&_table]:w-full [&_table]:border-collapse [&_table]:mb-4
            [&_th]:border [&_th]:border-stone-200 [&_th]:px-3 [&_th]:py-2 [&_th]:bg-stone-50 [&_th]:text-left [&_th]:text-sm
            [&_td]:border [&_td]:border-stone-200 [&_td]:px-3 [&_td]:py-2 [&_td]:text-sm
          "
          dangerouslySetInnerHTML={{ __html: content }}
        />
      )}
    </div>
  );
}
