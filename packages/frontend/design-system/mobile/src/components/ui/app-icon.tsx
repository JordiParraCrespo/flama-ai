import { View } from 'react-native';
import { cn } from '../../lib/utils';
import { ExpoImage } from './expo-image';

/**
 * Brand marks come from the Iconify API, per the brand guide, and match
 * `@flama/design-system-web`'s `AppIcon` name for name. Colourful logos live
 * in the `logos` set; marks that are monochrome by design (X, GitHub, Apple)
 * come from `simple-icons` and get tinted.
 *
 * These are third-party trademarks — use them only to represent a real
 * integration. Pass `src` to serve a mark yourself and skip the network call.
 */
const LOGO_SET: Record<string, string> = {
  slack: 'slack-icon',
  zoom: 'zoom-icon',
  notion: 'notion-icon',
  figma: 'figma',
  asana: 'asana-icon',
  trello: 'trello',
  whatsapp: 'whatsapp-icon',
  telegram: 'telegram',
  linkedin: 'linkedin-icon',
  messenger: 'messenger',
  google: 'google-icon',
  meta: 'meta-icon',
  googlechrome: 'chrome',
  googlegemini: 'google-gemini',
};

function iconifyUrl(app: string) {
  return LOGO_SET[app]
    ? `https://api.iconify.design/logos/${LOGO_SET[app]}.svg`
    : `https://api.iconify.design/simple-icons/${app}.svg?color=%23292929`;
}

/**
 * AppIcon — a brand logo on a rounded-square tile, the mark half its size.
 * `plate` renders the card-coloured plate; turn it off for a tile that sits
 * on the sunken surface.
 */
function AppIcon({
  app,
  label,
  size = 40,
  plate = true,
  src,
  className,
}: {
  app: string;
  label?: string;
  size?: number;
  plate?: boolean;
  src?: string;
  className?: string;
}) {
  const inner = Math.round(size * 0.5);
  return (
    <View
      accessibilityLabel={label ?? app}
      className={cn(
        'shrink-0 items-center justify-center rounded-xl',
        plate ? 'bg-card' : 'bg-surface-sunken',
        className,
      )}
      style={{ width: size, height: size }}
    >
      <ExpoImage source={{ uri: src ?? iconifyUrl(app) }} style={{ width: inner, height: inner }} />
    </View>
  );
}

export { AppIcon };
