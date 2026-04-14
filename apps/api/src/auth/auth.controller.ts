import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
  Version,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { UsersService } from '../users/services/users.service';
import { AuthMapper } from './auth.mapper';
import { CurrentUser } from './decorators/current-user.decorator';
import { AuthResponseDto } from './dtos/auth-response.dto';
import { ProfileResponseDto } from './dtos/profile-response.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import type { ForgotPasswordRequest } from './requests/forgot-password.request';
import type { LoginRequest } from './requests/login.request';
import type { RegisterRequest } from './requests/register.request';
import type { ResetPasswordRequest } from './requests/reset-password.request';
import { ForgotPasswordService } from './services/forgot-password.service';
import { LoginService } from './services/login.service';
import { LogoutService } from './services/logout.service';
import { RefreshTokensService } from './services/refresh-tokens.service';
import { RegisterService } from './services/register.service';
import { ResetPasswordService } from './services/reset-password.service';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly registerService: RegisterService,
    private readonly loginService: LoginService,
    private readonly refreshTokensService: RefreshTokensService,
    private readonly logoutService: LogoutService,
    private readonly forgotPasswordService: ForgotPasswordService,
    private readonly resetPasswordService: ResetPasswordService,
    private readonly usersService: UsersService,
    private readonly authMapper: AuthMapper,
    private readonly configService: ConfigService,
  ) {}

  @Post('register')
  @Version('1')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, type: AuthResponseDto })
  @ApiResponse({ status: 409, description: 'AUTH_001: Email already in use' })
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  register(@Body() dto: RegisterRequest) {
    return this.registerService.execute(dto);
  }

  @Post('login')
  @Version('1')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  @ApiResponse({ status: 401, description: 'AUTH_002: Invalid credentials' })
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  login(@Body() dto: LoginRequest) {
    return this.loginService.execute(dto);
  }

  @Post('refresh')
  @Version('1')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtRefreshGuard)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  @ApiResponse({ status: 401, description: 'AUTH_004: Access denied' })
  refresh(@CurrentUser() user: { sub: string; refreshToken: string }) {
    return this.refreshTokensService.execute(user.sub, user.refreshToken);
  }

  @Post('logout')
  @Version('1')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout' })
  @ApiResponse({ status: 200 })
  logout(@CurrentUser('sub') userId: string) {
    return this.logoutService.execute(userId);
  }

  @Post('forgot-password')
  @Version('1')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset' })
  @ApiResponse({ status: 200 })
  @Throttle({ default: { ttl: 60000, limit: 3 } })
  forgotPassword(@Body() body: ForgotPasswordRequest) {
    return this.forgotPasswordService.execute(body.email);
  }

  @Post('reset-password')
  @Version('1')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password with token' })
  @ApiResponse({ status: 200 })
  @ApiResponse({
    status: 400,
    description: 'AUTH_003: Invalid or expired reset token',
  })
  resetPassword(@Body() body: ResetPasswordRequest) {
    return this.resetPasswordService.execute(body.token, body.password);
  }

  @Get('profile')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, type: ProfileResponseDto })
  async getProfile(@CurrentUser('sub') userId: string) {
    const user = await this.usersService.findById(userId);
    return this.authMapper.toProfileResponse(user);
  }

  @Get('google')
  @Version('1')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Login with Google' })
  googleAuth() {}

  @Get('google/callback')
  @Version('1')
  @UseGuards(AuthGuard('google'))
  async googleCallback(@Req() req: Request, @Res() res: Response) {
    const tokens = req.user as { accessToken: string; refreshToken: string };
    const frontendUrl = this.configService.get('app.frontendUrl');
    res.redirect(
      `${frontendUrl}/auth/callback?accessToken=${tokens.accessToken}&refreshToken=${tokens.refreshToken}`,
    );
  }

  @Get('github')
  @Version('1')
  @UseGuards(AuthGuard('github'))
  @ApiOperation({ summary: 'Login with GitHub' })
  githubAuth() {}

  @Get('github/callback')
  @Version('1')
  @UseGuards(AuthGuard('github'))
  async githubCallback(@Req() req: Request, @Res() res: Response) {
    const tokens = req.user as { accessToken: string; refreshToken: string };
    const frontendUrl = this.configService.get('app.frontendUrl');
    res.redirect(
      `${frontendUrl}/auth/callback?accessToken=${tokens.accessToken}&refreshToken=${tokens.refreshToken}`,
    );
  }
}
