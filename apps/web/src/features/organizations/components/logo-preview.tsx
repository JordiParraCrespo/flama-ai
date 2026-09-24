import { Avatar, AvatarFallback, AvatarImage } from '@flama/design-system-web';
import { type Control, useWatch } from 'react-hook-form';
import type { OrganizationFormDto } from '@/features/organizations/lib/organization-form';

/**
 * The 64px preview tile, falling back to the initial.
 *
 * Follows what is typed rather than what is stored, so the field and its
 * preview never disagree mid-edit — and subscribes to both fields itself, so a
 * keystroke re-renders this tile and not the card around it.
 */
export function LogoPreview({ control }: { control: Control<OrganizationFormDto> }) {
  const [name, logo] = useWatch({ control, name: ['name', 'logo'] });

  return (
    <Avatar
      size={64}
      className="flex-none rounded-[14px] border border-border-default bg-surface-card after:rounded-[14px]"
    >
      {logo && <AvatarImage src={logo} alt="" className="rounded-[14px] object-contain" />}
      <AvatarFallback className="rounded-[14px] bg-surface-card text-xl font-medium text-ink-400">
        {name.trim().charAt(0).toUpperCase() || '—'}
      </AvatarFallback>
    </Avatar>
  );
}
