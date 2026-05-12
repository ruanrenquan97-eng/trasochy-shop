import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './server/src/db/schema.ts',
  dialect: 'sqlite',
  dbCredentials: {
    url: './data/skincare.db',
  },
  verbose: true,
  strict: true,
});
