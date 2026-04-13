import { useTranslations } from 'next-intl';

export default function HomePage() {
  const t = useTranslations('common');

  return (
    <main className="flex min-h-screen flex-col items-center justify-center">
      <h1 className="text-4xl font-bold">{t('appName')}</h1>
      <p className="mt-4 text-neutral-500">Your app starts here.</p>
    </main>
  );
}
