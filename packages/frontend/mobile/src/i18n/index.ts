export { LanguageSwitcher } from './components/language-switcher';
export * from './lib/i18n';
// Date formatting and the reader's locale are platform-free, so they live in
// the kernel; the kit re-exports them, as the web kit does, so a `components/`
// file (which may not import a `/react` entry point) can format a date.
export * from '@flama/frontend-core/format';
export { useLocale } from '@flama/frontend-core/react';
