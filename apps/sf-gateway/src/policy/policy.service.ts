import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PolicyDocument } from './policy.types';
import { Prisma } from '@prisma/client';

@Injectable()
export class PolicyService {
  private readonly logger = new Logger(PolicyService.name);
  private readonly cache = new Map<string, PolicyDocument>();

  constructor(private readonly prisma: PrismaService) {}

  async getActivePolicy(orgId: string): Promise<PolicyDocument | null> {
    const cached = this.cache.get(orgId);
    if (cached) return cached;

    const active = await this.prisma.policyVersion.findFirst({
      where: { orgId, isActive: true },
      orderBy: { version: 'desc' },
    });

    if (!active) {
      return null;
    }

    const document = active.document as unknown as PolicyDocument;
    this.cache.set(orgId, document);
    return document;
  }

  async createPolicyVersion(params: {
    orgId: string;
    policyName: string;
    document: PolicyDocument;
    createdById?: string;
    changeSummary?: string;
    activate?: boolean;
  }) {
    const {
      orgId,
      policyName,
      document,
      createdById,
      changeSummary,
      activate,
    } = params;

    return this.prisma.$transaction(async (tx) => {
      const policy = await tx.policy.upsert({
        where: { orgId_name: { orgId, name: policyName } },
        update: {},
        create: { orgId, name: policyName, enabled: true },
      });

      const latestVersion = await tx.policyVersion.findFirst({
        where: { policyId: policy.id },
        orderBy: { version: 'desc' },
        select: { version: true },
      });

      const nextVersion = (latestVersion?.version ?? 0) + 1;

      const created = await tx.policyVersion.create({
        data: {
          policyId: policy.id,
          orgId,
          version: nextVersion,
          document: document as unknown as Prisma.InputJsonValue,
          createdById,
          changeSummary,
          isActive: false,
        },
      });

      if (activate) {
        await this.activateVersion(tx, policy.id, orgId, created.version);
      }

      return created;
    });
  }

  async activateVersionById(orgId: string, versionId: string) {
    const version = await this.prisma.policyVersion.findUnique({
      where: { id: versionId },
    });
    if (!version || version.orgId !== orgId) {
      throw new Error('Policy version not found for org');
    }
    await this.prisma.$transaction(async (tx) => {
      await this.activateVersion(tx, version.policyId, orgId, version.version);
    });
  }

  async activateVersionByNumber(
    orgId: string,
    policyId: string,
    version: number,
  ) {
    await this.prisma.$transaction(async (tx) => {
      await this.activateVersion(tx, policyId, orgId, version);
    });
  }

  invalidateCache(orgId: string) {
    this.cache.delete(orgId);
  }

  private async activateVersion(
    tx: Prisma.TransactionClient,
    policyId: string,
    orgId: string,
    version: number,
  ) {
    await tx.policyVersion.updateMany({
      where: { policyId, orgId, isActive: true },
      data: { isActive: false },
    });

    await tx.policyVersion.updateMany({
      where: { policyId, orgId, version },
      data: { isActive: true },
    });

    this.invalidateCache(orgId);
    this.logger.log(
      `Activated policy ${policyId} v${version} for org ${orgId}`,
    );
  }
}
