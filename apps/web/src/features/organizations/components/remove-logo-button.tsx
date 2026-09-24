import { Button } from '@flama/design-system-web';
import { type Control, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import type { OrganizationFormDto } from '@/features/organizations/lib/organization-form';

/**
 * Clears the logo field. Watches the field itself to know whether there is
 * anything to remove, so typing a URL re-renders this button, not the card.
 */
export function RemoveLogoButton({
  control,
  disabled,
  onClick,
}: {
  control: Control<OrganizationFormDto>;
  disabled: boolean;
  onClick: () => void;
}) {
  const { t } = useTranslation();
  const logo = useWatch({ control, name: 'logo' });

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="self-start"
      disabled={disabled || logo.length === 0}
      onClick={onClick}
    >
      {t('settings.general.remove')}
    </Button>
  );
}
