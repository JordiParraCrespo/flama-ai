import { Cpu, ShieldCheck } from '@flama/design-system-web/icons';
import { PageHead, SectionNav } from '@flama/frontend-web';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import type { ComponentType } from 'react';
import { useTranslation } from 'react-i18next';
import { ApiKeysSection } from '@/features/api-tokens/sections/api-keys';
// flama:begin organizations
import { generalSettingsPane } from '@/features/organizations/sections/general-settings';
import { WorkspaceSettingsSubtitle } from '@/features/organizations/sections/settings-subtitle';
// flama:end organizations
// flama:plugins settings-imports
import { SecuritySection } from '@/features/profile/sections/security';

/** The sub-nav's sections, in the design's order. */
const SECTIONS = [
  // flama:begin organizations
  generalSettingsPane,
  // flama:end organizations
  // flama:plugins settings-panes
  { key: 'security', icon: ShieldCheck, Pane: SecuritySection },
  { key: 'api', icon: Cpu, Pane: ApiKeysSection },
] as const;

type SectionKey = (typeof SECTIONS)[number]['key'];

/** What the heading says under the title; with organizations, the workspace. */
const SUBTITLES: ComponentType[] = [
  // flama:begin organizations
  WorkspaceSettingsSubtitle,
  // flama:end organizations
  // flama:plugins settings-subtitles
];

const PANES: readonly SectionKey[] = SECTIONS.map((section) => section.key);

/**
 * The section lives in the URL rather than in component state.
 *
 * It costs nothing and buys a settings link someone can send to a colleague —
 * and a back button that steps between panes instead of leaving the screen.
 *
 * Everything else in the search string is carried through untouched. What
 * `validateSearch` returns *becomes* the search, so narrowing it to `section`
 * would delete a table's `tokens_page` on the next navigation — the table
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
  const navigate = useNavigate({ from: Route.fullPath });
  const Pane = SECTIONS.find((candidate) => candidate.key === section)?.Pane;
  const [Subtitle] = SUBTITLES;

  // Replaces the search rather than merging into it, so a table's own state
  // does not follow the reader into a pane that has no table.
  const go = (next: SectionKey) => navigate({ search: { section: next } });

  return (
    <>
      <PageHead
        title={t('settings.title')}
        sub={Subtitle ? <Subtitle /> : t('settings.subtitleFallback')}
      />

      <SectionNav
        label={t('settings.nav.label')}
        items={SECTIONS.map(({ key, icon }) => ({ key, icon, label: t(`settings.nav.${key}`) }))}
        active={section}
        onSelect={go}
      >
        {Pane && <Pane />}
      </SectionNav>
    </>
  );
}
