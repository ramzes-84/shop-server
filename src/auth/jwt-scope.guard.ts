import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthenticatedEmployee, CRON_REVISE_SCOPE } from './jwt-claims';

type AuthenticatedRequest = Request & { user?: AuthenticatedEmployee };

@Injectable()
export class EmployeeJwtGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    if (request.user?.scope === undefined) {
      return true;
    }

    throw new ForbiddenException('Employee token is required');
  }
}

@Injectable()
export class CronReviseJwtGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    if (request.user?.scope === CRON_REVISE_SCOPE) {
      return true;
    }

    throw new ForbiddenException('Cron revise token is required');
  }
}
