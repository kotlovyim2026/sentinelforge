import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { OrgMemberRole, EvidenceType } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PolicyService } from '../src/policy/policy.service';
import { buildDefaultPolicy } from '../src/policy/default-policy';

const passwordHash =
  '$2a$12$C6UzMDM.H6dfI/f/IKcEeO3o8lH9eE5OlpzjF2yBlyr4AG2SLm3Sa';

describe('Authorization (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwt: JwtService;
  let policyService: PolicyService;
  let server: any;

  const buildToken = (
    userId: string,
    orgId: string,
    email: string,
    role: OrgMemberRole,
  ) =>
    jwt.sign(
      { sub: userId, orgId, email, role, sessionId: randomUUID() },
      { expiresIn: '15m' },
    );

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    await app.init();

    prisma = app.get(PrismaService);
    jwt = app.get(JwtService);
    policyService = app.get(PolicyService);
    server = app.getHttpServer();
  });

  afterAll(async () => {
    await app.close();
  });

  const resetDb = async () => {
    await prisma.$transaction([
      prisma.policyDecision.deleteMany(),
      prisma.auditLog.deleteMany(),
      prisma.playbookStepRun.deleteMany(),
      prisma.playbookRun.deleteMany(),
      prisma.playbook.deleteMany(),
      prisma.evidence.deleteMany(),
      prisma.incidentAlert.deleteMany(),
      prisma.incidentTimelineEvent.deleteMany(),
      prisma.incident.deleteMany(),
      prisma.integration.deleteMany(),
      prisma.policyVersion.deleteMany(),
      prisma.policy.deleteMany(),
      prisma.session.deleteMany(),
      prisma.orgMember.deleteMany(),
      prisma.user.deleteMany(),
      prisma.organization.deleteMany(),
    ]);
  };

  beforeEach(async () => {
    await resetDb();
  });

  describe('Enforcement outcomes', () => {
    let orgId: string;
    let adminToken: string;
    let analystToken: string;
    let viewerToken: string;
    let incidentId: string;
    let evidenceId: string;
    let playbookId: string;

    beforeEach(async () => {
      const org = await prisma.organization.create({
        data: { name: 'AuthZ Org' },
      });
      orgId = org.id;

      const admin = await prisma.user.create({
        data: {
          email: 'admin@example.com',
          displayName: 'Admin',
          passwordHash,
        },
      });
      await prisma.orgMember.create({
        data: { orgId, userId: admin.id, role: OrgMemberRole.admin },
      });

      await policyService.createPolicyVersion({
        orgId,
        policyName: 'default',
        document: buildDefaultPolicy(),
        createdById: admin.id,
        changeSummary: 'test default policy',
        activate: true,
      });

      adminToken = buildToken(
        admin.id,
        orgId,
        'admin@example.com',
        OrgMemberRole.admin,
      );

      const analyst = await prisma.user.create({
        data: {
          email: 'analyst@example.com',
          displayName: 'Analyst',
          passwordHash,
        },
      });
      await prisma.orgMember.create({
        data: { orgId, userId: analyst.id, role: OrgMemberRole.analyst },
      });
      analystToken = buildToken(
        analyst.id,
        orgId,
        analyst.email,
        OrgMemberRole.analyst,
      );

      const viewer = await prisma.user.create({
        data: {
          email: 'viewer@example.com',
          displayName: 'Viewer',
          passwordHash,
        },
      });
      await prisma.orgMember.create({
        data: { orgId, userId: viewer.id, role: OrgMemberRole.viewer },
      });
      viewerToken = buildToken(
        viewer.id,
        orgId,
        viewer.email,
        OrgMemberRole.viewer,
      );

      const incident = await prisma.incident.create({
        data: {
          orgId,
          title: 'Test Incident',
          severity: 3,
        },
      });
      incidentId = incident.id;

      const evidence = await prisma.evidence.create({
        data: {
          orgId,
          incidentId,
          type: EvidenceType.note,
          contentText: 'note',
        },
      });
      evidenceId = evidence.id;

      const playbook = await prisma.playbook.create({
        data: {
          orgId,
          name: 'Containment',
          description: 'Containment steps',
          definition: {},
        },
      });
      playbookId = playbook.id;
    });

    it('denies viewer evidence.read', async () => {
      const res = await request(server)
        .get(`/evidence/${evidenceId}`)
        .set('Cookie', [`access_token=${viewerToken}`])
        .expect(403);

      expect(res.body.message).toContain('Viewers');
    });

    it('denies analyst policy.manage', async () => {
      await request(server)
        .post('/policies/versions')
        .set('Cookie', [`access_token=${analystToken}`])
        .send({
          policyName: 'draft',
          document: { policy_id: 'draft', version: 1, rules: [] },
        })
        .expect(403);
    });

    it('allows admin playbook.run', async () => {
      const res = await request(server)
        .post(`/playbooks/${playbookId}/run`)
        .set('Cookie', [`access_token=${adminToken}`])
        .send({ incidentId })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('playbookId', playbookId);
    });
  });
});
