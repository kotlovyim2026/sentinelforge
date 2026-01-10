import { Module } from '@nestjs/common';
import { PolicyEngineService } from './policy-engine.service';
import { PolicyService } from './policy.service';
import { AuthorizationService } from './authorization.service';
import { PolicyController } from './policy.controller';
import { AuditModule } from '../audit/audit.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [PolicyController],
  providers: [PolicyEngineService, PolicyService, AuthorizationService],
  exports: [PolicyEngineService, PolicyService, AuthorizationService],
})
export class PolicyModule {}
