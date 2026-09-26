import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
} from '@flama/design-system-web';
import {
  FieldRow,
  RowControl,
  RowMeta,
  SectionCard,
  SectionRow,
  useZodResolver,
} from '@flama/frontend-web';
import {
  DEFAULT_USER_SETTINGS,
  LOCALES,
  type Locale,
  TABLE_DENSITIES,
  type UpdateUserSettingsDto,
  updateUserSettingsSchema,
} from '@flama/shared/schemas/profile';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

/**
 * Preferences save on change, one `PUT` per control — the reference design has
 * no save button here, and a preferences pane that needs one is a pane people
 * leave without saving. Every control still goes through the form and its
 * resolver: the endpoint is a full replace, so what is sent is the whole
 * document, validated, rather than the one switch that moved.
 *
 * Theme and language arrive as props rather than from the saved document: the
 * section reads what this browser is showing, and applies a change itself. The
 * form only collects and submits.
 */
export function PreferencesForm({
  saved,
  theme,
  locale,
  disabled,
  onSubmit,
}: {
  /** The server's copy of the document, once it has arrived. */
  saved: Partial<UpdateUserSettingsDto> | undefined;
  /** The theme this browser is showing. */
  theme: UpdateUserSettingsDto['theme'];
  /** The language this browser is showing. */
  locale: Locale;
  disabled: boolean;
  onSubmit: (values: UpdateUserSettingsDto) => void;
}) {
  const { t } = useTranslation();

  const { control, handleSubmit, setValue } = useForm<UpdateUserSettingsDto>({
    resolver: useZodResolver(updateUserSettingsSchema),
    // `values`, not `defaultValues`: the document arrives after the first
    // render and every save answers with the whole of it.
    values: {
      theme,
      locale,
      density: saved?.density ?? DEFAULT_USER_SETTINGS.density,
      weeklyDigest: saved?.weeklyDigest ?? DEFAULT_USER_SETTINGS.weeklyDigest,
      productUpdates: saved?.productUpdates ?? DEFAULT_USER_SETTINGS.productUpdates,
    },
  });

  const submit = handleSubmit((values) => onSubmit(values));

  /** Sets one field and sends the whole document. */
  function save<K extends keyof UpdateUserSettingsDto>(key: K, value: UpdateUserSettingsDto[K]) {
    // `as never`: React Hook Form types `setValue`'s value through a path
    // lookup that cannot be narrowed by a generic key, and the parameter
    // types above already hold the pair to the document's shape.
    setValue(key, value as never, { shouldDirty: true });
    void submit();
  }

  // `Select.Value` renders the raw value unless the root is handed the labels;
  // without these the trigger reads "compact" rather than "Compact".
  const localeLabels = Object.fromEntries(LOCALES.map((value) => [value, t(`language.${value}`)]));
  const densityLabels = Object.fromEntries(
    TABLE_DENSITIES.map((value) => [value, t(`profile.preferences.densities.${value}`)]),
  );

  return (
    <form onSubmit={submit} noValidate>
      <SectionCard className="mb-6">
        <Controller
          control={control}
          name="theme"
          render={({ field }) => (
            <SectionRow>
              <RowMeta
                name={t('profile.preferences.darkTheme')}
                description={t('profile.preferences.darkThemeDescription')}
              />
              <RowControl>
                <Switch
                  aria-label={t('profile.preferences.darkTheme')}
                  checked={field.value === 'dark'}
                  disabled={disabled}
                  onCheckedChange={(checked) => save('theme', checked ? 'dark' : 'light')}
                />
              </RowControl>
            </SectionRow>
          )}
        />

        <FieldRow label={t('profile.preferences.language')}>
          <Controller
            control={control}
            name="locale"
            render={({ field }) => (
              <Select
                items={localeLabels}
                value={field.value}
                disabled={disabled}
                onValueChange={(next) => save('locale', next as Locale)}
              >
                <SelectTrigger
                  id="preferences-language"
                  aria-label={t('profile.preferences.language')}
                  className="w-full"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LOCALES.map((value) => (
                    <SelectItem key={value} value={value}>
                      {localeLabels[value]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </FieldRow>

        <FieldRow
          label={t('profile.preferences.density')}
          hint={t('profile.preferences.densityDescription')}
        >
          <Controller
            control={control}
            name="density"
            render={({ field }) => (
              <Select
                items={densityLabels}
                value={field.value}
                disabled={disabled}
                onValueChange={(next) => save('density', next as UpdateUserSettingsDto['density'])}
              >
                <SelectTrigger
                  id="preferences-density"
                  aria-label={t('profile.preferences.density')}
                  className="w-full"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TABLE_DENSITIES.map((value) => (
                    <SelectItem key={value} value={value}>
                      {densityLabels[value]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </FieldRow>
      </SectionCard>

      <SectionCard>
        <Controller
          control={control}
          name="weeklyDigest"
          render={({ field }) => (
            <SectionRow>
              <RowMeta
                name={t('profile.preferences.weeklyDigest')}
                description={t('profile.preferences.weeklyDigestDescription')}
              />
              <RowControl>
                <Switch
                  aria-label={t('profile.preferences.weeklyDigest')}
                  checked={field.value}
                  disabled={disabled}
                  onCheckedChange={(checked) => save('weeklyDigest', checked)}
                />
              </RowControl>
            </SectionRow>
          )}
        />
        <Controller
          control={control}
          name="productUpdates"
          render={({ field }) => (
            <SectionRow>
              <RowMeta
                name={t('profile.preferences.productUpdates')}
                description={t('profile.preferences.productUpdatesDescription')}
              />
              <RowControl>
                <Switch
                  aria-label={t('profile.preferences.productUpdates')}
                  checked={field.value}
                  disabled={disabled}
                  onCheckedChange={(checked) => save('productUpdates', checked)}
                />
              </RowControl>
            </SectionRow>
          )}
        />
      </SectionCard>
    </form>
  );
}
