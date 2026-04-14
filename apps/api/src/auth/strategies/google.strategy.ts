import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, type VerifyCallback } from 'passport-google-oauth20';
import { ValidateOAuthService } from '../services/validate-oauth.service';

interface GoogleProfile {
  id: string;
  emails: { value: string }[];
  name: { givenName: string; familyName: string };
}

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    configService: ConfigService,
    private readonly validateOAuthService: ValidateOAuthService,
  ) {
    super({
      clientID: configService.get<string>('oauth.google.clientId') || 'disabled',
      clientSecret: configService.get<string>('oauth.google.clientSecret') || 'disabled',
      callbackURL:
        configService.get<string>('oauth.google.callbackUrl') || 'http://localhost/disabled',
      scope: ['email', 'profile'],
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: GoogleProfile,
    done: VerifyCallback,
  ) {
    const tokens = await this.validateOAuthService.execute({
      email: profile.emails[0].value,
      firstName: profile.name.givenName,
      lastName: profile.name.familyName,
      provider: 'google',
      providerId: profile.id,
    });

    done(null, tokens);
  }
}
