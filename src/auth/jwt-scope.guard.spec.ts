import { ForbiddenException } from '@nestjs/common';
import { ExecutionContext } from '@nestjs/common/interfaces/features/execution-context.interface';
import { CRON_REVISE_SCOPE } from './jwt-claims';
import { CronReviseJwtGuard, EmployeeJwtGuard } from './jwt-scope.guard';

const buildContext = (user?: { id: string; scope?: string }) =>
  ({
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  }) as unknown as ExecutionContext;

describe('JWT scope guards', () => {
  it('allows an employee token without a scope on employee routes', () => {
    expect(new EmployeeJwtGuard().canActivate(buildContext({ id: '1' }))).toBe(
      true,
    );
  });

  it('rejects a scoped cron token on employee routes', () => {
    expect(() =>
      new EmployeeJwtGuard().canActivate(
        buildContext({ id: 'cron', scope: CRON_REVISE_SCOPE }),
      ),
    ).toThrow(ForbiddenException);
  });

  it('allows the revise scope only on the cron route', () => {
    expect(
      new CronReviseJwtGuard().canActivate(
        buildContext({ id: 'cron', scope: CRON_REVISE_SCOPE }),
      ),
    ).toBe(true);
  });

  it('rejects employee tokens on the cron route', () => {
    expect(() =>
      new CronReviseJwtGuard().canActivate(buildContext({ id: '1' })),
    ).toThrow(ForbiddenException);
  });
});
