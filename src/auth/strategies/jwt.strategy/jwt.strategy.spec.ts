import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';
import { JwtPayload, JWT_AUDIENCE, JWT_ISSUER } from 'src/auth/jwt-claims';

const buildConfigService = (secret?: string) =>
  ({
    getOrThrow: jest.fn(() => {
      if (!secret) {
        throw new Error('SHOPSERVER_JWT_SECRET is not defined');
      }
      return secret;
    }),
  }) as unknown as ConfigService;

const buildPayload = (overrides: Partial<JwtPayload> = {}): JwtPayload => ({
  sub: '1',
  email: 'employee@example.com',
  iss: JWT_ISSUER,
  aud: JWT_AUDIENCE,
  iat: 1_700_000_000,
  exp: 1_700_003_600,
  ...overrides,
});

describe('JwtStrategy', () => {
  it('should be defined', () => {
    expect(new JwtStrategy(buildConfigService('a'.repeat(64)))).toBeDefined();
  });

  it('should fail fast when the secret is not configured', () => {
    expect(() => new JwtStrategy(buildConfigService())).toThrow(
      'SHOPSERVER_JWT_SECRET is not defined',
    );
  });

  describe('validate', () => {
    let strategy: JwtStrategy;

    beforeEach(() => {
      strategy = new JwtStrategy(buildConfigService('a'.repeat(64)));
    });

    it('should map the payload to an employee', () => {
      expect(strategy.validate(buildPayload())).toEqual({
        id: '1',
        email: 'employee@example.com',
      });
    });

    it('should throw UnauthorizedException when sub is missing', () => {
      expect(() => strategy.validate(buildPayload({ sub: undefined }))).toThrow(
        UnauthorizedException,
      );
    });
  });
});
