import { Injectable, Logger } from '@nestjs/common';
import { AuditAction } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RequestContextService } from '../common/request-context.service';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly context: RequestContextService,
  ) {}

  async log(params: {
    orgId: string;
    userId?: string;
    action: AuditAction;
    message?: string;
    resourceType?: string;
    resourceId?: string;
    meta?: Record<string, unknown>;
  }) {
    const ctx = this.context.get();
    try {
      await this.prisma.auditLog.create({
        data: {
          orgId: params.orgId,
          userId: params.userId,
          action: params.action,
          resourceType: params.resourceType,
          resourceId: params.resourceId,
          message: params.message,
          meta: params.meta as any,
          traceId: ctx?.traceId,
          requestId: ctx?.requestId,
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to write audit log: ${error.message}`,
        error.stack,
      );
    }
  }
}
