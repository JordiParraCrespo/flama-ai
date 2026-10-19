import { EmptyState } from '@flama/design-system-web';
import { BookmarkPlus } from '@flama/design-system-web/icons';
import { useTranslation } from 'react-i18next';

/** No clips yet: what to press to make one. `shortcut` is empty when the person unbound it. */
export function ClipsEmpty({ shortcut }: { shortcut: string }) {
  const { t } = useTranslation();

  return (
    <div className="my-12">
      <EmptyState>
        <EmptyState.Header>
          <EmptyState.Media variant="icon">
            <BookmarkPlus />
          </EmptyState.Media>
          <EmptyState.Title>{t('extension.clips.emptyTitle')}</EmptyState.Title>
          <EmptyState.Description>
            {shortcut
              ? t('extension.clips.emptyDescription', { shortcut })
              : t('extension.clips.emptyDescriptionNoShortcut')}
          </EmptyState.Description>
        </EmptyState.Header>
      </EmptyState>
    </div>
  );
}
