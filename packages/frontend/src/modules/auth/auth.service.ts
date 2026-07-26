import type { LoginDto, RegisterDto } from '@flama/shared';
import { inject, injectable } from 'inversify';
import { TOKENS } from '../../di/tokens';
import {
  ANALYTICS_EVENTS,
  type AnalyticsEvent,
  type AuthMethod,
} from '../analytics/analytics.events';
import type { AnalyticsService } from '../analytics/analytics.service';
import type { IStorageService } from '../core/storage.service';
import type { SocialProvider } from './auth.client';
import type { AuthRepository } from './auth.repository';
import type { AuthStore } from './auth.state';

/**
 * Marks that an OAuth redirect is in flight. Social sign-in navigates the
 * browser away from the app, so the event can't be captured at the call site —
 * it has to be recorded when the user lands back.
 */
const PENDING_SOCIAL_LOGIN_KEY = 'flama.pending-social-login';

@injectable()
export class AuthService {
  constructor(
    @inject(TOKENS.AuthRepository)
    private readonly authRepository: AuthRepository,
    @inject(TOKENS.AuthStore)
    public readonly store: AuthStore,
    @inject(TOKENS.AnalyticsService)
    private readonly analytics: AnalyticsService,
    @inject(TOKENS.StorageService)
    private readonly storage: IStorageService,
  ) {}

  async login(dto: LoginDto): Promise<void> {
    await this.authRepository.login(dto.email, dto.password);
    this.store.setState({ isAuthenticated: true });
    void this.clearPendingSocialLogin();
    this.trackAuthenticated(ANALYTICS_EVENTS.USER_SIGNED_IN, 'password');
  }

  async register(dto: RegisterDto): Promise<void> {
    await this.authRepository.register(dto);
    this.store.setState({ isAuthenticated: true });
    void this.clearPendingSocialLogin();
    this.trackAuthenticated(ANALYTICS_EVENTS.USER_SIGNED_UP, 'password');
  }

  async socialLogin(provider: SocialProvider): Promise<void> {
    // Written before the redirect, consumed by `restoreSession()` when the
    // provider sends the user back. Best-effort: if storage is unavailable the
    // sign-in still works, it just goes uncounted.
    await this.storage.set(PENDING_SOCIAL_LOGIN_KEY, provider).catch(() => {});
    await this.authRepository.socialLogin(provider);
  }

  /**
   * Restores the session on app start by asking the auth client whether a
   * valid session exists, and syncs the `isAuthenticated` store accordingly.
   */
  async restoreSession(): Promise<void> {
    const session = await this.authRepository.getSession();
    this.store.setState({ isAuthenticated: Boolean(session) });

    // Re-attach the identity to the analytics client on every app start, but
    // without an event — restoring a session is not a new sign-in, and
    // counting it as one would inflate the metric on every page load.
    if (session) {
      this.identify(session.user);
      await this.captureCompletedSocialLogin();
    }
  }

  async forgotPassword(email: string): Promise<void> {
    await this.authRepository.forgotPassword(email);
    this.analytics.capture(ANALYTICS_EVENTS.PASSWORD_RESET_REQUESTED);
  }

  async resetPassword(token: string, password: string): Promise<void> {
    await this.authRepository.resetPassword(token, password);
    this.analytics.capture(ANALYTICS_EVENTS.PASSWORD_RESET_COMPLETED);
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    return this.authRepository.changePassword(currentPassword, newPassword);
  }

  async logout(): Promise<void> {
    await this.authRepository.logout();
    this.store.setState({ isAuthenticated: false });
    void this.clearPendingSocialLogin();

    // Capture before resetting, so the event is still attributed to the user
    // who signed out rather than to a fresh anonymous id.
    this.analytics.capture(ANALYTICS_EVENTS.USER_SIGNED_OUT);
    this.analytics.reset();
  }

  /**
   * Emits the sign-in event for an OAuth round-trip, if one just completed.
   *
   * The marker is cleared first so a reload can't double-count it. Note this
   * reports `USER_SIGNED_IN` for both new and returning users — the OAuth
   * callback carries nothing that distinguishes them; providers derive
   * first-seen from `identify()` instead.
   */
  private async captureCompletedSocialLogin(): Promise<void> {
    const provider = await this.storage.get(PENDING_SOCIAL_LOGIN_KEY).catch(() => null);
    if (!provider) return;

    await this.storage.remove(PENDING_SOCIAL_LOGIN_KEY).catch(() => {});
    this.analytics.capture(ANALYTICS_EVENTS.USER_SIGNED_IN, {
      method: provider as AuthMethod,
    });
  }

  /**
   * Drops an abandoned OAuth marker. Without this, a user who bails out of the
   * provider screen and later signs in with a password would have that login
   * reported as a social one on the next app start.
   */
  private clearPendingSocialLogin(): Promise<void> {
    return this.storage.remove(PENDING_SOCIAL_LOGIN_KEY).catch(() => {});
  }

  /**
   * Resolves who just authenticated and reports it.
   *
   * Deliberately not awaited: learning the user id costs a `getSession()`
   * round-trip, and analytics must never sit in the critical path of a login.
   * The caller's promise resolves as soon as auth itself is done; the identify
   * call lands a moment later.
   */
  private trackAuthenticated(event: AnalyticsEvent, method: AuthMethod): void {
    void this.authRepository
      .getSession()
      .then((session) => {
        if (session) {
          this.identify(session.user);
        }
        this.analytics.capture(event, { method });
      })
      .catch(() => {
        // The session lookup is best-effort. Still record the event so the
        // funnel isn't silently missing a conversion, just without identity.
        this.analytics.capture(event, { method });
      });
  }

  private identify(user: { id: string; email: string; firstName: string; lastName: string }): void {
    this.analytics.identify(user.id, {
      email: user.email,
      name: `${user.firstName} ${user.lastName}`.trim(),
    });
  }
}
