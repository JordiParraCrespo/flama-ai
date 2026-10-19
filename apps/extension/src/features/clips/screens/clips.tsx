import { useTranslation } from 'react-i18next';
import { ClipList } from '@/features/clips/sections/clip-list';

/** The side panel's body: the saved pages, and where they are kept. */
export function ClipsScreen() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-1 flex-col">
      <ClipList />
      <p className="mt-auto px-4 py-3 text-center text-xs text-ink-400">
        {t('extension.clips.localNote')}
      </p>
    </div>
  );
}
