import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthorizationService } from '../policy/authorization.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction, PlaybookRunStatus } from '@prisma/client';
import { JwtPayload } from '../auth/decorators/current-user.decorator';
import { RunPlaybookDto } from './dto/run-playbook.dto';
import { randomUUID } from 'crypto';

@Injectable()
export class PlaybooksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorization: AuthorizationService,
    private readonly audit: AuditService,
  ) {}

  async runPlaybook(user: JwtPayload, playbookId: string, dto: RunPlaybookDto) {
    const playbook = await this.prisma.playbook.findUnique({
      where: { id: playbookId },
    });
    if (!playbook) {
      throw new NotFoundException('Playbook not found');
    }

    const incident = await this.prisma.incident.findUnique({
      where: { id: dto.incidentId },
    });
    if (!incident) {
      throw new NotFoundException('Incident not found');
    }

    if (playbook.orgId !== incident.orgId) {
      throw new NotFoundException(
        'Playbook and incident do not belong to the same org',
      );
    }

    await this.authorization.enforce({
      action: 'playbook.run',
      resourceType: 'playbook',
      resourceId: playbook.id,
      resource: {
        org_id: playbook.orgId,
        incident_id: incident.id,
        severity: incident.severity,
      },
      user,
    });

    const run = await this.prisma.playbookRun.create({
      data: {
        orgId: playbook.orgId,
        incidentId: incident.id,
        playbookId: playbook.id,
        requestedById: user.sub,
        status: PlaybookRunStatus.queued,
        idempotencyKey: randomUUID(),
      },
    });

    await this.audit.log({
      orgId: playbook.orgId,
      userId: user.sub,
      action: AuditAction.playbook_run_request,
      resourceType: 'playbook',
      resourceId: playbook.id,
      message: 'Playbook run queued',
      meta: { runId: run.id, incidentId: incident.id },
    });

    return run;
  }
}
