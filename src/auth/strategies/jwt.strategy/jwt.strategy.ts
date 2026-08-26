import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { ExtractJwt, Strategy } from 'passport-jwt';
import {
  AuthenticatedEmployee,
  JwtPayload,
  JWT_AUDIENCE,
  JWT_CLOCK_TOLERANCE_SEC,
  JWT_ISSUER,
} from 'src/auth/jwt-claims';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      // getOrThrow: без секрета приложение не стартует, вместо того чтобы пускать всех
      secretOrKey: configService.getOrThrow<string>('SHOPSERVER_JWT_SECRET'),
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
      algorithms: ['HS256'],
      ignoreExpiration: false,
      jsonWebTokenOptions: {
        clockTolerance: JWT_CLOCK_TOLERANCE_SEC,
      },
    });
  }

  validate(payload: JwtPayload): AuthenticatedEmployee {
    if (!payload?.sub) {
      throw new UnauthorizedException();
    }

    return { id: payload.sub, email: payload.email };
  }
}
