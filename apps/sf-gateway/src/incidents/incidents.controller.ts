import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { IncidentsService } from './incidents.service';
import { UpdateIncidentDto } from './dto/update-incident.dto';
import {
  CurrentUser,
  type JwtPayload,
} from '../auth/decorators/current-user.decorator';

@Controller('incidents')
export class IncidentsController {
  constructor(private readonly incidentsService: IncidentsService) {}

  @Get(':id')
  getIncident(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.incidentsService.getIncident(user, id);
  }

  @Patch(':id')
  updateIncident(
    @Param('id') id: string,
    @Body() dto: UpdateIncidentDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.incidentsService.updateIncident(user, id, dto);
  }

  @Post(':id/export')
  exportIncident(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.incidentsService.exportIncident(user, id);
  }
}
