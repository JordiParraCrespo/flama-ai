// Date formatting and the reader's locale are platform-free, so they live in
// the kernel; the kit re-exports them so a web screen has one import.
export * from '@flama/frontend-core/format';
export { useLocale } from '@flama/frontend-core/react';
export { LanguageSwitcher } from './components/language-switcher';
export { useApplyUserSettings } from './hooks/use-apply-user-settings';
export { default as i18n, i18nReady, LOCALE_STORAGE_KEY } from './lib/i18n';
export * from './lib/person-name';
