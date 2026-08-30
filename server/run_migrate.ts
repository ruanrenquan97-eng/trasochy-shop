import { initDB } from './src/db/migrate';
initDB().then(() => console.log('Done')).catch(console.error);
