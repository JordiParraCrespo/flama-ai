import { Injectable } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-github2';
import type { ValidateOAuthService } from '../services/validate-oauth.service';

interface GitHubProfile {
  id: string;
  username: string;
  displayName?: string;
  emails?: { value: string }[];
}

@Injectable()
export class GitHubStrategy extends PassportStrategy(Strategy, 'github') {
  constructor(
    configService: ConfigService,
    private readonly validateOAuthService: ValidateOAuthService,
  ) {
    super({
      clientID: configService.getOrThrow<string>('oauth.github.clientId'),
      clientSecret: configService.getOrThrow<string>('oauth.github.clientSecret'),
      callbackURL: configService.getOrThrow<string>('oauth.github.callbackUrl'),
      scope: ['user:email'],
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: GitHubProfile,
    done: (err: Error | null, user: unknown) => void,
  ) {
    const tokens = await this.validateOAuthService.execute({
      email: profile.emails?.[0]?.value || `${profile.username}@github.local`,
      firstName: profile.displayName?.split(' ')[0] || profile.username,
      lastName: profile.displayName?.split(' ').slice(1).join(' ') || '',
      provider: 'github',
      providerId: profile.id,
    });

    done(null, tokens);
  }
}
