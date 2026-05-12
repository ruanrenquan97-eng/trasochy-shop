import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import zhTranslation from './locales/zh/translation.json';
import enTranslation from './locales/en/translation.json';
import deTranslation from './locales/de/translation.json';

const resources = {
  zh: { translation: zhTranslation },
  en: { translation: enTranslation },
  de: { translation: deTranslation },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'zh',
    debug: false,
    interpolation: {
      escapeValue: false, // React already safe from xss
    },
  });

export default i18n;
