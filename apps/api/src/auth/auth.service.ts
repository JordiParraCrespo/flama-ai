import { randomBytes } from "node:crypto";
import type {
  AuthProvider,
  JwtPayload,
  LoginDto,
  RegisterDto,
  TokenPair,
} from "@flama/shared";
import { AUTH } from "@flama/shared";
import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import type { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import type { EmailService } from "../common/services/email/email.service";
import type { UsersService } from "../users/users.service";

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService
  ) {}

  async register(dto: RegisterDto): Promise<TokenPair> {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) throw new ConflictException("Email already in use");

    const hashedPassword = await bcrypt.hash(dto.password, AUTH.SALT_ROUNDS);
    const user = await this.usersService.create({
      ...dto,
      password: hashedPassword,
      role: "user",
    });

    const tokens = await this.generateTokens({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    await this.usersService.updateRefreshToken(
      user.id,
      await bcrypt.hash(tokens.refreshToken, AUTH.SALT_ROUNDS)
    );

    return tokens;
  }

  async login(dto: LoginDto): Promise<TokenPair> {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user?.password) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const isValid = await bcrypt.compare(dto.password, user.password);
    if (!isValid) throw new UnauthorizedException("Invalid credentials");

    const tokens = await this.generateTokens({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    await this.usersService.updateRefreshToken(
      user.id,
      await bcrypt.hash(tokens.refreshToken, AUTH.SALT_ROUNDS)
    );

    return tokens;
  }

  async refreshTokens(
    userId: string,
    refreshToken: string
  ): Promise<TokenPair> {
    const user = await this.usersService.findById(userId);
    if (!user?.refreshToken) {
      throw new UnauthorizedException("Access denied");
    }

    const isValid = await bcrypt.compare(refreshToken, user.refreshToken);
    if (!isValid) throw new UnauthorizedException("Access denied");

    const tokens = await this.generateTokens({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    await this.usersService.updateRefreshToken(
      user.id,
      await bcrypt.hash(tokens.refreshToken, AUTH.SALT_ROUNDS)
    );

    return tokens;
  }

  async logout(userId: string): Promise<void> {
    await this.usersService.updateRefreshToken(userId, null);
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await this.usersService.findByEmail(email);
    if (!user) return; // Don't reveal if email exists

    const token = randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 3600000); // 1 hour

    await this.usersService.update(user.id, {
      resetPasswordToken: token,
      resetPasswordExpires: expires,
    } as any);

    await this.emailService.sendPasswordReset(user.email, token);
  }

  async resetPassword(token: string, password: string): Promise<void> {
    const user = await this.usersService.findByResetToken(token);
    if (!user?.resetPasswordExpires || user.resetPasswordExpires < new Date()) {
      throw new BadRequestException("Invalid or expired reset token");
    }

    const hashedPassword = await bcrypt.hash(password, AUTH.SALT_ROUNDS);
    await this.usersService.update(user.id, {
      password: hashedPassword,
      resetPasswordToken: null,
      resetPasswordExpires: null,
    } as any);
  }

  async validateOAuthUser(profile: {
    email: string;
    firstName: string;
    lastName: string;
    provider: AuthProvider;
    providerId: string;
  }): Promise<TokenPair> {
    const user = await this.usersService.findOrCreateOAuthUser(profile);

    const tokens = await this.generateTokens({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    await this.usersService.updateRefreshToken(
      user.id,
      await bcrypt.hash(tokens.refreshToken, AUTH.SALT_ROUNDS)
    );

    return tokens;
  }

  async getProfile(userId: string) {
    const user = await this.usersService.findById(userId);
    const {
      password,
      refreshToken,
      resetPasswordToken,
      resetPasswordExpires,
      ...result
    } = user;
    return result;
  }

  private async generateTokens(payload: JwtPayload): Promise<TokenPair> {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get("app.jwtSecret"),
        expiresIn: AUTH.ACCESS_TOKEN_EXPIRY,
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get("app.jwtRefreshSecret"),
        expiresIn: AUTH.REFRESH_TOKEN_EXPIRY,
      }),
    ]);

    return { accessToken, refreshToken };
  }
}
