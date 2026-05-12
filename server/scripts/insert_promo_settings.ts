import { db, sqlite } from '../src/db/index';

const now = Date.now();
const settings = [
  { key: 'promo_bar_active', value: '1', description: '是否开启顶部促销公告栏 (1: 开启, 0: 关闭)' },
  { key: 'promo_bar_text', value: '全场满300减50！限时特惠，即刻选购', description: '顶部公告栏文案' },
  { key: 'promo_bar_link', value: '/products', description: '顶部公告栏点击链接' },
  { key: 'promo_modal_active', value: '0', description: '是否开启首屏大弹窗 (1: 开启, 0: 关闭)' },
  { key: 'promo_modal_image', value: '', description: '首屏弹窗海报图片URL' },
  { key: 'promo_modal_link', value: '/products', description: '首屏弹窗点击链接' },
];

const insert = sqlite.prepare('INSERT OR IGNORE INTO site_settings (key, value, description, updated_at) VALUES (?,?,?,?)');
for (const s of settings) {
  insert.run(s.key, s.value, s.description, now);
}
console.log('Promo settings inserted successfully.');
