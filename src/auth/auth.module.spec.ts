import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth.module';
import { JwtStrategy } from './strategies/jwt.strategy/jwt.strategy';
import { PassportModule } from '@nestjs/passport';

describe('AuthModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    process.env.SHOPSERVER_JWT_SECRET = 'a'.repeat(64);

    module = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true }), AuthModule],
    }).compile();
  });

  it('should be defined', () => {
    const authModule = module.get<AuthModule>(AuthModule);
    expect(authModule).toBeDefined();
  });

  it('should import PassportModule', () => {
    const passportModule = module.get<PassportModule>(PassportModule);
    expect(passportModule).toBeDefined();
  });

  it('should provide JwtStrategy', () => {
    const jwtStrategy = module.get<JwtStrategy>(JwtStrategy);
    expect(jwtStrategy).toBeDefined();
  });
});
