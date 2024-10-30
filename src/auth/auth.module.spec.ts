import { Test, TestingModule } from '@nestjs/testing';
import { AuthModule } from './auth.module';
import { AuthService } from './auth.service';
import { BearerStrategy } from './strategies/bearer.strategy/bearer.strategy';
import { PassportModule } from '@nestjs/passport';

describe('AuthModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [AuthModule],
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

  it('should provide AuthService', () => {
    const authService = module.get<AuthService>(AuthService);
    expect(authService).toBeDefined();
  });

  it('should provide BearerStrategy', () => {
    const bearerStrategy = module.get<BearerStrategy>(BearerStrategy);
    expect(bearerStrategy).toBeDefined();
  });
});
