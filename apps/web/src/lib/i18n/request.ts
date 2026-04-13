import { defaultLocale, type Locale, messages } from '@flama/translations';
import { getRequestConfig } from 'next-intl/server';

export default getRequestConfig(async ({ requestLocale }) => {
  const locale = ((await requestLocale) || defaultLocale) as Locale;

  return {
    locale,
    messages: messages[locale] || messages[defaultLocale],
  };
});
