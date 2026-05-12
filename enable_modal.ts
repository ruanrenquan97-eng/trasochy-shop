import { sqlite } from './server/src/db/index';
sqlite.prepare("UPDATE site_settings SET value = '1' WHERE key = 'promo_modal_active'").run();
console.log('Modal enabled');
