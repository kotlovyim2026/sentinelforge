import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthorizationService } from '../policy/authorization.service';
import { UpdateIncidentDto } from './dto/update-incident.dto';
import { JwtPayload } from '../auth/decorators/current-user.decorator';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '@prisma/client';

@Injectable()
export class IncidentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorization: AuthorizationService,
    private readonly audit: AuditService,
  ) {}

  async getIncident(user: JwtPayload, id: string) {
    const incident = await this.prisma.incident.findUnique({ where: { id } });
    if (!incident) {
      throw new NotFoundException('Incident not found');
    }

    await this.authorization.enforce({
      action: 'incident.read',
      resourceType: 'incident',
      resourceId: incident.id,
      resource: {
        org_id: incident.orgId,
        severity: incident.severity,
        status: incident.status,
      },
      user,
    });

    return incident;
  }

  async updateIncident(user: JwtPayload, id: string, dto: UpdateIncidentDto) {
    const incident = await this.prisma.incident.findUnique({ where: { id } });
    if (!incident) {
      throw new NotFoundException('Incident not found');
    }

    await this.authorization.enforce({
      action: 'incident.update',
      resourceType: 'incident',
      resourceId: incident.id,
      resource: {
        org_id: incident.orgId,
        severity: incident.severity,
        status: incident.status,
      },
      context: {
        requested_severity: dto.severity ?? incident.severity,
        requested_status: dto.status ?? incident.status,
        requested_assignee: dto.assigneeId ?? incident.assigneeId,
      },
      user,
    });

    const updated = await this.prisma.incident.update({
      where: { id },
      data: {
        severity: dto.severity ?? incident.severity,
        status: dto.status ?? incident.status,
        assigneeId: dto.assigneeId ?? incident.assigneeId,
      },
    });

    await this.audit.log({
      orgId: incident.orgId,
      userId: user.sub,
      action: AuditAction.incident_update,
      resourceType: 'incident',
      resourceId: incident.id,
      message: 'Incident updated',
      meta: { ...dto },
    });

    return updated;
  }

  async exportIncident(user: JwtPayload, id: string) {
    const incident = await this.prisma.incident.findUnique({ where: { id } });
    if (!incident) {
      throw new NotFoundException('Incident not found');
    }

    await this.authorization.enforce({
      action: 'incident.export',
      resourceType: 'incident',
      resourceId: incident.id,
      resource: {
        org_id: incident.orgId,
        severity: incident.severity,
      },
      user,
    });

    await this.audit.log({
      orgId: incident.orgId,
      userId: user.sub,
      action: AuditAction.incident_export,
      resourceType: 'incident',
      resourceId: incident.id,
      message: 'Incident export requested',
    });

    return { message: 'Export started', incidentId: incident.id };
  }
}
