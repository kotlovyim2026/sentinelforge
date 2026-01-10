import {
  Injectable,
  HttpException,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { AuthorizationService } from '../policy/authorization.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '@prisma/client';
import { JwtPayload } from '../auth/decorators/current-user.decorator';
import { UpdateIntegrationDto } from './dto/update-integration.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class IntegrationsService {
  private readonly INTEGRATIONS_URL: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly authorization: AuthorizationService,
    private readonly audit: AuditService,
  ) {
    this.INTEGRATIONS_URL =
      this.configService.get('INTEGRATIONS_URL') || 'http://integrations:3002';
  }

  async handleWebhook(provider: string, body: any) {
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.INTEGRATIONS_URL}/webhooks/${provider}`,
          body,
        ),
      );

      return response.data;
    } catch (error) {
      throw new HttpException(
        error.response?.data?.message || 'Failed to handle webhook',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async manageIntegration(
    user: JwtPayload,
    id: string,
    dto: UpdateIntegrationDto,
  ) {
    const integration = await this.prisma.integration.findUnique({
      where: { id },
    });
    if (!integration) {
      throw new NotFoundException('Integration not found');
    }

    await this.authorization.enforce({
      action: 'integration.manage',
      resourceType: 'integration',
      resourceId: integration.id,
      resource: {
        org_id: integration.orgId,
        provider: integration.provider,
        enabled: integration.enabled,
      },
      user,
    });

    const updated = await this.prisma.integration.update({
      where: { id: integration.id },
      data: {
        name: dto.name ?? integration.name,
        enabled: dto.enabled ?? integration.enabled,
        config:
          (dto.config as Prisma.InputJsonValue | undefined) ??
          (integration.config as
            | Prisma.InputJsonValue
            | Prisma.NullableJsonNullValueInput),
      },
    });

    await this.audit.log({
      orgId: integration.orgId,
      userId: user.sub,
      action: AuditAction.integration_update,
      resourceType: 'integration',
      resourceId: integration.id,
      message: 'Integration updated',
      meta: { ...dto },
    });

    return updated;
  }
}
