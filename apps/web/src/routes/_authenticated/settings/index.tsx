import { ShieldCheck } from '@flama/design-system-web/icons';
import { PageHead, SectionNav } from '@flama/frontend-web';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
// flama:begin organizations
import { GENERAL_SETTINGS_SECTION } from '@/features/organizations/lib/settings-section';
import { GeneralSettingsSection } from '@/features/organizations/sections/general-settings';
// flama:end organizations
import { SecuritySection } from '@/features/profile/sections/security';

/**
 * The sub-nav's sections, in the design's order, each with the pane it opens:
 * a module that adds a pane adds its row here and nothing else.
 */
const SECTIONS = [
  // flama:begin organizations
  { ...GENERAL_SETTINGS_SECTION, Pane: GeneralSettingsSection },
  // flama:end organizations
  { key: 'security', icon: ShieldCheck, Pane: SecuritySection },
] as const;

type SectionKey = (typeof SECTIONS)[number]['key'];

const PANES: readonly SectionKey[] = SECTIONS.map((section) => section.key);

/**
 * The section lives in the URL rather than in component state.
 *
 * It costs nothing and buys a settings link someone can send to a colleague —
 * and a back button that steps between panes instead of leaving the screen.
 *
 * Everything else in the search string is carried through untouched. What
 * `validateSearch` returns *becomes* the search, so narrowing it to `section`
 * would delete a table's page (`<prefix>_page`) on the next navigation — the table
 * would write it and the router would take it away. `section` is still the
 * only key this route reads or trusts.
 */
export const Route = createFileRoute('/_authenticated/settings/')({
  validateSearch: (
    search: Record<string, unknown>,
  ): Record<string, unknown> & { section?: SectionKey } => {
    const { section: requested, ...rest } = search;
    return PANES.includes(requested as SectionKey)
      ? { ...rest, section: requested as SectionKey }
      : rest;
  },
  component: SettingsPage,
});

function SettingsPage() {
  const { t } = useTranslation();
  const { section = SECTIONS[0].key } = Route.useSearch();
  const { Pane } = SECTIONS.find((entry) => entry.key === section) ?? SECTIONS[0];
  const navigate = useNavigate({ from: Route.fullPath });

  // Replaces the search rather than merging into it, so a table's own state
  // does not follow the reader into a pane that has no table.
  const go = (next: SectionKey) => navigate({ search: { section: next } });

  return (
    <>
      <PageHead title={t('settings.title')} sub={t('settings.subtitle')} />

      <SectionNav
        label={t('settings.nav.label')}
        items={SECTIONS.map(({ key, icon }) => ({ key, icon, label: t(`settings.nav.${key}`) }))}
        active={section}
        onSelect={go}
      >
        <Pane />
      </SectionNav>
    </>
  );
}
