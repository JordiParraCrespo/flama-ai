import type { ApiClient } from "@flama/api-client";
import type { LoginDto, RegisterDto, TokenPair } from "@flama/shared";
import { inject, injectable } from "inversify";
import { TOKENS } from "../../di/tokens";
import { UserEntity } from "../../domain/entities/user.entity";
import type { IAuthRepository } from "../../domain/repositories/auth.repository";
import type { IStorageService } from "../../domain/services/storage.service";

@injectable()
export class AuthRepositoryImpl implements IAuthRepository {
  constructor(
    @inject(TOKENS.ApiClient) private readonly apiClient: ApiClient,
    @inject(TOKENS.StorageService) private readonly storage: IStorageService
  ) {}

  async login(dto: LoginDto): Promise<TokenPair> {
    const { data } = await this.apiClient.POST("/auth/login", { body: dto });
    if (data) {
      await this.storage.set("accessToken", data.accessToken);
      await this.storage.set("refreshToken", data.refreshToken);
    }
    return data as unknown as TokenPair;
  }

  async register(dto: RegisterDto): Promise<TokenPair> {
    const { data } = await this.apiClient.POST("/auth/register", { body: dto });
    if (data) {
      await this.storage.set("accessToken", data.accessToken);
      await this.storage.set("refreshToken", data.refreshToken);
    }
    return data as unknown as TokenPair;
  }

  async refreshToken(refreshToken: string): Promise<TokenPair> {
    const { data } = await this.apiClient.POST("/auth/refresh", {
      body: { refreshToken },
    });
    if (data) {
      await this.storage.set("accessToken", data.accessToken);
      await this.storage.set("refreshToken", data.refreshToken);
    }
    return data as unknown as TokenPair;
  }

  async forgotPassword(email: string): Promise<void> {
    await this.apiClient.POST("/auth/forgot-password", { body: { email } });
  }

  async resetPassword(token: string, password: string): Promise<void> {
    await this.apiClient.POST("/auth/reset-password", {
      body: { token, password },
    });
  }

  async getProfile(): Promise<UserEntity> {
    const { data } = await this.apiClient.GET("/auth/profile");
    if (!data) {
      throw new Error("Failed to fetch profile");
    }
    return new UserEntity(
      data.id,
      data.email,
      data.firstName,
      data.lastName,
      data.role,
      data.isActive,
      new Date(data.createdAt),
      new Date(data.updatedAt)
    );
  }

  async logout(): Promise<void> {
    await this.storage.remove("accessToken");
    await this.storage.remove("refreshToken");
  }
}
