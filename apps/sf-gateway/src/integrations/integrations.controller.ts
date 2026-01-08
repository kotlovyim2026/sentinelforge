import { Controller, Post, Param, Body } from '@nestjs/common';
import { IntegrationsService } from './integrations.service';

@Controller('webhooks')
export class IntegrationsController {
  constructor(private readonly integrationsService: IntegrationsService) {}

  @Post(':provider')
  async handleWebhook(@Param('provider') provider: string, @Body() body: any) {
    return this.integrationsService.handleWebhook(provider, body);
  }
}
