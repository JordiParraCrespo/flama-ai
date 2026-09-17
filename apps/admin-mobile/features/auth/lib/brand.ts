/**
 * The wordmark the control plane signs in under. It is not `common.appName`:
 * the consumer app and this one ship to the same people from the same brand,
 * and the sign-in screen is the one place that has to say which of the two
 * they just opened. `apps/admin-web` sets the same label on its `_auth` route.
 */
export const CONTROL_PLANE_BRAND = 'Flama Control';
