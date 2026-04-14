import type { TokenPair } from '@flama/shared';
import { AUTH } from '@flama/shared';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import type { Repository } from 'typeorm';
import { User } from '../user.entity';

@Injectable()
export class UserTokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async generateAndStoreTokens(userId: string, email: string, role: string): Promise<TokenPair> {
    const tokens = await this.generateTokenPair(userId, email, role);
    await this.storeRefreshToken(userId, tokens.refreshToken);
    return tokens;
  }

  async validateRefreshToken(userId: string, plainRefreshToken: string): Promise<boolean> {
    const user = await this.usersRepository.findOneBy({ id: userId });
    if (!user?.refreshToken) return false;
    return bcrypt.compare(plainRefreshToken, user.refreshToken);
  }

  async revokeRefreshToken(userId: string): Promise<void> {
    await this.usersRepository.update(userId, { refreshToken: null });
  }

  private async generateTokenPair(userId: string, email: string, role: string): Promise<TokenPair> {
    const payload = { sub: userId, email, role };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get('app.jwtSecret'),
        expiresIn: AUTH.ACCESS_TOKEN_EXPIRY,
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get('app.jwtRefreshSecret'),
        expiresIn: AUTH.REFRESH_TOKEN_EXPIRY,
      }),
    ]);
    return { accessToken, refreshToken };
  }

  private async storeRefreshToken(userId: string, plainRefreshToken: string): Promise<void> {
    const hashedToken = await bcrypt.hash(plainRefreshToken, AUTH.SALT_ROUNDS);
    await this.usersRepository.update(userId, { refreshToken: hashedToken });
  }
}
