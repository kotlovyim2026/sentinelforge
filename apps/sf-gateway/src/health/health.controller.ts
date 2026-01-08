import { Controller, Get } from '@nestjs/common';
import { HealthService } from './health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get('system')
  async getSystemHealth() {
    return this.healthService.getSystemHealth();
  }
}
