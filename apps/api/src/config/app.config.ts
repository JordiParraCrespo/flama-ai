import { registerAs } from '@nestjs/config';

export const appConfig = registerAs('app', () => ({
  port: Number.parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'change-me-in-production',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'change-me-refresh-in-production',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
}));
