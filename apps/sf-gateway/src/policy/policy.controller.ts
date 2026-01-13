import {
  Body,
  Controller,
  Param,
  Post,
  NotFoundException,
  Get,
} from '@nestjs/common';
import { PolicyService } from './policy.service';
import { AuthorizationService } from './authorization.service';
import {
  CurrentUser,
  type JwtPayload,
} from '../auth/decorators/current-user.decorator';
import { CreatePolicyVersionDto } from './dto/create-policy-version.dto';
import {
  SimulateActivePolicyDto,
  SimulatePolicyDto,
} from './dto/simulate-policy.dto';
import { PolicyEngineService } from './policy-engine.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Controller('policies')
export class PolicyController {
  constructor(
    private readonly policyService: PolicyService,
    private readonly authorization: AuthorizationService,
    private readonly engine: PolicyEngineService,
    private readonly audit: AuditService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('versions')
  async createVersion(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreatePolicyVersionDto,
  ) {
    await this.authorization.enforce({
      action: 'policy.manage',
      resourceType: 'policy',
      resource: { org_id: user.orgId },
      user,
    });

    const created = await this.policyService.createPolicyVersion({
      orgId: user.orgId,
      policyName: dto.policyName,
      document: dto.document as any,
      changeSummary: dto.changeSummary,
      createdById: user.sub,
      activate: dto.activate,
    });

    await this.audit.log({
      orgId: user.orgId,
      userId: user.sub,
      action: AuditAction.policy_update,
      resourceType: 'policy',
      resourceId: created.policyId,
      message: 'Policy version created',
      meta: { version: created.version, activated: dto.activate },
    });

    return created;
  }

  @Get('active')
  async getActive(@CurrentUser() user: JwtPayload) {
    await this.authorization.enforce({
      action: 'policy.read',
      resourceType: 'policy',
      resource: { org_id: user.orgId },
      user,
    });

    const active = await this.policyService.getActivePolicyVersion(user.orgId);
    if (!active) {
      throw new NotFoundException('Active policy not found');
    }
    return active;
  }

  @Get('versions')
  async listVersions(@CurrentUser() user: JwtPayload) {
    await this.authorization.enforce({
      action: 'policy.read',
      resourceType: 'policy',
      resource: { org_id: user.orgId },
      user,
    });

    return this.policyService.listVersions(user.orgId);
  }

  @Get('versions/:id')
  async getVersion(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    await this.authorization.enforce({
      action: 'policy.read',
      resourceType: 'policy',
      resource: { org_id: user.orgId },
      user,
    });

    const version = await this.policyService.getVersion(user.orgId, id);
    if (!version) {
      throw new NotFoundException('Policy version not found');
    }
    return version;
  }

  @Post('versions/:id/activate')
  async activateVersion(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ) {
    const version = await this.prisma.policyVersion.findUnique({
      where: { id },
    });
    if (!version) {
      throw new NotFoundException('Policy version not found');
    }

    await this.authorization.enforce({
      action: 'policy.manage',
      resourceType: 'policy',
      resourceId: version.policyId,
      resource: { org_id: version.orgId },
      user,
    });

    await this.policyService.activateVersionById(user.orgId, id);

    await this.audit.log({
      orgId: user.orgId,
      userId: user.sub,
      action: AuditAction.policy_update,
      resourceType: 'policy',
      resourceId: version.policyId,
      message: 'Policy version activated',
      meta: { version: version.version },
    });

    return { message: 'Activated', version: version.version };
  }

  @Post('simulate')
  async simulate(
    @CurrentUser() user: JwtPayload,
    @Body() dto: SimulatePolicyDto,
  ) {
    await this.authorization.enforce({
      action: 'policy.simulate',
      resourceType: 'policy',
      resource: { org_id: user.orgId },
      user,
    });

    const results = dto.scenarios.map((scenario) =>
      this.engine.evaluate(dto.document as any, {
        subject: scenario.subject as any,
        action: scenario.action,
        resource: scenario.resource,
        context: scenario.context,
      }),
    );

    await this.audit.log({
      orgId: user.orgId,
      userId: user.sub,
      action: AuditAction.policy_simulate,
      resourceType: 'policy',
      message: 'Policy simulation executed',
      meta: { scenarios: dto.scenarios.length },
    });

    return { results };
  }

  @Post('simulate/active')
  async simulateActive(
    @CurrentUser() user: JwtPayload,
    @Body() dto: SimulateActivePolicyDto,
  ) {
    await this.authorization.enforce({
      action: 'policy.simulate',
      resourceType: 'policy',
      resource: { org_id: user.orgId },
      user,
    });

    const active = await this.policyService.getActivePolicy(user.orgId);
    if (!active) {
      throw new NotFoundException('Active policy not found');
    }

    const results = dto.scenarios.map((scenario) =>
      this.engine.evaluate(active as any, {
        subject: scenario.subject as any,
        action: scenario.action,
        resource: scenario.resource,
        context: scenario.context,
      }),
    );

    await this.audit.log({
      orgId: user.orgId,
      userId: user.sub,
      action: AuditAction.policy_simulate,
      resourceType: 'policy',
      message: 'Policy simulation (active) executed',
      meta: { scenarios: dto.scenarios.length },
    });

    return { results };
  }
}
