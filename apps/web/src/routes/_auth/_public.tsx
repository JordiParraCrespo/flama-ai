import { redirectSignedIn } from '@flama/frontend-web';
import { createFileRoute } from '@tanstack/react-router';

/**
 * The signed-out half of the auth layout: sign in, register, and the two
 * password screens. A signed-in visitor has no business on any of them and is
 * sent to the console, or to wherever the `?redirect=` they arrived with says.
 *
 * Pathless, so `/login` and the rest stay at the root, and with no component
 * of its own — it exists only to hold this guard, which is what lets
 * `accept-invitation` and `onboarding` sit under the same layout with
 * different answers.
 */
export const Route = createFileRoute('/_auth/_public')({
  beforeLoad: ({ context, location }) =>
    redirectSignedIn({ context, location, landing: '/dashboard' }),
});
