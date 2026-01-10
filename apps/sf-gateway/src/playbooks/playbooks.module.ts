import { Module } from '@nestjs/common';
import { PlaybooksController } from './playbooks.controller';
import { PlaybooksService } from './playbooks.service';
import { PrismaModule } from '../prisma/prisma.module';
import { PolicyModule } from '../policy/policy.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [PrismaModule, PolicyModule, AuditModule],
  controllers: [PlaybooksController],
  providers: [PlaybooksService],
})
export class PlaybooksModule {}
