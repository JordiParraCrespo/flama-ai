import type { LoginDto, RegisterDto } from '@flama/shared';
import { inject, injectable } from 'inversify';
import { TOKENS } from '../../di/tokens';
import type { SocialProvider } from './auth.client';
import type { AuthRepository } from './auth.repository';
import type { AuthStore } from './auth.state';

@injectable()
export class AuthService {
  constructor(
    @inject(TOKENS.AuthRepository)
    private readonly authRepository: AuthRepository,
    @inject(TOKENS.AuthStore)
    public readonly store: AuthStore,
  ) {}

  async login(dto: LoginDto): Promise<void> {
    await this.authRepository.login(dto.email, dto.password);
    this.store.setState({ isAuthenticated: true });
  }

  async register(dto: RegisterDto): Promise<void> {
    await this.authRepository.register(dto);
    this.store.setState({ isAuthenticated: true });
  }

  async socialLogin(provider: SocialProvider): Promise<void> {
    await this.authRepository.socialLogin(provider);
  }

  /**
   * Restores the session on app start by asking the auth client whether a
   * valid session exists, and syncs the `isAuthenticated` store accordingly.
   */
  async restoreSession(): Promise<void> {
    const session = await this.authRepository.getSession();
    this.store.setState({ isAuthenticated: Boolean(session) });
  }

  async forgotPassword(email: string): Promise<void> {
    return this.authRepository.forgotPassword(email);
  }

  async resetPassword(token: string, password: string): Promise<void> {
    return this.authRepository.resetPassword(token, password);
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    return this.authRepository.changePassword(currentPassword, newPassword);
  }

  async logout(): Promise<void> {
    await this.authRepository.logout();
    this.store.setState({ isAuthenticated: false });
  }
}
