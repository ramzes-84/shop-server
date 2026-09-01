import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './strategies/jwt.strategy/jwt.strategy';
import { CronReviseJwtGuard, EmployeeJwtGuard } from './jwt-scope.guard';

@Module({
  imports: [PassportModule],
  providers: [JwtStrategy, EmployeeJwtGuard, CronReviseJwtGuard],
  exports: [EmployeeJwtGuard, CronReviseJwtGuard],
})
export class AuthModule {}
