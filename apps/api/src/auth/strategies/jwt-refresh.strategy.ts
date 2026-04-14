import type { JwtPayload } from '@flama/shared';
import { Injectable } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import type { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromBodyField('refreshToken'),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('app.jwtRefreshSecret'),
      passReqToCallback: true as const,
    });
  }

  validate(req: Request, payload: JwtPayload) {
    const refreshToken = req.body.refreshToken;
    return { ...payload, refreshToken };
  }
}
