import { IsString } from 'class-validator';

export class RunPlaybookDto {
  @IsString()
  incidentId: string;
}
