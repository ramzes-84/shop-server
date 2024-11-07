import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    process.env.SERVER_BEARER_TOKEN = 'testBearerToken';
    service = new AuthService();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateToken', () => {
    it('should return true for a valid token', async () => {
      const result = await service.validateToken('testBearerToken');
      expect(result).toBe(true);
    });

    it('should return false for an invalid token', async () => {
      const result = await service.validateToken('invalidToken');
      expect(result).toBe(false);
    });
  });
});
