import { Module } from '@nestjs/common';
import { EvidenceController } from './evidence.controller';
import { EvidenceService } from './evidence.service';
import { PrismaModule } from '../prisma/prisma.module';
import { PolicyModule } from '../policy/policy.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [PrismaModule, PolicyModule, AuditModule],
  controllers: [EvidenceController],
  providers: [EvidenceService],
})
export class EvidenceModule {}
