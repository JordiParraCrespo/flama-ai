import type { LoginDto, RegisterDto, TokenPair } from '@flama/shared';
import type { UserEntity } from '../entities/user.entity';

export interface IAuthRepository {
  login(dto: LoginDto): Promise<TokenPair>;
  register(dto: RegisterDto): Promise<TokenPair>;
  refreshToken(refreshToken: string): Promise<TokenPair>;
  forgotPassword(email: string): Promise<void>;
  resetPassword(token: string, password: string): Promise<void>;
  getProfile(): Promise<UserEntity>;
  logout(): Promise<void>;
}
