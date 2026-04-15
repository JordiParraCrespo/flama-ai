import type { AuthClient } from "@flama/api-client/auth";
import type { LoginDto, RegisterDto, TokenPair } from "@flama/shared";
import { inject, injectable } from "inversify";
import { TOKENS } from "../../di/tokens";
import { AppError } from "../core/errors";
import type { IStorageService } from "../core/storage.service";
import { AuthErrors } from "./auth.errors";

@injectable()
export class AuthRepository {
  constructor(
    @inject(TOKENS.AuthClient) private readonly authClient: AuthClient,
    @inject(TOKENS.StorageService) private readonly storage: IStorageService,
  ) {}

  async login(dto: LoginDto): Promise<TokenPair> {
    const data = await this.authClient.login(dto);
    if (!data) throw new AppError(AuthErrors.LOGIN_FAILED);
    await this.storage.set("accessToken", data.accessToken);
    await this.storage.set("refreshToken", data.refreshToken);
    return data;
  }

  async register(dto: RegisterDto): Promise<TokenPair> {
    const data = await this.authClient.register(dto);
    if (!data) throw new AppError(AuthErrors.REGISTER_FAILED);
    await this.storage.set("accessToken", data.accessToken);
    await this.storage.set("refreshToken", data.refreshToken);
    return data;
  }

  async refreshToken(_refreshToken: string): Promise<TokenPair> {
    const data = await this.authClient.refresh();
    if (!data) throw new AppError(AuthErrors.REFRESH_FAILED);
    await this.storage.set("accessToken", data.accessToken);
    await this.storage.set("refreshToken", data.refreshToken);
    return data;
  }

  async forgotPassword(email: string): Promise<void> {
    await this.authClient.forgotPassword({ email });
  }

  async resetPassword(token: string, password: string): Promise<void> {
    await this.authClient.resetPassword({ token, password });
  }

  async logout(): Promise<void> {
    await this.storage.remove("accessToken");
    await this.storage.remove("refreshToken");
  }
}
