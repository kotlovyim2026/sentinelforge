import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { IncidentStatus } from '@prisma/client';

export class UpdateIncidentDto {
  @IsOptional()
  @IsEnum(IncidentStatus)
  status?: IncidentStatus;

  @IsOptional()
  @IsInt()
  @Min(1)
  severity?: number;

  @IsOptional()
  @IsString()
  assigneeId?: string;
}
