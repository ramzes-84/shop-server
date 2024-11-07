import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { BearerStrategy } from './bearer.strategy';
import { AuthService } from 'src/auth/auth.service';

describe('BearerStrategy', () => {
  let strategy: BearerStrategy;
  let authService: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BearerStrategy,
        {
          provide: AuthService,
          useValue: {
            validateToken: jest.fn(),
          },
        },
      ],
    }).compile();

    strategy = module.get<BearerStrategy>(BearerStrategy);
    authService = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('validate', () => {
    it('should return user if token is valid', async () => {
      const mockUser = true;
      jest.spyOn(authService, 'validateToken').mockResolvedValue(mockUser);

      const result = await strategy.validate('validToken');
      expect(result).toEqual(mockUser);
      expect(authService.validateToken).toHaveBeenCalledWith('validToken');
    });

    it('should throw UnauthorizedException if token is invalid', async () => {
      jest.spyOn(authService, 'validateToken').mockResolvedValue(null);

      await expect(strategy.validate('invalidToken')).rejects.toThrow(
        UnauthorizedException,
      );
      expect(authService.validateToken).toHaveBeenCalledWith('invalidToken');
    });
  });
});
