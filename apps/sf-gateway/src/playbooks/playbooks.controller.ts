import { Body, Controller, Param, Post } from '@nestjs/common';
import { PlaybooksService } from './playbooks.service';
import {
  CurrentUser,
  type JwtPayload,
} from '../auth/decorators/current-user.decorator';
import { RunPlaybookDto } from './dto/run-playbook.dto';

@Controller('playbooks')
export class PlaybooksController {
  constructor(private readonly playbooksService: PlaybooksService) {}

  @Post(':id/run')
  run(
    @Param('id') id: string,
    @Body() dto: RunPlaybookDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.playbooksService.runPlaybook(user, id, dto);
  }
}
