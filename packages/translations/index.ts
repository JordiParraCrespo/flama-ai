import en from './en/index.json';
import es from './es/index.json';

export const locales = ['en', 'es'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'en';

export const messages = { en, es } as const;

export { en, es };
