const { initDB } = require('./src/db/migrate.ts');
initDB().then(() => console.log('Done')).catch(console.error);
