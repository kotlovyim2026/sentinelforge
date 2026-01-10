import { Body, Controller, Param, Patch, Post } from '@nestjs/common';
import { IntegrationsService } from './integrations.service';
import {
  CurrentUser,
  type JwtPayload,
} from '../auth/decorators/current-user.decorator';
import { UpdateIntegrationDto } from './dto/update-integration.dto';
import * as decorators from '../auth/decorators';

@Controller()
export class IntegrationsController {
  constructor(private readonly integrationsService: IntegrationsService) {}

  @decorators.Public()
  @Post('webhooks/:provider')
  async handleWebhook(@Param('provider') provider: string, @Body() body: any) {
    return this.integrationsService.handleWebhook(provider, body);
  }

  @Patch('integrations/:id')
  async manageIntegration(
    @Param('id') id: string,
    @Body() dto: UpdateIntegrationDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.integrationsService.manageIntegration(user, id, dto);
  }
}
