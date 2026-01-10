import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthorizationService } from '../policy/authorization.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '@prisma/client';
import { JwtPayload } from '../auth/decorators/current-user.decorator';
import { CreateEvidenceDto } from './dto/create-evidence.dto';

@Injectable()
export class EvidenceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorization: AuthorizationService,
    private readonly audit: AuditService,
  ) {}

  async getEvidence(user: JwtPayload, id: string) {
    const evidence = await this.prisma.evidence.findUnique({ where: { id } });
    if (!evidence) {
      throw new NotFoundException('Evidence not found');
    }

    await this.authorization.enforce({
      action: 'evidence.read',
      resourceType: 'evidence',
      resourceId: evidence.id,
      resource: {
        org_id: evidence.orgId,
        incident_id: evidence.incidentId,
        type: evidence.type,
      },
      user,
    });

    await this.audit.log({
      orgId: evidence.orgId,
      userId: user.sub,
      action: AuditAction.evidence_read,
      resourceType: 'evidence',
      resourceId: evidence.id,
      message: 'Evidence read',
    });

    return evidence;
  }

  async addEvidence(
    user: JwtPayload,
    incidentId: string,
    dto: CreateEvidenceDto,
  ) {
    const incident = await this.prisma.incident.findUnique({
      where: { id: incidentId },
    });
    if (!incident) {
      throw new NotFoundException('Incident not found');
    }

    await this.authorization.enforce({
      action: 'evidence.add',
      resourceType: 'incident',
      resourceId: incident.id,
      resource: {
        org_id: incident.orgId,
        incident_id: incident.id,
        severity: incident.severity,
      },
      user,
    });

    const evidence = await this.prisma.evidence.create({
      data: {
        orgId: incident.orgId,
        incidentId: incident.id,
        type: dto.type,
        contentText: dto.contentText,
        contentUrl: dto.contentUrl,
        contentRef: dto.contentRef,
        createdById: user.sub,
      },
    });

    await this.audit.log({
      orgId: incident.orgId,
      userId: user.sub,
      action: AuditAction.evidence_add,
      resourceType: 'incident',
      resourceId: incident.id,
      message: 'Evidence added',
      meta: { evidenceId: evidence.id },
    });

    return evidence;
  }
}
