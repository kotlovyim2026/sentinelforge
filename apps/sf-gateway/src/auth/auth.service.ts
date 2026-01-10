import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  InternalServerErrorException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { randomBytes, createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto, LoginDto } from './dto';
import { JwtPayload } from './decorators/current-user.decorator';
import { OrgMemberRole, SessionStatus, AuditAction } from '@prisma/client';
import { PolicyService } from '../policy/policy.service';
import { buildDefaultPolicy } from '../policy/default-policy';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly accessTokenExpiry = '15m';
  private readonly refreshTokenExpiry = 7 * 24 * 60 * 60 * 1000;

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private readonly policyService: PolicyService,
  ) {}

  async register(dto: RegisterDto, ip?: string, userAgent?: string) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const org = await tx.organization.create({
          data: {
            name: dto.organizationName,
          },
        });

        const user = await tx.user.create({
          data: {
            email: dto.email,
            displayName: dto.displayName,
            passwordHash,
          },
        });

        await tx.orgMember.create({
          data: {
            orgId: org.id,
            userId: user.id,
            role: OrgMemberRole.admin,
          },
        });

        await tx.auditLog.create({
          data: {
            orgId: org.id,
            userId: user.id,
            action: AuditAction.auth_register,
            message: 'User registered',
            ip,
            userAgent,
          },
        });

        return { user, org };
      });

      const { accessToken, refreshToken, sessionId } =
        await this.generateTokens(
          result.user.id,
          result.org.id,
          result.user.email,
          OrgMemberRole.admin,
          ip,
          userAgent,
        );

      await this.policyService.createPolicyVersion({
        orgId: result.org.id,
        policyName: 'default',
        document: buildDefaultPolicy(),
        createdById: result.user.id,
        changeSummary: 'Initial default policy',
        activate: true,
      });

      return {
        user: {
          id: result.user.id,
          email: result.user.email,
          displayName: result.user.displayName,
        },
        org: {
          id: result.org.id,
          name: result.org.name,
        },
        accessToken,
        refreshToken,
      };
    } catch (error) {
      this.logger.error(`Registration failed: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Registration failed');
    }
  }

  async login(dto: LoginDto, ip?: string, userAgent?: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: {
        memberships: {
          include: {
            org: true,
          },
        },
      },
    });

    if (!user) {
      this.logger.warn(`Login attempt for non-existent user: ${dto.email}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      const orgId = user.memberships[0]?.orgId;
      if (orgId) {
        await this.prisma.auditLog.create({
          data: {
            orgId,
            userId: user.id,
            action: AuditAction.auth_login_failed,
            message: 'Invalid password',
            ip,
            userAgent,
          },
        });
      }
      throw new UnauthorizedException('Invalid credentials');
    }

    const membership = user.memberships[0];
    if (!membership) {
      throw new UnauthorizedException(
        'User is not a member of any organization',
      );
    }

    const { accessToken, refreshToken, sessionId } = await this.generateTokens(
      user.id,
      membership.orgId,
      user.email,
      membership.role,
      ip,
      userAgent,
    );

    await this.prisma.auditLog.create({
      data: {
        orgId: membership.orgId,
        userId: user.id,
        action: AuditAction.auth_login_success,
        message: 'User logged in',
        ip,
        userAgent,
        meta: { sessionId },
      },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
      },
      org: {
        id: membership.org.id,
        name: membership.org.name,
      },
      role: membership.role,
      accessToken,
      refreshToken,
    };
  }

  async refresh(refreshToken: string, ip?: string, userAgent?: string) {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token required');
    }

    const tokenHash = this.hashToken(refreshToken);

    const session = await this.prisma.session.findFirst({
      where: {
        refreshTokenHash: tokenHash,
        status: SessionStatus.active,
      },
      include: {
        user: {
          include: {
            memberships: {
              where: { orgId: { equals: undefined } },
            },
          },
        },
        org: true,
      },
    });

    if (!session) {
      this.logger.warn(`Attempt to use invalid/revoked refresh token`);

      const oldSession = await this.prisma.session.findFirst({
        where: {
          refreshTokenHash: tokenHash,
          status: { in: [SessionStatus.rotated, SessionStatus.revoked] },
        },
      });

      if (oldSession) {
        await this.revokeAllUserSessions(oldSession.userId, oldSession.orgId);
        this.logger.error(
          `Refresh token reuse detected for user ${oldSession.userId}. All sessions revoked.`,
        );

        await this.prisma.auditLog.create({
          data: {
            orgId: oldSession.orgId,
            userId: oldSession.userId,
            action: AuditAction.auth_refresh,
            message: 'Refresh token reuse detected - all sessions revoked',
            ip,
            userAgent,
          },
        });
      }

      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (session.expiresAt < new Date()) {
      await this.revokeSession(session.id);
      throw new UnauthorizedException('Refresh token expired');
    }

    const membership = await this.prisma.orgMember.findUnique({
      where: {
        orgId_userId: {
          orgId: session.orgId,
          userId: session.userId,
        },
      },
    });

    if (!membership) {
      throw new UnauthorizedException(
        'User is no longer a member of this organization',
      );
    }

    const newRefreshToken = this.generateRefreshToken();
    const newTokenHash = this.hashToken(newRefreshToken);
    const newExpiresAt = new Date(Date.now() + this.refreshTokenExpiry);

    const newSession = await this.prisma.$transaction(async (tx) => {
      await tx.session.update({
        where: { id: session.id },
        data: {
          status: SessionStatus.rotated,
          lastUsedAt: new Date(),
        },
      });

      const created = await tx.session.create({
        data: {
          orgId: session.orgId,
          userId: session.userId,
          refreshTokenHash: newTokenHash,
          status: SessionStatus.active,
          expiresAt: newExpiresAt,
          ip,
          userAgent,
          rotatedFromId: session.id,
        },
      });

      await tx.session.update({
        where: { id: session.id },
        data: { rotatedToId: created.id },
      });

      await tx.auditLog.create({
        data: {
          orgId: session.orgId,
          userId: session.userId,
          action: AuditAction.auth_refresh,
          message: 'Refresh token rotated',
          ip,
          userAgent,
          meta: { oldSessionId: session.id, newSessionId: created.id },
        },
      });

      return created;
    });

    const accessToken = this.generateAccessToken(
      session.user.id,
      session.orgId,
      session.user.email,
      membership.role,
      newSession.id,
    );

    return {
      accessToken,
      refreshToken: newRefreshToken,
    };
  }

  async logout(
    sessionId: string,
    userId: string,
    orgId: string,
    ip?: string,
    userAgent?: string,
  ) {
    await this.revokeSession(sessionId);

    await this.prisma.auditLog.create({
      data: {
        orgId,
        userId,
        action: AuditAction.auth_logout,
        message: 'User logged out',
        ip,
        userAgent,
        meta: { sessionId },
      },
    });
  }

  async getMe(userId: string, orgId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        memberships: {
          where: { orgId },
          include: {
            org: true,
          },
        },
      },
    });

    if (!user || user.memberships.length === 0) {
      throw new UnauthorizedException('User not found');
    }

    const membership = user.memberships[0];

    return {
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
      },
      org: {
        id: membership.org.id,
        name: membership.org.name,
      },
      role: membership.role,
    };
  }

  private async generateTokens(
    userId: string,
    orgId: string,
    email: string,
    role: OrgMemberRole,
    ip?: string,
    userAgent?: string,
  ) {
    const refreshToken = this.generateRefreshToken();
    const refreshTokenHash = this.hashToken(refreshToken);
    const expiresAt = new Date(Date.now() + this.refreshTokenExpiry);

    const session = await this.prisma.session.create({
      data: {
        orgId,
        userId,
        refreshTokenHash,
        expiresAt,
        ip,
        userAgent,
      },
    });

    const accessToken = this.generateAccessToken(
      userId,
      orgId,
      email,
      role,
      session.id,
    );

    return {
      accessToken,
      refreshToken,
      sessionId: session.id,
    };
  }

  private generateAccessToken(
    userId: string,
    orgId: string,
    email: string,
    role: string,
    sessionId: string,
  ): string {
    const payload: JwtPayload = {
      sub: userId,
      orgId,
      email,
      role,
      sessionId,
    };

    return this.jwtService.sign(payload, {
      expiresIn: this.accessTokenExpiry,
    });
  }

  private generateRefreshToken(): string {
    return randomBytes(64).toString('hex');
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private async revokeSession(sessionId: string) {
    await this.prisma.session.update({
      where: { id: sessionId },
      data: {
        status: SessionStatus.revoked,
        revokedAt: new Date(),
      },
    });
  }

  private async revokeAllUserSessions(userId: string, orgId: string) {
    await this.prisma.session.updateMany({
      where: {
        userId,
        orgId,
        status: SessionStatus.active,
      },
      data: {
        status: SessionStatus.compromised,
        revokedAt: new Date(),
      },
    });
  }
}
