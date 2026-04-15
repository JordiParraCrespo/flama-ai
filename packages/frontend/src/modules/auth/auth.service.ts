import type { LoginDto, RegisterDto, TokenPair } from "@flama/shared";
import { inject, injectable } from "inversify";
import { TOKENS } from "../../di/tokens";
import type { AuthRepository } from "./auth.repository";
import type { AuthStore } from "./auth.state";

@injectable()
export class AuthService {
  constructor(
    @inject(TOKENS.AuthRepository)
    private readonly authRepository: AuthRepository,
    @inject(TOKENS.AuthStore)
    public readonly store: AuthStore,
  ) {}

  async login(dto: LoginDto): Promise<void> {
    await this.authRepository.login(dto);
    this.store.setState({ isAuthenticated: true });
  }

  async register(dto: RegisterDto): Promise<void> {
    await this.authRepository.register(dto);
    this.store.setState({ isAuthenticated: true });
  }

  async refreshToken(refreshToken: string): Promise<TokenPair> {
    return this.authRepository.refreshToken(refreshToken);
  }

  async forgotPassword(email: string): Promise<void> {
    return this.authRepository.forgotPassword(email);
  }

  async resetPassword(token: string, password: string): Promise<void> {
    return this.authRepository.resetPassword(token, password);
  }

  async logout(): Promise<void> {
    await this.authRepository.logout();
    this.store.setState({ isAuthenticated: false });
  }
}
