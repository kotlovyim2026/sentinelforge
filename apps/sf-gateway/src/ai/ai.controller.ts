import { Controller, Post, Body } from '@nestjs/common';
import { AiService } from './ai.service';

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('explain')
  async explainIncident(@Body() body: any) {
    return this.aiService.explainIncident(body);
  }
}
