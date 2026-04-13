import type { LoginDto, RegisterDto } from '@flama/shared';
import { defineAbilitiesFor } from '@flama/shared';
import { inject, injectable } from 'inversify';
import { TOKENS } from '../../di/tokens';
import type { IAuthRepository } from '../../domain/repositories/auth.repository';
import { createAuthStore } from '../stores/auth.store';

@injectable()
export class AuthViewModel {
  public readonly store = createAuthStore();

  constructor(
    @inject(TOKENS.AuthRepository)
    private readonly authRepository: IAuthRepository,
  ) {}

  async login(dto: LoginDto): Promise<void> {
    this.store.getState().setLoading(true);
    try {
      await this.authRepository.login(dto);
      const user = await this.authRepository.getProfile();
      const ability = defineAbilitiesFor(user.role);
      this.store.getState().setUser(user);
      this.store.getState().setAbility(ability);
    } finally {
      this.store.getState().setLoading(false);
    }
  }

  async register(dto: RegisterDto): Promise<void> {
    this.store.getState().setLoading(true);
    try {
      await this.authRepository.register(dto);
      const user = await this.authRepository.getProfile();
      const ability = defineAbilitiesFor(user.role);
      this.store.getState().setUser(user);
      this.store.getState().setAbility(ability);
    } finally {
      this.store.getState().setLoading(false);
    }
  }

  async loadProfile(): Promise<void> {
    this.store.getState().setLoading(true);
    try {
      const user = await this.authRepository.getProfile();
      const ability = defineAbilitiesFor(user.role);
      this.store.getState().setUser(user);
      this.store.getState().setAbility(ability);
    } catch {
      this.store.getState().reset();
    } finally {
      this.store.getState().setLoading(false);
    }
  }

  async logout(): Promise<void> {
    await this.authRepository.logout();
    this.store.getState().reset();
  }
}
