import { useOrganizations } from '@flama/frontend-consumer/organizations';
import { useTranslation } from 'react-i18next';

/**
 * Names the workspace under the settings heading. The name is only known once
 * the list resolves, and a reader gets a heading either way — naming the
 * workspace is not worth a dangling "for ." while the lookup is in flight. The
 * General pane asks for the same list itself; the two share one cache entry.
 */
export function WorkspaceSettingsSubtitle() {
  const { t } = useTranslation();
  const name = useOrganizations().data?.[0]?.name;
  return name ? t('settings.subtitle', { organization: name }) : t('settings.subtitleFallback');
}
