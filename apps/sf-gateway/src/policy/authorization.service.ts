import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import {
  AuditAction,
  PolicyEffect as PrismaPolicyEffect,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PolicyEngineService } from './policy-engine.service';
import { PolicyService } from './policy.service';
import { EvaluationResult } from './policy.types';
import { RequestContextService } from '../common/request-context.service';
import { JwtPayload } from '../auth/decorators/current-user.decorator';

export interface EnforcementParams {
  action: string;
  resourceType: string;
  resourceId?: string;
  resource: Record<string, unknown>;
  user: JwtPayload;
  context?: Record<string, unknown>;
}

@Injectable()
export class AuthorizationService {
  private readonly logger = new Logger(AuthorizationService.name);

  constructor(
    private readonly policyService: PolicyService,
    private readonly engine: PolicyEngineService,
    private readonly prisma: PrismaService,
    private readonly contextService: RequestContextService,
  ) {}

  async enforce(params: EnforcementParams): Promise<EvaluationResult> {
    const policy = await this.policyService.getActivePolicy(params.user.orgId);
    const requestContext = this.contextService.get();

    const subject = {
      user_id: params.user.sub,
      org_id: params.user.orgId,
      email: params.user.email,
      roles: [params.user.role],
    };

    const resource = params.resource || {};
    const context = {
      ...params.context,
      request_id: requestContext?.requestId,
      trace_id: requestContext?.traceId,
    };

    const decision: EvaluationResult = policy
      ? this.engine.evaluate(policy, {
          action: params.action,
          subject,
          resource,
          context,
        })
      : { effect: 'deny', reason: 'No active policy' };

    await this.recordDecision({
      params,
      decision,
      traceId: requestContext?.traceId,
      requestId: requestContext?.requestId,
    });

    if (decision.effect === 'deny') {
      throw new ForbiddenException(decision.reason);
    }

    return decision;
  }

  private async recordDecision(args: {
    params: EnforcementParams;
    decision: EvaluationResult;
    traceId?: string;
    requestId?: string;
  }) {
    const { params, decision, traceId, requestId } = args;

    try {
      await this.prisma.$transaction([
        this.prisma.policyDecision.create({
          data: {
            orgId: params.user.orgId,
            userId: params.user.sub,
            action: params.action,
            resourceType: params.resourceType,
            resourceId: params.resourceId,
            effect:
              decision.effect === 'allow'
                ? PrismaPolicyEffect.allow
                : PrismaPolicyEffect.deny,
            reason: decision.reason,
            ruleId: decision.ruleId,
            traceId,
            requestId,
          },
        }),
        this.prisma.auditLog.create({
          data: {
            orgId: params.user.orgId,
            userId: params.user.sub,
            action: AuditAction.policy_decision,
            resourceType: params.resourceType,
            resourceId: params.resourceId,
            message: `${decision.effect} ${params.action}`,
            meta: { ruleId: decision.ruleId, reason: decision.reason },
            traceId,
            requestId,
          },
        }),
      ]);
    } catch (error) {
      this.logger.error(
        `Failed to persist policy decision: ${error.message}`,
        error.stack,
      );
    }
  }
}
