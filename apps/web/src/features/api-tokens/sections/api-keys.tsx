import { Button, Card, CardContent, CardDescription, CardTitle } from '@flama/design-system-web';
import { ArrowRight } from '@flama/design-system-web/icons';
import { SectionHead } from '@flama/frontend-web';
import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

/**
 * The settings screen's API pane: a pointer at the screen that owns tokens.
 *
 * It used to be a second implementation of that screen — its own card, row,
 * create dialog, permission form and secret dialog, over its own
 * `settings.api.*` copy. Two of everything meant every fix landed twice, and
 * the one that did not land twice was this pane's permission search: live state
 * in the component that mapped the groups, so a keystroke redrew every visible
 * row. One screen owns API tokens now, and this pane sends the reader there.
 */
export function ApiKeysSection() {
  const { t } = useTranslation();

  return (
    <>
      <SectionHead title={t('settings.api.title')} sub={t('settings.api.description')} />
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <CardTitle>{t('settings.api.keys')}</CardTitle>
            <CardDescription>{t('settings.api.manageDescription')}</CardDescription>
          </div>
          <Button render={<Link to="/settings/api-tokens" />} variant="secondary">
            {t('settings.api.manage')}
            <ArrowRight data-icon="inline-end" />
          </Button>
        </CardContent>
      </Card>
    </>
  );
}
