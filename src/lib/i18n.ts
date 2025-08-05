import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from '../../locales/en/common.json';
import es from '../../locales/es/common.json';
import fr from '../../locales/fr/common.json';
import ar from '../../locales/ar/common.json';
import zh from '../../locales/zh/common.json';
import ja from '../../locales/ja/common.json';
import ko from '../../locales/ko/common.json';
import de from '../../locales/de/common.json';
import pt from '../../locales/pt/common.json';
import ru from '../../locales/ru/common.json';
import tr from '../../locales/tr/common.json';
import it from '../../locales/it/common.json';
import ig from '../../locales/ig/common.json';
import ha from '../../locales/ha/common.json';
import yo from '../../locales/yo/common.json';
import hi from '../../locales/hi/common.json';
import bn from '../../locales/bn/common.json';
import pcm from '../../locales/pcm/common.json';

const resources = {
  en: { common: en },
  es: { common: es },
  fr: { common: fr },
  ar: { common: ar },
  zh: { common: zh },
  ja: { common: ja },
  ko: { common: ko },
  de: { common: de },
  pt: { common: pt },
  ru: { common: ru },
  tr: { common: tr },
  it: { common: it },
  ig: { common: ig },
  ha: { common: ha },
  yo: { common: yo },
  hi: { common: hi },
  bn: { common: bn },
  pcm: { common: pcm },
};

const getInitialLanguage = () => {
  // Always default to English for SSR to prevent hydration mismatches
  if (typeof window === 'undefined') {
    return 'en';
  }
  
  // On client side, check localStorage
    const savedLang = localStorage.getItem('selectedLanguage');
  if (savedLang && resources[savedLang as keyof typeof resources]) {
    return savedLang;
  }
  
  // Check browser language
  const browserLang = navigator.language.split('-')[0];
  if (resources[browserLang as keyof typeof resources]) {
    return browserLang;
  }
  
  return 'en';
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: getInitialLanguage(),
    fallbackLng: 'en',
    ns: ['common'],
    defaultNS: 'common',
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
    debug: process.env.NODE_ENV === 'development',
    // Ensure consistent rendering
    initImmediate: false,
  });

export default i18n; 