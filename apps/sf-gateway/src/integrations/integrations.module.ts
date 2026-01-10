import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { PolicyModule } from '../policy/policy.module';
import { AuditModule } from '../audit/audit.module';
import { IntegrationsController } from './integrations.controller';
import { IntegrationsService } from './integrations.service';

@Module({
  imports: [HttpModule, ConfigModule, PrismaModule, PolicyModule, AuditModule],
  controllers: [IntegrationsController],
  providers: [IntegrationsService],
})
export class IntegrationsModule {}
