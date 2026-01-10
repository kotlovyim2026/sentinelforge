import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { EvidenceService } from './evidence.service';
import {
  CurrentUser,
  type JwtPayload,
} from '../auth/decorators/current-user.decorator';
import { CreateEvidenceDto } from './dto/create-evidence.dto';

@Controller()
export class EvidenceController {
  constructor(private readonly evidenceService: EvidenceService) {}

  @Get('evidence/:id')
  getEvidence(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.evidenceService.getEvidence(user, id);
  }

  @Post('incidents/:incidentId/evidence')
  addEvidence(
    @Param('incidentId') incidentId: string,
    @Body() dto: CreateEvidenceDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.evidenceService.addEvidence(user, incidentId, dto);
  }
}
