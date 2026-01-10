import { Module } from '@nestjs/common';
import { IncidentsController } from './incidents.controller';
import { IncidentsService } from './incidents.service';
import { PrismaModule } from '../prisma/prisma.module';
import { PolicyModule } from '../policy/policy.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [PrismaModule, PolicyModule, AuditModule],
  controllers: [IncidentsController],
  providers: [IncidentsService],
})
export class IncidentsModule {}
